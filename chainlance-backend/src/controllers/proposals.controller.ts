import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { AuthRequest } from '../middleware/auth.middleware';

export class ProposalsController {

    /**
     * POST /jobs/:jobId/proposals
     * Submit a proposal
     */
    static async createProposal(req: AuthRequest, res: Response) {
        try {
            const jobId = req.params.jobId as string;
            const { coverLetter, proposedAmount, estimatedDuration } = req.body;
            const userId = req.user?.userId;

            if (!userId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }

            // Check if user is freelancer (or both)
            // Actually role check is handled by middleware or app logic, for now allow anyone with account

            // Check if already submitted
            const existing = await prisma.proposal.findUnique({
                where: {
                    jobId_freelancerId: {
                        jobId,
                        freelancerId: userId,
                    },
                },
            });

            if (existing) {
                res.status(409).json({ error: 'You have already submitted a proposal for this job' });
                return;
            }

            const proposal = await prisma.proposal.create({
                data: {
                    jobId,
                    freelancerId: userId,
                    coverLetter,
                    proposedAmount: parseFloat(proposedAmount),
                    estimatedDuration: estimatedDuration ? parseInt(estimatedDuration) : null,
                    status: 'pending',
                },
            });

            res.status(201).json(proposal);
        } catch (error) {
            console.error('Error creating proposal:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    /**
     * GET /jobs/:jobId/proposals
     * List proposals for a job (Job Owner Only)
     */
    static async getJobProposals(req: AuthRequest, res: Response) {
        try {
            const jobId = req.params.jobId as string;
            const userId = req.user?.userId;

            const job = await prisma.job.findUnique({ where: { id: jobId } });

            if (!job) {
                res.status(404).json({ error: 'Job not found' });
                return;
            }

            if (job.clientId !== userId) {
                res.status(403).json({ error: 'Unauthorized. Only job owner can view proposals.' });
                return;
            }

            const proposals = await prisma.proposal.findMany({
                where: { jobId },
                include: {
                    freelancer: {
                        select: {
                            id: true,
                            displayName: true,
                            walletAddress: true,
                            skills: true,
                            bio: true,
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
            });

            res.json({ data: proposals });
        } catch (error) {
            console.error('Error fetching proposals:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    /**
     * GET /proposals/my-proposals
     * Get current user's proposals
     */
    static async getMyProposals(req: AuthRequest, res: Response) {
        try {
            const userId = req.user?.userId;

            const proposals = await prisma.proposal.findMany({
                where: { freelancerId: userId },
                include: {
                    job: {
                        select: {
                            id: true,
                            title: true,
                            budget: true,
                            status: true,
                            deadline: true,
                            client: {
                                select: { displayName: true },
                            },
                        },
                    },
                },
                orderBy: { createdAt: 'desc' },
            });

            res.json({ data: proposals });
        } catch (error: any) {
            console.error('Error fetching my proposals:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    /**
     * PATCH /proposals/:id/accept
     * Accept proposal (creates project)
     */
    static async acceptProposal(req: AuthRequest, res: Response) {
        try {
            const id = req.params.id as string;
            const userId = req.user?.userId;

            // Start transaction to ensure atomicity
            const result = await prisma.$transaction(async (tx: any) => {
                const proposal = await tx.proposal.findUnique({
                    where: { id },
                    include: { job: true },
                });

                if (!proposal) throw new Error('Proposal not found');

                if (proposal.job.clientId !== userId) {
                    throw new Error('Unauthorized');
                }

                if (proposal.job.status !== 'open') {
                    throw new Error('Job is not open');
                }

                // 1. Update proposal status
                const updatedProposal = await tx.proposal.update({
                    where: { id },
                    data: { status: 'accepted' },
                });

                // 2. Update job status
                await tx.job.update({
                    where: { id: proposal.jobId },
                    data: { status: 'in_progress' },
                });

                // 3. Reject other proposals (Optional but good practice)
                await tx.proposal.updateMany({
                    where: {
                        jobId: proposal.jobId,
                        id: { not: id },
                        status: 'pending'
                    },
                    data: { status: 'rejected' }
                });

                // 4. Create Project
                const project = await tx.project.create({
                    data: {
                        jobId: proposal.jobId,
                        proposalId: id,
                        clientId: proposal.job.clientId,
                        freelancerId: proposal.freelancerId,
                        totalAmount: proposal.proposedAmount,
                        status: 'active',
                    },
                });

                return { proposal: updatedProposal, project };
            });

            res.json(result);
        } catch (error: any) {
            console.error('Error accepting proposal:', error);
            if (error.message === 'Unauthorized') {
                res.status(403).json({ error: error.message });
            } else if (error.message === 'Proposal not found') {
                res.status(404).json({ error: error.message });
            } else {
                res.status(400).json({ error: error.message || 'Error processing request' });
            }
        }
    }

    /**
     * PATCH /proposals/:id/reject
     * Reject proposal
     */
    static async rejectProposal(req: AuthRequest, res: Response) {
        try {
            const id = req.params.id as string;
            const userId = req.user?.userId;

            const proposal = await prisma.proposal.findUnique({
                where: { id },
                include: { job: true },
            });

            if (!proposal) {
                res.status(404).json({ error: 'Proposal not found' });
                return;
            }

            if (proposal.job.clientId !== userId) {
                res.status(403).json({ error: 'Unauthorized' });
                return;
            }

            const updated = await prisma.proposal.update({
                where: { id },
                data: { status: 'rejected' },
            });

            res.json(updated);
        } catch (error) {
            console.error('Error rejecting proposal:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    /**
     * PATCH /proposals/:id/withdraw
     * Withdraw proposal (Freelancer)
     */
    static async withdrawProposal(req: AuthRequest, res: Response) {
        try {
            const id = req.params.id as string;
            const userId = req.user?.userId;

            const proposal = await prisma.proposal.findUnique({ where: { id } });

            if (!proposal) {
                res.status(404).json({ error: 'Proposal not found' });
                return;
            }

            if (proposal.freelancerId !== userId) {
                res.status(403).json({ error: 'Unauthorized' });
                return;
            }

            if (proposal.status === 'accepted') {
                res.status(400).json({ error: 'Cannot withdraw accepted proposal' });
                return;
            }

            const updated = await prisma.proposal.update({
                where: { id },
                data: { status: 'withdrawn' },
            });

            res.json(updated);
        } catch (error) {
            console.error('Error withdrawing proposal:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}

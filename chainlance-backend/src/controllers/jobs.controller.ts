import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { AuthRequest } from '../middleware/auth.middleware';

export class JobsController {

    /**
     * POST /jobs
     * Create a new job
     */
    static async createJob(req: AuthRequest, res: Response) {
        try {
            const { title, description, budget, requiredSkills, deadline } = req.body;
            const userId = req.user?.userId;

            if (!userId) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }

            // Basic validation (ideally use Zod)
            if (!title || !description || !budget) {
                res.status(400).json({ error: 'Missing required fields' });
                return;
            }

            const job = await prisma.job.create({
                data: {
                    clientId: userId,
                    title,
                    description,
                    budget: parseFloat(budget),
                    requiredSkills: Array.isArray(requiredSkills) ? JSON.stringify(requiredSkills) : (requiredSkills || '[]'),
                    deadline: deadline ? new Date(deadline as string) : null,
                    status: 'open',
                },
            });

            res.status(201).json(job);
        } catch (error) {
            console.error('Error creating job:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    /**
     * GET /jobs
     * List all jobs with filters
     */
    static async getJobs(req: Request, res: Response) {
        try {
            const status = req.query.status as string;
            const clientId = req.query.clientId as string;
            const minBudget = req.query.minBudget as string;
            const maxBudget = req.query.maxBudget as string;
            const page = req.query.page || 1;
            const limit = req.query.limit || 20;

            const skip = (Number(page) - 1) * Number(limit);
            const take = Number(limit);

            const where: any = {};

            if (status) where.status = status;
            if (clientId) where.clientId = String(clientId);

            // Filter by Budget
            if (minBudget || maxBudget) {
                where.budget = {};
                if (minBudget) where.budget.gte = parseFloat(String(minBudget));
                if (maxBudget) where.budget.lte = parseFloat(String(maxBudget));
            }

            const [jobs, total] = await Promise.all([
                prisma.job.findMany({
                    where,
                    include: {
                        client: {
                            select: {
                                id: true,
                                displayName: true,
                                walletAddress: true,
                            },
                        },
                        _count: {
                            select: { proposals: true },
                        },
                    },
                    orderBy: { createdAt: 'desc' },
                    skip,
                    take,
                }),
                prisma.job.count({ where }),
            ]);

            res.json({
                data: jobs,
                pagination: {
                    page: Number(page),
                    limit: take,
                    total,
                    totalPages: Math.ceil(total / take),
                },
            });
        } catch (error) {
            console.error('Error fetching jobs:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    /**
     * GET /jobs/:id
     * Get job details
     */
    static async getJobById(req: Request, res: Response) {
        try {
            const id = req.params.id as string;

            const job = await prisma.job.findUnique({
                where: { id },
                include: {
                    client: {
                        select: {
                            id: true,
                            displayName: true,
                            walletAddress: true,
                            bio: true,
                        },
                    },
                    _count: {
                        select: { proposals: true },
                    },
                },
            });

            if (!job) {
                res.status(404).json({ error: 'Job not found' });
                return;
            }

            res.json(job);
        } catch (error) {
            console.error('Error fetching job:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    /**
     * PATCH /jobs/:id
     * Update job
     */
    static async updateJob(req: AuthRequest, res: Response) {
        try {
            const id = req.params.id as string;
            const { title, description, budget, deadline } = req.body;
            const userId = req.user?.userId;

            const job = await prisma.job.findUnique({
                where: { id },
                include: { _count: { select: { proposals: { where: { status: 'accepted' } } } } }
            });

            if (!job) {
                res.status(404).json({ error: 'Job not found' });
                return;
            }

            if (job.clientId !== userId) {
                res.status(403).json({ error: 'Unauthorized' });
                return;
            }

            // Cannot update if proposals already accepted (project created essentially)
            // Actually safe to update if status is open, but logic says if proposals accepted, it's weird 
            // The schema says Project is created when proposal accepted.
            // Let's use proposal count check from include above
            // @ts-ignore
            const acceptedProposals = job._count.proposals; // Wait, I filtered in include above? No syntax is tricky

            const acceptedCount = await prisma.proposal.count({
                where: { jobId: id, status: 'accepted' }
            });

            if (acceptedCount > 0) {
                res.status(409).json({ error: 'Cannot update job with accepted proposals' });
                return;
            }

            const updatedJob = await prisma.job.update({
                where: { id },
                data: {
                    title,
                    description,
                    budget: budget ? parseFloat(budget) : undefined,
                    deadline: deadline ? new Date(deadline) : undefined,
                },
            });

            res.json(updatedJob);
        } catch (error) {
            console.error('Error updating job:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    /**
     * DELETE /jobs/:id
     * Cancel job
     */
    static async cancelJob(req: AuthRequest, res: Response) {
        try {
            const id = req.params.id as string;
            const userId = req.user?.userId;

            const job = await prisma.job.findUnique({ where: { id } });

            if (!job) {
                res.status(404).json({ error: 'Job not found' });
                return;
            }

            if (job.clientId !== userId) {
                res.status(403).json({ error: 'Unauthorized' });
                return;
            }

            if (job.status !== 'open') {
                res.status(400).json({ error: 'Can only cancel open jobs' });
                return;
            }

            await prisma.job.update({
                where: { id },
                data: { status: 'cancelled' },
            });

            res.json({ message: 'Job cancelled successfully' });
        } catch (error) {
            console.error('Error cancelling job:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}

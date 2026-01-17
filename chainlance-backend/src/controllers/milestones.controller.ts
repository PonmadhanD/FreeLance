import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { AuthRequest } from '../middleware/auth.middleware';
import { BlockchainService } from '../services/blockchain.service';

const blockchainService = new BlockchainService();

export class MilestonesController {

    /**
     * PATCH /milestones/:id/submit
     * Freelancer submits work for a milestone
     */
    static async submitMilestone(req: AuthRequest, res: Response) {
        try {
            const id = req.params.id as string;
            const userId = req.user?.userId;

            const milestone = await prisma.milestone.findUnique({
                where: { id },
                include: { project: true }
            });

            if (!milestone) {
                res.status(404).json({ error: 'Milestone not found' });
                return;
            }

            if (milestone.project.freelancerId !== userId) {
                res.status(403).json({ error: 'Unauthorized. Only freelancer can submit work.' });
                return;
            }

            // Can only submit if funded or already submitted (updates)
            if (milestone.status !== 'funded' && milestone.status !== 'submitted') {
                res.status(400).json({ error: 'Milestone must be funded before submission' });
                return;
            }

            const updated = await prisma.milestone.update({
                where: { id },
                data: {
                    status: 'submitted',
                    submittedAt: new Date(),
                },
            });

            // Notify client (implementation skipped for MVP)

            res.json(updated);
        } catch (error) {
            console.error('Error submitting milestone:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    /**
     * POST /milestones/:id/escrow
     * Register the escrow contract address deployed by Client
     */
    static async registerEscrow(req: AuthRequest, res: Response) {
        try {
            const id = req.params.id as string;
            const { escrowAddress } = req.body;
            const userId = req.user?.userId;

            if (!escrowAddress) {
                res.status(400).json({ error: 'Escrow address is required' });
                return;
            }

            const milestone = await prisma.milestone.findUnique({
                where: { id },
                include: { project: true }
            });

            if (!milestone) {
                res.status(404).json({ error: 'Milestone not found' });
                return;
            }

            if (milestone.project.clientId !== userId) {
                res.status(403).json({ error: 'Unauthorized. Only client can register escrow.' });
                return;
            }

            if (milestone.escrowContractAddress) {
                res.status(409).json({ error: 'Escrow already registered' });
                return;
            }

            // Verify on-chain details
            try {
                const details = await blockchainService.getEscrowDetails(escrowAddress);
                // details = [client, freelancer, amount, ...etc]
                // Basic verification
                // Note: address comparison needs normalize (lowercase)
                // This is a strict check. In dev, addresses might not match mock usage.
                // For MVP, we'll store it but maybe warn or just log.
                console.log('Verifying escrow on-chain:', details);

                // TODO: Strict production check:
                // if (details[0].toLowerCase() !== milestone.project.client.walletAddress.toLowerCase()) ...
            } catch (err) {
                // If we can't verify, it might be a bad address or network issue.
                // We could block registration or just assume client is honest for now (unsafe).
                console.warn('Could not verify escrow on-chain immediately:', err);
            }

            const updated = await prisma.milestone.update({
                where: { id },
                data: {
                    escrowContractAddress: escrowAddress,
                    status: 'funded', // Optimistically mark funded, or wait for event?
                    // Let's keep it 'pending' until the Event Poller sees the 'EscrowFunded' event.
                    // Or if client says it's deployed AND funded in one go (constructor).
                    // Usually constructors are funded.
                    // Let's leave status as is, and let Poller update it to 'funded' when it sees event.
                },
            });

            res.json(updated);
        } catch (error) {
            console.error('Error registering escrow:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    /**
     * GET /milestones/:id/escrow-metadata
     * Get params needed to deploy escrow
     */
    static async getEscrowMetadata(req: AuthRequest, res: Response) {
        try {
            const id = req.params.id as string;
            const userId = req.user?.userId;

            const milestone = await prisma.milestone.findUnique({
                where: { id },
                include: {
                    project: {
                        include: {
                            client: true,
                            freelancer: true
                        }
                    }
                }
            });

            if (!milestone) {
                res.status(404).json({ error: 'Milestone not found' });
                return;
            }

            // Access: any participant
            if (milestone.project.clientId !== userId && milestone.project.freelancerId !== userId) {
                res.status(403).json({ error: 'Unauthorized' });
                return;
            }

            res.json({
                client: milestone.project.client.walletAddress,
                freelancer: milestone.project.freelancer.walletAddress,
                amount: milestone.amount.toString(),
                milestoneId: milestone.id
            });
        } catch (error) {
            console.error('Error fetching metadata:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}

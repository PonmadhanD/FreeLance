import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { AuthRequest } from '../middleware/auth.middleware';

const prisma = new PrismaClient();

export class AdminController {
    /**
     * GET /api/v1/admin/disputes
     * Returns a list of all milestones currently in dispute
     */
    static async getDisputes(req: AuthRequest, res: Response) {
        try {
            // In a real app, check if user is admin
            // const user = await prisma.user.findUnique({ where: { id: req.user?.userId } });
            // if (user?.role !== 'admin') return res.status(403).json({ error: 'Unauthorized' });

            const disputedMilestones = await prisma.milestone.findMany({
                where: {
                    status: 'disputed'
                },
                include: {
                    project: {
                        include: {
                            client: true,
                            freelancer: true
                        }
                    },
                    disputes: {
                        where: {
                            status: 'open'
                        }
                    }
                }
            });

            res.json(disputedMilestones);
        } catch (error) {
            console.error('Error fetching disputes:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    /**
     * GET /api/v1/admin/stats
     * Returns platform statistics
     */
    static async getStats(req: AuthRequest, res: Response) {
        try {
            const userCount = await prisma.user.count();
            const jobCount = await prisma.job.count();
            const projectCount = await prisma.project.count();
            const totalEscrow = await prisma.milestone.aggregate({
                where: { status: 'funded' },
                _sum: { amount: true }
            });

            res.json({
                users: userCount,
                jobs: jobCount,
                projects: projectCount,
                escrowedVolume: totalEscrow._sum.amount || 0
            });
        } catch (error) {
            console.error('Error fetching stats:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}

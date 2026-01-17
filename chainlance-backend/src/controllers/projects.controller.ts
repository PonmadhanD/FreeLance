import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { AuthRequest } from '../middleware/auth.middleware';

export class ProjectsController {

    /**
     * GET /projects
     * List my projects (as client or freelancer)
     */
    static async getMyProjects(req: AuthRequest, res: Response) {
        try {
            const userId = req.user?.userId;

            const projects = await prisma.project.findMany({
                where: {
                    OR: [
                        { clientId: userId },
                        { freelancerId: userId },
                    ],
                },
                include: {
                    job: { select: { title: true } },
                    client: { select: { displayName: true, walletAddress: true } },
                    freelancer: { select: { displayName: true, walletAddress: true } },
                    milestones: true,
                },
                orderBy: { startedAt: 'desc' },
            });

            res.json({ data: projects });
        } catch (error) {
            console.error('Error fetching projects:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    /**
     * GET /projects/:id
     * Get project details
     */
    static async getProjectById(req: AuthRequest, res: Response) {
        try {
            const id = req.params.id as string;
            const userId = req.user?.userId;

            const project = await prisma.project.findUnique({
                where: { id },
                include: {
                    job: true,
                    client: { select: { displayName: true, walletAddress: true } },
                    freelancer: { select: { displayName: true, walletAddress: true } },
                    milestones: { orderBy: { createdAt: 'asc' } },
                },
            });

            if (!project) {
                res.status(404).json({ error: 'Project not found' });
                return;
            }

            // Access control
            if (project.clientId !== userId && project.freelancerId !== userId) {
                res.status(403).json({ error: 'Unauthorized' });
                return;
            }

            res.json(project);
        } catch (error) {
            console.error('Error fetching project:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    /**
     * POST /projects/:id/milestones
     * Add a milestone (Client only)
     */
    static async addMilestone(req: AuthRequest, res: Response) {
        try {
            const id = req.params.id as string;
            const { title, description, amount, dueDate } = req.body;
            const userId = req.user?.userId;

            const project = await prisma.project.findUnique({ where: { id } });

            if (!project) {
                res.status(404).json({ error: 'Project not found' });
                return;
            }

            if (project.clientId !== userId) {
                res.status(403).json({ error: 'Unauthorized. Only client can add milestones.' });
                return;
            }

            if (project.status === 'completed') {
                res.status(400).json({ error: 'Cannot add milestones to completed project' });
                return;
            }

            const milestone = await prisma.milestone.create({
                data: {
                    projectId: id,
                    title,
                    description,
                    amount: parseFloat(amount),
                    dueDate: dueDate ? new Date(dueDate) : null,
                    status: 'pending',
                },
            });

            res.status(201).json(milestone);
        } catch (error) {
            console.error('Error adding milestone:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    /**
     * PATCH /projects/:id/complete
     * Mark project as completed (Client only)
     */
    static async completeProject(req: AuthRequest, res: Response) {
        try {
            const id = req.params.id as string;
            const userId = req.user?.userId;

            const project = await prisma.project.findUnique({ where: { id } });

            if (!project) {
                res.status(404).json({ error: 'Project not found' });
                return;
            }

            if (project.clientId !== userId) {
                res.status(403).json({ error: 'Unauthorized' });
                return;
            }

            // Check if all milestones are paid
            const unfinishedMilestones = await prisma.milestone.count({
                where: {
                    projectId: id,
                    status: { not: 'paid' },
                },
            });

            if (unfinishedMilestones > 0) {
                res.status(400).json({ error: 'Cannot complete project with unfinished milestones' });
                return;
            }

            const updated = await prisma.project.update({
                where: { id },
                data: {
                    status: 'completed',
                    completedAt: new Date(),
                },
            });

            // Update job status too
            await prisma.job.update({
                where: { id: project.jobId },
                data: { status: 'completed' },
            });

            res.json(updated);
        } catch (error) {
            console.error('Error completing project:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}

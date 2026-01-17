import { Request, Response } from 'express';
import { prisma } from '../config/database';
import { AuthRequest } from '../middleware/auth.middleware';

export class MessagesController {

    /**
     * POST /projects/:projectId/messages
     * Send a message
     */
    static async sendMessage(req: AuthRequest, res: Response) {
        try {
            const projectId = req.params.projectId as string;
            const { content } = req.body;
            const userId = req.user?.userId;

            if (!content) {
                res.status(400).json({ error: 'Message content is required' });
                return;
            }

            const project = await prisma.project.findUnique({ where: { id: projectId } });

            if (!project) {
                res.status(404).json({ error: 'Project not found' });
                return;
            }

            if (project.clientId !== userId && project.freelancerId !== userId) {
                res.status(403).json({ error: 'Unauthorized' });
                return;
            }

            const message = await prisma.message.create({
                data: {
                    projectId,
                    senderId: userId!,
                    content,
                },
            });

            res.status(201).json(message);
        } catch (error) {
            console.error('Error sending message:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    /**
     * GET /projects/:projectId/messages
     * Get messages for a project
     */
    static async getProjectMessages(req: AuthRequest, res: Response) {
        try {
            const projectId = req.params.projectId as string;
            const userId = req.user?.userId;

            const project = await prisma.project.findUnique({ where: { id: projectId } });

            if (!project) {
                res.status(404).json({ error: 'Project not found' });
                return;
            }

            if (project.clientId !== userId && project.freelancerId !== userId) {
                res.status(403).json({ error: 'Unauthorized' });
                return;
            }

            const messages = await prisma.message.findMany({
                where: { projectId },
                include: {
                    sender: {
                        select: {
                            id: true,
                            displayName: true,
                            walletAddress: true,
                        },
                    },
                },
                orderBy: { createdAt: 'asc' },
            });

            res.json({ data: messages });
        } catch (error) {
            console.error('Error fetching messages:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}

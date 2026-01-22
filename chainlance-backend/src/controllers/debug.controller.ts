import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { exec } from 'child_process';
import path from 'path';

const prisma = new PrismaClient();

export class DebugController {
    /**
     * POST /api/v1/debug/seed
     * Triggers the prisma seed script
     */
    static async triggerSeed(req: Request, res: Response) {
        try {
            console.log('触发启动 Seed...');

            // Run the seed script as a child process to avoid prisma instance conflicts
            // or just import and run it if possible.
            // Simplified for demo: Just run the npm command
            exec('npm run prisma:seed', { cwd: path.join(__dirname, '../../') }, (error, stdout, stderr) => {
                if (error) {
                    console.error(`Seed error: ${error}`);
                    return res.status(500).json({ error: 'Seed failed', details: stderr });
                }
                console.log(`Seed stdout: ${stdout}`);
                res.json({ message: 'Seed triggered successfully', output: stdout });
            });

        } catch (error) {
            console.error('Error in debug seed:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}

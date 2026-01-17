import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export const validate = (schema: ZodSchema) => (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const { body, query, params } = req;

        schema.parse({
            body,
            query,
            params,
        });

        next();
    } catch (error) {
        if (error instanceof ZodError) {
            res.status(400).json({
                error: 'Validation Error',
                details: error.issues.map((e: any) => ({
                    path: e.path.join('.'),
                    message: e.message,
                })),
            });
        } else {
            res.status(500).json({ error: 'Internal validation error' });
        }
    }
};

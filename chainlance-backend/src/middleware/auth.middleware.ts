import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Extend Express Request interface
export interface AuthRequest extends Request {
    user?: {
        userId: string;
        walletAddress: string;
        role: string;
    };
}

export const authenticateJWT = (
    req: AuthRequest,
    res: Response,
    next: NextFunction
): void => { // Explicitly typed return void (or use : any if Typescript complains about express types)
    const authHeader = req.headers.authorization;

    if (authHeader) {
        const token = authHeader.split(' ')[1];

        jwt.verify(token, process.env.JWT_SECRET!, (err: any, decoded: any) => {
            if (err) {
                // 403 Forbidden if token is invalid
                res.status(403).json({ error: 'Invalid or expired token' });
                return;
            }

            req.user = decoded as { userId: string; walletAddress: string; role: string };
            next();
        });
    } else {
        // 401 Unauthorized if no token
        res.status(401).json({ error: 'Unauthorized' });
    }
};

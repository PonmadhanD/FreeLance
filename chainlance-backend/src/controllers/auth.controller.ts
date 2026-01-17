import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';

const authService = new AuthService();

export class AuthController {

    /**
     * POST /auth/nonce
     * Get signature nonce for wallet address
     */
    static async getNonce(req: Request, res: Response) {
        try {
            const { walletAddress } = req.body;

            if (!walletAddress) {
                res.status(400).json({ error: 'Wallet address is required' });
                return;
            }

            const nonce = authService.generateNonce(walletAddress);
            res.json({ nonce });
        } catch (error: any) {
            console.error('Error generating nonce:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    /**
     * POST /auth/verify
     * Verify signature and return JWT
     */
    static async verifySignature(req: Request, res: Response) {
        try {
            const { walletAddress, signature } = req.body;

            if (!walletAddress || !signature) {
                res.status(400).json({ error: 'Wallet address and signature are required' });
                return;
            }

            const result = await authService.verifySignature(walletAddress, signature);
            res.json(result);
        } catch (error: any) {
            console.error('Error verifying signature:', error);
            res.status(401).json({ error: error.message || 'Authentication failed' });
        }
    }
}

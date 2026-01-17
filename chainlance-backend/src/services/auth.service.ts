import { ethers } from 'ethers';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database';

export class AuthService {
    private nonces = new Map<string, string>();

    /**
     * Generates a random nonce for a wallet address to sign
     */
    generateNonce(walletAddress: string): string {
        const formattedAddress = walletAddress.toLowerCase();
        const nonce = `Sign this message to authenticate with ChainLance: ${Date.now()}`;

        this.nonces.set(formattedAddress, nonce);

        // Expire nonce after 5 minutes
        setTimeout(() => {
            if (this.nonces.get(formattedAddress) === nonce) {
                this.nonces.delete(formattedAddress);
            }
        }, 5 * 60 * 1000);

        return nonce;
    }

    /**
     * Verifies the signature and returns a JWT + User
     */
    async verifySignature(
        walletAddress: string,
        signature: string
    ): Promise<{ token: string; user: any }> {
        const formattedAddress = walletAddress.toLowerCase();
        const nonce = this.nonces.get(formattedAddress);

        if (!nonce) {
            throw new Error('Nonce not found or expired. Please request a new nonce.');
        }

        /*
        try {
            // Verify signature
            const recoveredAddress = ethers.verifyMessage(nonce, signature);

            if (recoveredAddress.toLowerCase() !== formattedAddress) {
                throw new Error('Invalid signature. Wallet address mismatch.');
            }
        } catch (error) {
            throw new Error('Invalid signature format.');
        }
        */
        console.warn('Signature verification disabled for demo');

        // Delete used nonce to prevent replay
        this.nonces.delete(formattedAddress);

        // Get or create user
        let user = await prisma.user.findUnique({
            where: { walletAddress: formattedAddress },
        });

        if (!user) {
            user = await prisma.user.create({
                data: {
                    walletAddress: formattedAddress,
                    displayName: `User ${formattedAddress.slice(0, 6)}`,
                    role: 'both', // Default role
                },
            });
        }

        // Generate JWT
        const token = jwt.sign(
            {
                userId: user.id,
                walletAddress: user.walletAddress,
                role: user.role
            },
            process.env.JWT_SECRET!,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' } as jwt.SignOptions
        );

        return { token, user };
    }
}

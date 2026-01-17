import { API_BASE_URL } from "../config/api";

interface UserProfile {
    id: string;
    walletAddress: string;
    role: "client" | "freelancer" | "both";
    displayName?: string;
    bio?: string;
    skills?: string | string[];
    email?: string;
    createdAt: string;
}

export const AuthService = {
    async loginWithWallet(walletAddress: string): Promise<UserProfile> {
        // 1. Get nonce
        const nonceRes = await fetch(`${API_BASE_URL}/auth/nonce`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ walletAddress }),
        });
        const { nonce } = await nonceRes.json();

        // 2. Sign (Mocked signature for demo)
        const signature = `mock-sig-${nonce}`;

        // 3. Verify
        const verifyRes = await fetch(`${API_BASE_URL}/auth/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ walletAddress, signature }),
        });

        if (!verifyRes.ok) throw new Error('Login failed');
        const { token, user } = await verifyRes.json();

        // Store token and user
        localStorage.setItem('cl_token', token);
        localStorage.setItem('cl_user', JSON.stringify(user));

        return user;
    },

    async getUser(): Promise<UserProfile | null> {
        const userStr = localStorage.getItem('cl_user');
        return userStr ? JSON.parse(userStr) : null;
    },

    async getToken(): Promise<string | null> {
        return localStorage.getItem('cl_token');
    },

    async logout(): Promise<void> {
        localStorage.removeItem('cl_token');
        localStorage.removeItem('cl_user');
    },

    async getUserProfile(walletAddress: string): Promise<UserProfile | null> {
        const response = await fetch(`${API_BASE_URL}/users/${walletAddress}`);
        if (!response.ok) return null;
        return response.json();
    }
};

import { API_BASE_URL } from "../config/api";

export interface Milestone {
    id: string; // Changed from optional to reflect DB requirements
    projectId: string;
    title: string;
    description: string;
    amount: number | string;
    status: "pending" | "funded" | "submitted" | "approved" | "paid" | "disputed" | "refunded";
    escrowContractAddress?: string;
    dueDate?: string;
    submittedAt?: string;
    approvedAt?: string;
    createdAt: string;
    updatedAt: string;
}

export const MilestonesService = {
    async getProjectMilestones(projectId: string): Promise<Milestone[]> {
        const token = localStorage.getItem('cl_token');
        // Based on backend routes, we get milestones via the project details
        const response = await fetch(`${API_BASE_URL}/projects/${projectId}`, {
            headers: {
                'Authorization': token ? `Bearer ${token}` : ''
            }
        });
        if (!response.ok) throw new Error('Failed to fetch milestones');
        const project = await response.json();
        return project.milestones || [];
    },

    async getMilestoneById(id: string): Promise<Milestone> {
        const token = localStorage.getItem('cl_token');
        const response = await fetch(`${API_BASE_URL}/milestones/${id}`, {
            headers: {
                'Authorization': token ? `Bearer ${token}` : ''
            }
        });
        if (!response.ok) throw new Error('Failed to fetch milestone');
        return await response.json();
    },

    async submitMilestone(id: string): Promise<Milestone> {
        const token = localStorage.getItem('cl_token');
        const response = await fetch(`${API_BASE_URL}/milestones/${id}/submit`, {
            method: 'PATCH',
            headers: {
                'Authorization': token ? `Bearer ${token}` : ''
            }
        });
        if (!response.ok) throw new Error('Failed to submit milestone');
        return await response.json();
    },

    async registerEscrow(id: string, escrowAddress: string): Promise<Milestone> {
        const token = localStorage.getItem('cl_token');
        const response = await fetch(`${API_BASE_URL}/milestones/${id}/escrow`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token ? `Bearer ${token}` : ''
            },
            body: JSON.stringify({ escrowAddress }),
        });
        if (!response.ok) throw new Error('Failed to register escrow');
        return await response.json();
    },

    async fundMilestone(id: string, amount: number, freelancerAddress: string): Promise<string> {
        try {
            // 1. Trigger Web3 Funding (Smart Contract)
            const { Web3Service } = await import('./web3.service');
            const txHash = await Web3Service.fundMilestone(id, amount.toString(), freelancerAddress);

            // 2. Register with Backend
            await this.registerEscrow(id, txHash); // Using txHash as a temporary placeholder if contract address isn't returned directly or if we use registerEscrow differently
            // Actually Web3Service might need to return the deployed contract address.

            return txHash;

        } catch (error) {
            console.error("Funding failed", error);
            throw error;
        }
    },

    async approveMilestone(id: string): Promise<string> {
        try {
            // 1. Try Web3 Release (Smart Contract)
            const { Web3Service } = await import('./web3.service');
            const txHash = await Web3Service.releaseMilestone(id);

            // 2. Update Backend
            const token = localStorage.getItem('cl_token');
            const response = await fetch(`${API_BASE_URL}/milestones/${id}/approve`, {
                method: 'PATCH',
                headers: {
                    'Authorization': token ? `Bearer ${token}` : ''
                }
            });
            if (!response.ok) throw new Error('Failed to record approval in backend');

            return txHash;

        } catch (error) {
            console.error("Release failed", error);
            throw error;
        }
    },

    async raiseDispute(id: string, reason: string): Promise<void> {
        const token = localStorage.getItem('cl_token');
        const response = await fetch(`${API_BASE_URL}/milestones/${id}/dispute`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token ? `Bearer ${token}` : ''
            },
            body: JSON.stringify({ reason })
        });
        if (!response.ok) throw new Error('Failed to raise dispute');
    },

    async refundMilestone(id: string): Promise<string> {
        try {
            // 1. Try Web3 Refund (Smart Contract)
            const { Web3Service } = await import('./web3.service');
            const txHash = await Web3Service.refundMilestone(id);

            // 2. Update Backend
            const token = localStorage.getItem('cl_token');
            const response = await fetch(`${API_BASE_URL}/milestones/${id}/refund`, {
                method: 'PATCH',
                headers: {
                    'Authorization': token ? `Bearer ${token}` : ''
                }
            });
            if (!response.ok) throw new Error('Failed to record refund in backend');

            return txHash;

        } catch (error) {
            console.error("Refund failed", error);
            throw error;
        }
    }
};

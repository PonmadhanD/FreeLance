import { API_BASE_URL } from "../config/api";

export interface Proposal {
    id: string;
    jobId: string;
    freelancerId: string;
    coverLetter: string;
    proposedAmount: number | string;
    estimatedDuration: number;
    status: "pending" | "accepted" | "rejected" | "withdrawn";
    createdAt: string;
    updatedAt: string;
    freelancer?: {
        displayName: string;
        walletAddress: string;
        skills?: string[];
        bio?: string;
    };
    job?: {
        id: string;
        title: string;
        budget: number | string;
        status: string;
    };
}

export const ProposalsService = {
    async submitProposal(jobId: string, data: { coverLetter: string; proposedAmount: number; estimatedDuration?: number }): Promise<Proposal> {
        const token = localStorage.getItem('cl_token');
        const response = await fetch(`${API_BASE_URL}/jobs/${jobId}/proposals`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token ? `Bearer ${token}` : ''
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || "Failed to submit proposal");
        }

        return await response.json();
    },

    async getJobProposals(jobId: string): Promise<Proposal[]> {
        const token = localStorage.getItem('cl_token');
        const response = await fetch(`${API_BASE_URL}/jobs/${jobId}/proposals`, {
            headers: {
                'Authorization': token ? `Bearer ${token}` : ''
            }
        });

        if (!response.ok) throw new Error("Failed to fetch proposals");
        const result = await response.json();
        return result.data;
    },

    async getMyProposals(): Promise<Proposal[]> {
        const token = localStorage.getItem('cl_token');
        const response = await fetch(`${API_BASE_URL}/proposals/my-proposals`, {
            headers: {
                'Authorization': token ? `Bearer ${token}` : ''
            }
        });

        if (!response.ok) throw new Error("Failed to fetch my proposals");
        const result = await response.json();
        return result.data;
    },

    async acceptProposal(id: string): Promise<{ proposal: Proposal; project: any }> {
        const token = localStorage.getItem('cl_token');
        const response = await fetch(`${API_BASE_URL}/proposals/${id}/accept`, {
            method: 'PATCH',
            headers: {
                'Authorization': token ? `Bearer ${token}` : ''
            }
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || "Failed to accept proposal");
        }

        return await response.json();
    },

    async rejectProposal(id: string): Promise<Proposal> {
        const token = localStorage.getItem('cl_token');
        const response = await fetch(`${API_BASE_URL}/proposals/${id}/reject`, {
            method: 'PATCH',
            headers: {
                'Authorization': token ? `Bearer ${token}` : ''
            }
        });

        if (!response.ok) throw new Error("Failed to reject proposal");
        return await response.json();
    },

    async withdrawProposal(id: string): Promise<Proposal> {
        const token = localStorage.getItem('cl_token');
        const response = await fetch(`${API_BASE_URL}/proposals/${id}/withdraw`, {
            method: 'PATCH',
            headers: {
                'Authorization': token ? `Bearer ${token}` : ''
            }
        });

        if (!response.ok) throw new Error("Failed to withdraw proposal");
        return await response.json();
    }
};

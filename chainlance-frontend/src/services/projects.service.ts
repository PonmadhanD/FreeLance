import { API_BASE_URL } from "../config/api";
import type { Milestone } from "./milestones.service";

export interface Project {
    id: string;
    jobId: string;
    proposalId: string;
    clientId: string;
    freelancerId: string;
    totalAmount: number | string;
    status: "active" | "completed" | "disputed" | "cancelled";
    startedAt: string;
    completedAt?: string;
    updatedAt: string;
    job?: { title: string; description?: string };
    client?: { displayName: string; walletAddress: string };
    freelancer?: { displayName: string; walletAddress: string };
    milestones?: Milestone[];
}

export const ProjectsService = {
    async getMyProjects(): Promise<Project[]> {
        const token = localStorage.getItem('cl_token');
        const response = await fetch(`${API_BASE_URL}/projects`, {
            headers: {
                'Authorization': token ? `Bearer ${token}` : ''
            }
        });

        if (!response.ok) throw new Error("Failed to fetch projects");
        const result = await response.json();
        return result.data;
    },

    async getProjectById(id: string): Promise<Project> {
        const token = localStorage.getItem('cl_token');
        const response = await fetch(`${API_BASE_URL}/projects/${id}`, {
            headers: {
                'Authorization': token ? `Bearer ${token}` : ''
            }
        });

        if (!response.ok) throw new Error("Failed to fetch project");
        return await response.json();
    },

    async addMilestone(projectId: string, data: { title: string; description: string; amount: number; dueDate?: string }): Promise<Milestone> {
        const token = localStorage.getItem('cl_token');
        const response = await fetch(`${API_BASE_URL}/projects/${projectId}/milestones`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token ? `Bearer ${token}` : ''
            },
            body: JSON.stringify(data),
        });

        if (!response.ok) throw new Error("Failed to add milestone");
        return await response.json();
    },

    async completeProject(id: string): Promise<Project> {
        const token = localStorage.getItem('cl_token');
        const response = await fetch(`${API_BASE_URL}/projects/${id}/complete`, {
            method: 'PATCH',
            headers: {
                'Authorization': token ? `Bearer ${token}` : ''
            }
        });

        if (!response.ok) throw new Error("Failed to complete project");
        return await response.json();
    }
};

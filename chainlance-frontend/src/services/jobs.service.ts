import { API_BASE_URL } from "../config/api";

export interface Job {
    id?: string;
    clientId: string;
    title: string;
    description: string;
    budget: number;
    status: "open" | "in_progress" | "completed" | "cancelled";
    requiredSkills: string | string[]; // Backend might send string (SQLite)
    deadline?: string;
    createdAt: string;
    client?: any;
    _count?: { proposals: number };
}

export const JobsService = {
    async createJob(data: Omit<Job, "id" | "createdAt" | "status">): Promise<string> {
        const token = localStorage.getItem('cl_token');
        const response = await fetch(`${API_BASE_URL}/jobs`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token ? `Bearer ${token}` : ''
            },
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to create job');
        const job = await response.json();
        return job.id;
    },

    async getJobs(filters?: { clientId?: string; status?: string }): Promise<Job[]> {
        const query = new URLSearchParams(filters as any).toString();
        const response = await fetch(`${API_BASE_URL}/jobs?${query}`);
        if (!response.ok) throw new Error('Failed to fetch jobs');
        const result = await response.json();
        return result.data.map((job: any) => ({
            ...job,
            requiredSkills: typeof job.requiredSkills === 'string' ? JSON.parse(job.requiredSkills) : job.requiredSkills
        }));
    },

    async getJobById(id: string): Promise<Job | null> {
        const response = await fetch(`${API_BASE_URL}/jobs/${id}`);
        if (!response.ok) return null;
        const job = await response.json();
        return {
            ...job,
            requiredSkills: typeof job.requiredSkills === 'string' ? JSON.parse(job.requiredSkills) : job.requiredSkills
        };
    },

    async updateJob(id: string, data: Partial<Job>): Promise<void> {
        const token = localStorage.getItem('cl_token');
        const response = await fetch(`${API_BASE_URL}/jobs/${id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token ? `Bearer ${token}` : ''
            },
            body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to update job');
    }
};

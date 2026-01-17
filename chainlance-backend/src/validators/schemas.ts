import { z } from 'zod';

// ==========================================
// Shared Schemas
// ==========================================

export const paginationSchema = z.object({
    page: z.string().optional().transform((val) => val ? parseInt(val) : 1),
    limit: z.string().optional().transform((val) => val ? parseInt(val) : 20),
});

// ==========================================
// Auth Schemas
// ==========================================

export const authSchemas = {
    getNonce: z.object({
        body: z.object({
            walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
        }),
    }),
    verifySignature: z.object({
        body: z.object({
            walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
            signature: z.string().min(1, 'Signature is required'),
        }),
    }),
};

// ==========================================
// Job Schemas
// ==========================================

export const jobSchemas = {
    create: z.object({
        body: z.object({
            title: z.string().min(5).max(200),
            description: z.string().min(20),
            budget: z.string().or(z.number()).transform((val) => String(val)), // Handle both number/string input
            requiredSkills: z.array(z.string()).optional().default([]),
            deadline: z.string().datetime().optional(),
        }),
    }),
    update: z.object({
        params: z.object({
            id: z.string().uuid(),
        }),
        body: z.object({
            title: z.string().min(5).max(200).optional(),
            description: z.string().min(20).optional(),
            budget: z.string().or(z.number()).optional(),
            deadline: z.string().datetime().optional(),
        }),
    }),
    list: z.object({
        query: paginationSchema.extend({
            status: z.enum(['open', 'in_progress', 'completed', 'cancelled']).optional(),
            clientId: z.string().uuid().optional(),
            minBudget: z.string().optional(),
            maxBudget: z.string().optional(),
        }),
    }),
};

// ==========================================
// Proposal Schemas
// ==========================================

export const proposalSchemas = {
    create: z.object({
        params: z.object({
            jobId: z.string().uuid(),
        }),
        body: z.object({
            coverLetter: z.string().min(50, 'Cover letter must be at least 50 characters'),
            proposedAmount: z.string().or(z.number()).transform((val) => String(val)),
            estimatedDuration: z.string().or(z.number()).transform((val) => Number(val)).optional(),
        }),
    }),
};

// ==========================================
// Project Schemas
// ==========================================

export const projectSchemas = {
    addMilestone: z.object({
        params: z.object({
            id: z.string().uuid(),
        }),
        body: z.object({
            title: z.string().min(3).max(200),
            description: z.string().min(10),
            amount: z.string().or(z.number()).transform((val) => String(val)),
            dueDate: z.string().datetime().optional(),
        }),
    }),
};

// ==========================================
// Milestone Schemas
// ==========================================

export const milestoneSchemas = {
    registerEscrow: z.object({
        params: z.object({
            id: z.string().uuid(),
        }),
        body: z.object({
            escrowAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid contract address'),
        }),
    }),
};

// ==========================================
// Message Schemas
// ==========================================

export const messageSchemas = {
    send: z.object({
        params: z.object({
            projectId: z.string().uuid(),
        }),
        body: z.object({
            content: z.string().min(1, 'Message cannot be empty').max(5000),
        }),
    }),
};

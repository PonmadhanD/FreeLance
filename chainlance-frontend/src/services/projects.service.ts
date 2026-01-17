import { db } from "../config/firebase";
import {
    collection,
    getDocs,
    query,
    where,
    doc,
    getDoc,
    writeBatch
} from "firebase/firestore";

export interface Project {
    id?: string;
    jobId: string;
    proposalId: string;
    clientId: string;
    freelancerId: string;
    totalAmount: number;
    status: "active" | "completed" | "disputed" | "cancelled";
    startedAt: string;
    completedAt?: string;
}

export const ProjectsService = {
    /**
     * Accepts a proposal and creates a project atomically.
     */
    async createProjectFromProposal(
        jobId: string,
        proposalId: string,
        clientId: string,
        freelancerId: string,
        amount: number
    ): Promise<string> {
        const batch = writeBatch(db);

        // 1. Update Job Status
        const jobRef = doc(db, "jobs", jobId);
        batch.update(jobRef, { status: "in_progress" });

        // 2. Update Proposal Status
        const proposalRef = doc(db, "proposals", proposalId);
        batch.update(proposalRef, { status: "accepted" });

        // 3. Reject other proposals (Optional for MVP, skipped to save reads/writes)

        // 4. Create Project
        const projectRef = doc(collection(db, "projects"));
        const projectData: Project = {
            jobId,
            proposalId,
            clientId,
            freelancerId,
            totalAmount: amount,
            status: "active",
            startedAt: new Date().toISOString()
        };
        batch.set(projectRef, projectData);

        // 5. Create Initial Milestone (AUTO)
        const milestoneRef = doc(collection(db, "milestones"));
        const milestoneData = {
            projectId: projectRef.id,
            title: "Project Kickoff",
            description: "Initial milestone created automatically upon project acceptance.",
            amount: amount, // For MVP, put full Amount in one milestone
            status: "pending",
            createdAt: new Date().toISOString()
        };
        batch.set(milestoneRef, milestoneData);

        await batch.commit();
        return projectRef.id;
    },

    async getMyProjects(userId: string): Promise<Project[]> {
        // Queries are limited in Firestore (OR query support is new)
        // We'll fetch client projects and freelancer projects in parallel
        const clientQ = query(collection(db, "projects"), where("clientId", "==", userId));
        const freelancerQ = query(collection(db, "projects"), where("freelancerId", "==", userId));

        const [clientSnap, freelancerSnap] = await Promise.all([
            getDocs(clientQ),
            getDocs(freelancerQ)
        ]);

        const projectsMap = new Map();
        [...clientSnap.docs, ...freelancerSnap.docs].forEach(d => {
            projectsMap.set(d.id, { id: d.id, ...d.data() });
        });

        return Array.from(projectsMap.values());
    },

    async getProjectById(id: string): Promise<Project | null> {
        const docRef = doc(db, "projects", id);
        const snap = await getDoc(docRef);
        return snap.exists() ? ({ id: snap.id, ...snap.data() } as Project) : null;
    }
};

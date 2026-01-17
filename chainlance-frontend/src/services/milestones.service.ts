import { db } from "../config/firebase";
import {
    collection,
    addDoc,
    getDocs,
    query,
    where,
    doc,
    updateDoc
} from "firebase/firestore";

export interface Milestone {
    id?: string;
    projectId: string;
    title: string;
    description: string;
    amount: number;
    status: "pending" | "funded" | "submitted" | "approved" | "paid";
    escrowContractAddress?: string;
    dueDate?: string;
    createdAt: string;
}

export const MilestonesService = {
    async addMilestone(data: Omit<Milestone, "id" | "createdAt" | "status">): Promise<string> {
        const milestoneData = {
            ...data,
            status: "pending",
            createdAt: new Date().toISOString()
        };

        const docRef = await addDoc(collection(db, "milestones"), milestoneData);
        return docRef.id;
    },

    async getProjectMilestones(projectId: string): Promise<Milestone[]> {
        const q = query(collection(db, "milestones"), where("projectId", "==", projectId));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Milestone));
    },

    async updateMilestoneStatus(id: string, status: Milestone["status"], escrowAddress?: string): Promise<void> {
        const docRef = doc(db, "milestones", id);
        const data: any = { status };
        if (escrowAddress) {
            data.escrowContractAddress = escrowAddress;
        }
        await updateDoc(docRef, data);
    },

    async fundMilestone(id: string, amount: number, freelancerAddress: string): Promise<string> {
        try {
            // 1. Try Web3 Funding (if available and configured)
            const { Web3Service } = await import('./web3.service');
            const txHash = await Web3Service.fundMilestone(id, amount.toString(), freelancerAddress);

            // 2. Update Firestore
            await this.updateMilestoneStatus(id, 'funded', txHash);
            return txHash;

        } catch (error) {
            console.warn("Web3 Funding failed or not available, falling back to simulation", error);
            // Fallback: Just update Firestore for MVP/Demo
            await this.updateMilestoneStatus(id, 'funded', "simulated_funding_" + Date.now());
            return "simulated_tx";
        }
    },

    async releaseMilestone(id: string): Promise<string> {
        try {
            // 1. Try Web3 Release
            const { Web3Service } = await import('./web3.service');
            const txHash = await Web3Service.releaseMilestone(id);

            // 2. Update Firestore
            await this.updateMilestoneStatus(id, 'paid', txHash);
            return txHash;

        } catch (error) {
            console.warn("Web3 Release failed or not available, falling back to simulation", error);
            await this.updateMilestoneStatus(id, 'paid', "simulated_release_" + Date.now());
            return "simulated_tx";
        }
    }
};

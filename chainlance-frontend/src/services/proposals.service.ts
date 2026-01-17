import { db } from "../config/firebase";
import {
    collection,
    addDoc,
    getDocs,
    query,
    where,
    orderBy,
    doc,
    getDoc,
    updateDoc
} from "firebase/firestore";

export interface Proposal {
    id?: string;
    jobId: string;
    freelancerId: string;
    coverLetter: string;
    proposedAmount: number;
    estimatedDuration: number;
    status: "pending" | "accepted" | "rejected" | "withdrawn";
    createdAt: string;
    freelancer?: any;
}

export const ProposalsService = {
    async submitProposal(data: Omit<Proposal, "id" | "createdAt" | "status">): Promise<string> {
        // Check if already submitted
        const q = query(
            collection(db, "proposals"),
            where("jobId", "==", data.jobId),
            where("freelancerId", "==", data.freelancerId)
        );
        const existing = await getDocs(q);

        if (!existing.empty) {
            throw new Error("You have already submitted a proposal for this job");
        }

        const proposalData = {
            ...data,
            status: "pending",
            createdAt: new Date().toISOString()
        };

        const docRef = await addDoc(collection(db, "proposals"), proposalData);
        return docRef.id;
    },

    async getProposals(jobId: string): Promise<Proposal[]> {
        const q = query(
            collection(db, "proposals"),
            where("jobId", "==", jobId),
            orderBy("createdAt", "desc")
        );

        const snapshot = await getDocs(q);
        const proposals = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Proposal));

        // Join with freelancer profile
        const proposalsWithFreelancer = await Promise.all(proposals.map(async (p) => {
            const freelancerRef = doc(db, "users", p.freelancerId.toLowerCase());
            const freelancerSnap = await getDoc(freelancerRef);
            return {
                ...p,
                freelancer: freelancerSnap.exists() ? freelancerSnap.data() : { displayName: "Unknown" }
            };
        }));

        return proposalsWithFreelancer as Proposal[];
    },

    async getMyProposals(freelancerId: string): Promise<Proposal[]> {
        const q = query(collection(db, "proposals"), where("freelancerId", "==", freelancerId));
        const snapshot = await getDocs(q);
        // Might want to join with Jobs here to show job titles
        return snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Proposal));
    },

    async updateProposalStatus(id: string, status: "accepted" | "rejected" | "withdrawn"): Promise<void> {
        const docRef = doc(db, "proposals", id);
        await updateDoc(docRef, { status });
    }
};

import { ethers } from 'ethers';
import { CHAINLANCE_ESCROW_ADDRESS, CHAINLANCE_ESCROW_ABI } from '../config/contracts';

declare global {
    interface Window {
        ethereum?: any;
    }
}

export const Web3Service = {
    async connectWallet(): Promise<string> {
        if (!window.ethereum) throw new Error("Metamask not found");
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        return await signer.getAddress();
    },

    async getContract() {
        if (!window.ethereum) throw new Error("Metamask not found");
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        return new ethers.Contract(CHAINLANCE_ESCROW_ADDRESS, CHAINLANCE_ESCROW_ABI, signer);
    },

    async fundMilestone(milestoneId: string, amountEth: string, freelancerAddress: string): Promise<string> {
        const contract = await this.getContract();
        const amountWei = ethers.parseEther(amountEth);

        const tx = await contract.createEscrow(milestoneId, freelancerAddress, { value: amountWei });
        await tx.wait(); // Wait for confirmation
        return tx.hash;
    },

    async releaseMilestone(milestoneId: string): Promise<string> {
        const contract = await this.getContract();
        const tx = await contract.release(milestoneId);
        await tx.wait();
        return tx.hash;
    }
};

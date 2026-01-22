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
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        const signer = await provider.getSigner();
        return await signer.getAddress();
    },

    async isWalletConnected(): Promise<string | null> {
        if (!window.ethereum) return null;
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.listAccounts();
        return accounts.length > 0 ? accounts[0].address : null;
    },

    async getNetwork(): Promise<{ chainId: bigint; name: string }> {
        if (!window.ethereum) throw new Error("Metamask not found");
        const provider = new ethers.BrowserProvider(window.ethereum);
        const network = await provider.getNetwork();
        return {
            chainId: network.chainId,
            name: network.name
        };
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

import { ethers } from 'ethers';
import { prisma } from '../config/database';
// @ts-ignore - Importing JSON directly
import escrowABI from '../../contracts/Escrow.json';

export class BlockchainService {
    private provider: ethers.JsonRpcProvider;

    constructor() {
        // Fallback to a default provider if env is invalid, to prevent crash during initial setup
        const rpcUrl = process.env.RPC_URL || 'http://localhost:8545';
        try {
            this.provider = new ethers.JsonRpcProvider(rpcUrl);
            // Prevent crash on network detection failure by adding a no-op catcher on the promise if possible
            // But JsonRpcProvider is usually synchronous in init. It fails on usage.
        } catch (err) {
            console.warn('Failed to initialize JsonRpcProvider:', err);
            this.provider = new ethers.JsonRpcProvider('http://localhost:8545');
        }
    }

    /**
     * Verifies a transaction by hash and checks if the amount matches
     */
    async verifyTransaction(txHash: string, expectedAmount: string): Promise<boolean> {
        try {
            const tx = await this.provider.getTransaction(txHash);
            if (!tx) return false;

            const receipt = await tx.wait();
            if (!receipt || receipt.status !== 1) {
                return false;
            }

            // Verify amount (tx.value is bigint in v6)
            const actualAmount = ethers.formatEther(tx.value);

            // Simple string comparison for amount
            return actualAmount === expectedAmount;
        } catch (error) {
            console.error('Error verifying transaction:', error);
            return false;
        }
    }

    /**
     * Gets details from the escrow contract
     */
    async getEscrowDetails(contractAddress: string) {
        try {
            const contract = new ethers.Contract(
                contractAddress,
                escrowABI.abi,
                this.provider
            );

            return await contract.getDetails();
        } catch (error) {
            console.error('Error fetching escrow details:', error);
            throw error;
        }
    }

    /**
     * Polls for events within a block range and updates database
     */
    async pollEvents(fromBlock: number, toBlock: number) {
        // Get all funded/active milestones that have an escrow contract
        const milestones = await prisma.milestone.findMany({
            where: {
                escrowContractAddress: { not: null },
                status: { in: ['funded', 'submitted', 'approved'] },
            },
        });

        for (const milestone of milestones) {
            if (!milestone.escrowContractAddress) continue;

            try {
                const contract = new ethers.Contract(
                    milestone.escrowContractAddress,
                    escrowABI.abi,
                    this.provider
                );

                // Query all events for this contract in the range
                const events = await contract.queryFilter('*', fromBlock, toBlock);

                for (const event of events) {
                    // @ts-ignore
                    await this.processEvent(event, milestone.id);
                }
            } catch (error) {
                console.error(`Error polling events for milestone ${milestone.id}:`, error);
            }
        }
    }

    /**
     * Process a single event and update database state
     */
    private async processEvent(event: any, milestoneId: string) {
        // event.getBlock() and event.getTransaction() are likely async in v6
        const block = await event.getBlock();
        const tx = await event.getTransaction();

        // Check if already processed
        const exists = await prisma.escrowTransaction.findUnique({
            where: { transactionHash: tx.hash },
        });

        if (exists) return;

        const eventName = event.eventName || event.fragment?.name;

        const eventTypeMap: Record<string, string> = {
            EscrowCreated: 'created',
            EscrowFunded: 'funded',
            EscrowReleased: 'released',
            EscrowRefunded: 'refunded',
        };

        const eventType = eventTypeMap[eventName];
        if (!eventType) return;

        // In ethers v6, args are accessed differently depending on event structure
        // We assume the amount is present in args. For EscrowFunded/Released it's usually arg[1]
        // But let's fallback to tx value if simpler
        let amount = '0.0';
        if (event.args && event.args.length > 0) {
            // Try to find the amount (uint256) in args
            // Based on our ABI: 
            // Created: [client, freelancer, amount]
            // Funded: [client, amount]
            // Released: [freelancer, amount]
            // Refunded: [client, amount]
            // So amount is always the last arg
            const rawAmount = event.args[event.args.length - 1];
            amount = ethers.formatEther(rawAmount);
        }

        // Create transaction record
        await prisma.escrowTransaction.create({
            data: {
                milestoneId,
                transactionHash: tx.hash,
                eventType: eventType as any,
                fromAddress: tx.from,
                amount: parseFloat(amount), // Prisma Decimal requires float/string
                blockNumber: BigInt(block.number),
                timestamp: new Date(block.timestamp * 1000),
            },
        });

        // Update milestone status based on blockchain truth
        await this.updateMilestoneStatus(milestoneId, eventType);
    }

    private async updateMilestoneStatus(milestoneId: string, eventType: string) {
        const statusMap: Record<string, string> = {
            funded: 'funded',
            released: 'paid', // Released on chain = Paid in DB
            refunded: 'refunded',
        };

        const newStatus = statusMap[eventType];
        if (!newStatus) return;

        await prisma.milestone.update({
            where: { id: milestoneId },
            data: { status: newStatus as any },
        });
    }
}

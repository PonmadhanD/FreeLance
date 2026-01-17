import { BlockchainService } from '../services/blockchain.service';
import { prisma } from '../config/database';

const blockchainService = new BlockchainService();
// Run once every 24 hours in production, or shorter for demo
const RECONCILIATION_INTERVAL_MS = 24 * 60 * 60 * 1000;

export async function startReconciliationWorker() {
    console.log('⚖️ Scheduler: Starting Reconciliation Worker (Daily)...');

    setInterval(async () => {
        console.log('⚖️ Reconciliation: Starting verification cycle...');
        try {
            // 1. Get all milestones that are marked as 'funded' but not 'paid'
            const activeMilestones = await prisma.milestone.findMany({
                where: {
                    status: { in: ['funded', 'submitted', 'approved'] },
                    escrowContractAddress: { not: null }
                }
            });

            console.log(`⚖️ Reconciliation: Checking ${activeMilestones.length} active milestones...`);

            for (const milestone of activeMilestones) {
                if (!milestone.escrowContractAddress) continue;

                try {
                    // Get on-chain state
                    const details = await blockchainService.getEscrowDetails(milestone.escrowContractAddress);
                    // details returned from contract: [client, freelancer, amount, isFunded, isReleased]

                    const isFunded = details[3];
                    const isReleased = details[4];

                    // Check for inconsistencies

                    // Case 1: DB says funded, Blockchain says RELEASED (Missed 'EscrowReleased' event)
                    if (milestone.status !== 'paid' && isReleased) {
                        console.warn(`⚠️ Reconciliation Fix: Milestone ${milestone.id} is RELEASED on-chain but ${milestone.status} in DB. Updating to 'paid'.`);
                        await prisma.milestone.update({
                            where: { id: milestone.id },
                            data: { status: 'paid' }
                        });
                    }

                    // Case 2: DB says funded, Blockchain says NOT FUNDED (Reorg? Refunded?)
                    // Note: If refunded, isFunded might be false depending on contract logic, or isRefunded event.
                    // Our simple contract might just set balance to 0. 
                    // If isFunded is a bool flag in contract that stays true, then this check helps.
                    // If it's balance based, we check balance.
                    // Based on ABI details: [client, freelancer, amount, isFunded, isReleased]

                    if (milestone.status === 'funded' && !isFunded && !isReleased) {
                        console.error(`🚨 Reconciliation Alert: Milestone ${milestone.id} is marked funded in DB but isFunded=false on-chain! Potential sync error or reorg.`);
                        // We generally don't auto-revert to pending to avoid chaos, but we log loud error.
                    }

                } catch (err) {
                    console.error(`Error reconciling milestone ${milestone.id}:`, err);
                }
            }

            console.log('⚖️ Reconciliation: Cycle complete.');

        } catch (error) {
            console.error('Error in reconciliation worker:', error);
        }
    }, RECONCILIATION_INTERVAL_MS);
}

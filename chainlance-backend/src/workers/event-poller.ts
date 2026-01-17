import { BlockchainService } from '../services/blockchain.service';
import { prisma } from '../config/database';
import { ethers } from 'ethers';

const blockchainService = new BlockchainService();
const POLL_INTERVAL_MS = 15000; // 15 seconds
const BLOCKS_TO_SCAN = 1000;

export async function startEventPoller() {
    console.log('🔄 Schedular: Starting Event Poller...');

    // Initial check or load last processed block from DB (omitted for MVP, using simple tracking)
    let lastProcessedBlock = 0;

    // Ideally store this in Redis or DB
    const state = { isRunning: false };

    setInterval(async () => {
        if (state.isRunning) return;
        state.isRunning = true;

        try {
            // Get current block
            // Quick way to get provider from service (accessing private prop via any or exposes it)
            // Or just create new provider here. Let's rely on service methods.
            // But service pollEvents needs range.
            // Let's modify service to handle "poll from last known".
            // For now, we'll instantiate a provider just to get block number
            const provider = new ethers.JsonRpcProvider(process.env.RPC_URL || 'http://localhost:8545');
            const currentBlock = await provider.getBlockNumber();

            if (lastProcessedBlock === 0) {
                lastProcessedBlock = currentBlock - 100; // Start from recent
            }

            if (currentBlock > lastProcessedBlock) {
                // Don't scan too many blocks at once
                const toBlock = Math.min(currentBlock, lastProcessedBlock + BLOCKS_TO_SCAN);

                console.log(`Polling events from ${lastProcessedBlock + 1} to ${toBlock}...`);

                await blockchainService.pollEvents(lastProcessedBlock + 1, toBlock);

                lastProcessedBlock = toBlock;
            }
        } catch (error) {
            console.error('Error in event poller:', error);
        } finally {
            state.isRunning = false;
        }
    }, POLL_INTERVAL_MS);
}

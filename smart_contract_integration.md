# Smart Contract Integration Guide

## Overview

This document defines how the off-chain backend integrates with on-chain escrow smart contracts for milestone-based payments.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (Next.js)                    │
│  - Wallet Connection (MetaMask/WalletConnect)               │
│  - Create Escrow Contract                                   │
│  - Fund/Release/Refund (Direct blockchain calls)            │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      │ REST API
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                     Backend (Node.js + Prisma)               │
│  - Manage milestone lifecycle                               │
│  - Listen for blockchain events                             │
│  - Sync on-chain state to database                          │
│  - Business logic & validation                              │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      │ Event Polling / Webhooks
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                    Blockchain (Ethereum)                     │
│  - Escrow Smart Contracts (1 per milestone)                 │
│  - Immutable payment records                                │
│  - Release/Refund logic                                     │
└─────────────────────────────────────────────────────────────┘
```

---

## Escrow Smart Contract Interface

### Required Contract Functions

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IEscrow {
    // Create escrow with client, freelancer, and amount
    function createEscrow(
        address _client,
        address _freelancer,
        uint256 _amount
    ) external payable;

    // Release funds to freelancer (client only)
    function release() external;

    // Refund to client (authorized party only)
    function refund() external;

    // Get escrow details
    function getDetails() external view returns (
        address client,
        address freelancer,
        uint256 amount,
        bool isReleased,
        bool isRefunded
    );

    // Events
    event EscrowCreated(address indexed client, address indexed freelancer, uint256 amount);
    event EscrowFunded(address indexed client, uint256 amount);
    event EscrowReleased(address indexed freelancer, uint256 amount);
    event EscrowRefunded(address indexed client, uint256 amount);
}
```

### Minimal Escrow Contract Example

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract Escrow is ReentrancyGuard {
    address public client;
    address public freelancer;
    uint256 public amount;
    bool public isReleased;
    bool public isRefunded;

    event EscrowCreated(address indexed client, address indexed freelancer, uint256 amount);
    event EscrowFunded(address indexed client, uint256 amount);
    event EscrowReleased(address indexed freelancer, uint256 amount);
    event EscrowRefunded(address indexed client, uint256 amount);

    constructor(address _client, address _freelancer, uint256 _amount) payable {
        require(_client != address(0), "Invalid client address");
        require(_freelancer != address(0), "Invalid freelancer address");
        require(_amount > 0, "Amount must be greater than zero");
        require(msg.value == _amount, "Must send exact amount");

        client = _client;
        freelancer = _freelancer;
        amount = _amount;

        emit EscrowCreated(_client, _freelancer, _amount);
        emit EscrowFunded(_client, msg.value);
    }

    function release() external nonReentrant {
        require(msg.sender == client, "Only client can release");
        require(!isReleased, "Already released");
        require(!isRefunded, "Already refunded");

        isReleased = true;
        (bool success, ) = freelancer.call{value: amount}("");
        require(success, "Transfer failed");

        emit EscrowReleased(freelancer, amount);
    }

    function refund() external nonReentrant {
        require(msg.sender == client, "Only client can refund");
        require(!isReleased, "Already released");
        require(!isRefunded, "Already refunded");

        isRefunded = true;
        (bool success, ) = client.call{value: amount}("");
        require(success, "Transfer failed");

        emit EscrowRefunded(client, amount);
    }

    function getDetails() external view returns (
        address,
        address,
        uint256,
        bool,
        bool
    ) {
        return (client, freelancer, amount, isReleased, isRefunded);
    }
}
```

---

## Event Listening Strategy

### Option 1: Event Polling (Recommended for MVP)

**Pros:**
- Simple to implement
- No infrastructure dependencies
- Works with any blockchain

**Cons:**
- Slight delay (polling interval)
- More RPC calls

**Implementation:**

```typescript
import { ethers } from 'ethers';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const ESCROW_ABI = [...]; // Your escrow ABI

// Poll every 15 seconds
const POLLING_INTERVAL = 15000;
let lastProcessedBlock = 0;

async function pollEvents() {
  try {
    const currentBlock = await provider.getBlockNumber();
    
    if (lastProcessedBlock === 0) {
      // First run: start from recent blocks
      lastProcessedBlock = currentBlock - 100;
    }

    // Get all milestones with escrow contracts
    const milestones = await prisma.milestone.findMany({
      where: {
        escrowContractAddress: { not: null },
        status: { in: ['funded', 'submitted', 'approved'] },
      },
    });

    for (const milestone of milestones) {
      const contract = new ethers.Contract(
        milestone.escrowContractAddress!,
        ESCROW_ABI,
        provider
      );

      // Query events from lastProcessedBlock to currentBlock
      const events = await contract.queryFilter(
        '*', // All events
        lastProcessedBlock + 1,
        currentBlock
      );

      for (const event of events) {
        await processEvent(event, milestone.id);
      }
    }

    lastProcessedBlock = currentBlock;
  } catch (error) {
    console.error('Error polling events:', error);
  }

  // Schedule next poll
  setTimeout(pollEvents, POLLING_INTERVAL);
}

async function processEvent(event: ethers.Event, milestoneId: string) {
  const eventName = event.eventName;
  const block = await event.getBlock();
  const tx = await event.getTransaction();

  // Check if already processed
  const exists = await prisma.escrowTransaction.findUnique({
    where: { transactionHash: tx.hash },
  });

  if (exists) return; // Already processed

  // Map event to EscrowEventType
  const eventTypeMap: Record<string, string> = {
    EscrowCreated: 'created',
    EscrowFunded: 'funded',
    EscrowReleased: 'released',
    EscrowRefunded: 'refunded',
  };

  const eventType = eventTypeMap[eventName];
  if (!eventType) return;

  // Create escrow transaction record
  await prisma.escrowTransaction.create({
    data: {
      milestoneId,
      transactionHash: tx.hash,
      eventType: eventType as any,
      fromAddress: tx.from,
      amount: ethers.formatEther(event.args?.amount || 0),
      blockNumber: BigInt(block.number),
      timestamp: new Date(block.timestamp * 1000),
    },
  });

  // Update milestone status
  await updateMilestoneStatus(milestoneId, eventType);
}

async function updateMilestoneStatus(milestoneId: string, eventType: string) {
  const statusMap: Record<string, string> = {
    funded: 'funded',
    released: 'paid',
    refunded: 'refunded',
  };

  const newStatus = statusMap[eventType];
  if (!newStatus) return;

  await prisma.milestone.update({
    where: { id: milestoneId },
    data: { status: newStatus as any },
  });
}

// Start polling
pollEvents();
```

---

### Option 2: WebSocket Subscriptions

**Pros:**
- Real-time updates
- Fewer RPC calls

**Cons:**
- Requires WebSocket provider
- Connection management complexity

**Implementation:**

```typescript
import { ethers } from 'ethers';

const provider = new ethers.WebSocketProvider(process.env.WS_RPC_URL!);

async function subscribeToEscrow(escrowAddress: string, milestoneId: string) {
  const contract = new ethers.Contract(escrowAddress, ESCROW_ABI, provider);

  // Listen to all events
  contract.on('EscrowFunded', async (client, amount, event) => {
    await handleEvent('funded', event, milestoneId);
  });

  contract.on('EscrowReleased', async (freelancer, amount, event) => {
    await handleEvent('released', event, milestoneId);
  });

  contract.on('EscrowRefunded', async (client, amount, event) => {
    await handleEvent('refunded', event, milestoneId);
  });
}

async function handleEvent(eventType: string, event: any, milestoneId: string) {
  const block = await event.getBlock();
  
  await prisma.escrowTransaction.create({
    data: {
      milestoneId,
      transactionHash: event.log.transactionHash,
      eventType: eventType as any,
      fromAddress: event.log.address,
      amount: ethers.formatEther(event.args[1]), // amount is second arg
      blockNumber: BigInt(block.number),
      timestamp: new Date(block.timestamp * 1000),
    },
  });

  await updateMilestoneStatus(milestoneId, eventType);
}
```

---

### Option 3: Blockchain Event Webhooks (Alchemy/Infura)

**Pros:**
- Highly reliable
- No polling overhead
- Real-time notifications

**Cons:**
- Vendor lock-in
- Additional service dependency

**Implementation (Alchemy Notify):**

```typescript
// Set up webhook receiver endpoint
app.post('/webhooks/alchemy', async (req, res) => {
  const { event } = req.body;

  // Verify webhook signature
  const signature = req.headers['x-alchemy-signature'];
  if (!verifyAlchemySignature(signature, req.body)) {
    return res.status(401).send('Invalid signature');
  }

  // Process event
  const { activity } = event;
  const milestoneId = await getMilestoneByAddress(activity.toAddress);

  if (milestoneId) {
    await processEvent(activity, milestoneId);
  }

  res.status(200).send('OK');
});
```

---

## Milestone Lifecycle Integration

### 1. Create Milestone (Off-Chain)

**Flow:**
1. Client/Freelancer creates milestone via API
2. Backend validates and saves to database
3. Milestone status: `pending`

**API:** `POST /api/projects/:id/milestones`

---

### 2. Fund Milestone (On-Chain → Off-Chain)

**Flow:**
1. Client deploys escrow contract via frontend
2. Frontend calls `POST /api/milestones/:id/fund` with contract address and tx hash
3. Backend **verifies transaction** on blockchain
4. Backend updates milestone with `escrowContractAddress`
5. Backend creates `escrow_transaction` record
6. Milestone status: `pending` → `funded`

**API:** `PATCH /api/milestones/:id/fund`

**Validation:**
```typescript
async function verifyFundingTransaction(
  txHash: string,
  milestoneId: string,
  expectedAmount: string
) {
  const tx = await provider.getTransaction(txHash);
  const receipt = await tx?.wait();

  if (!receipt || receipt.status !== 1) {
    throw new Error('Transaction failed');
  }

  // Verify amount matches milestone
  const milestone = await prisma.milestone.findUnique({
    where: { id: milestoneId },
  });

  if (ethers.formatEther(tx.value) !== milestone.amount.toString()) {
    throw new Error('Amount mismatch');
  }

  return true;
}
```

---

### 3. Submit Work (Off-Chain)

**Flow:**
1. Freelancer submits deliverables via API
2. Backend updates milestone
3. Milestone status: `funded` → `submitted`

**API:** `PATCH /api/milestones/:id/submit`

---

### 4. Approve & Release (Off-Chain → On-Chain)

**Flow:**
1. Client approves via API
2. Backend updates milestone status to `approved`
3. **Frontend** calls `escrow.release()` on blockchain
4. Event listener detects `EscrowReleased` event
5. Backend creates escrow transaction record
6. Milestone status: `approved` → `paid`

**API:** `PATCH /api/milestones/:id/approve`

**Frontend Release:**
```typescript
const signer = await provider.getSigner();
const contract = new ethers.Contract(escrowAddress, ESCROW_ABI, signer);
const tx = await contract.release();
await tx.wait();
```

---

### 5. Dispute & Refund (Manual Resolution)

**Flow:**
1. Party raises dispute via API
2. Admin reviews and resolves
3. If refund: **Frontend** calls `escrow.refund()`
4. Event listener updates milestone to `refunded`

**API:** `POST /api/milestones/:id/disputes`

---

## Reconciliation Logic

### Daily Reconciliation Job

Ensures database state matches blockchain state.

```typescript
import { ethers } from 'ethers';

async function reconcileMilestones() {
  const milestones = await prisma.milestone.findMany({
    where: {
      escrowContractAddress: { not: null },
      status: { in: ['funded', 'approved'] },
    },
  });

  for (const milestone of milestones) {
    const contract = new ethers.Contract(
      milestone.escrowContractAddress!,
      ESCROW_ABI,
      provider
    );

    const [client, freelancer, amount, isReleased, isRefunded] =
      await contract.getDetails();

    // Check for mismatches
    if (isReleased && milestone.status !== 'paid') {
      console.warn(`Mismatch: Milestone ${milestone.id} should be paid`);
      await prisma.milestone.update({
        where: { id: milestone.id },
        data: { status: 'paid' },
      });
    }

    if (isRefunded && milestone.status !== 'refunded') {
      console.warn(`Mismatch: Milestone ${milestone.id} should be refunded`);
      await prisma.milestone.update({
        where: { id: milestone.id },
        data: { status: 'refunded' },
      });
    }
  }
}

// Run every 6 hours
setInterval(reconcileMilestones, 6 * 60 * 60 * 1000);
```

---

## Security Considerations

### 1. Transaction Verification

**ALWAYS verify blockchain transactions before updating database:**

```typescript
async function verifyTransaction(txHash: string): Promise<boolean> {
  const tx = await provider.getTransaction(txHash);
  const receipt = await tx?.wait();
  
  // Check confirmation count
  const currentBlock = await provider.getBlockNumber();
  const confirmations = currentBlock - receipt!.blockNumber;
  
  return receipt?.status === 1 && confirmations >= 3;
}
```

---

### 2. Prevent Replay Attacks

**Check for duplicate transactions:**

```typescript
const exists = await prisma.escrowTransaction.findUnique({
  where: { transactionHash: txHash },
});

if (exists) {
  throw new Error('Transaction already processed');
}
```

---

### 3. Validate Addresses

**Ensure contract addresses are checksummed:**

```typescript
import { ethers } from 'ethers';

function validateAddress(address: string): boolean {
  try {
    return ethers.isAddress(address);
  } catch {
    return false;
  }
}
```

---

### 4. Rate Limiting

**Prevent spam from event webhooks:**

```typescript
import rateLimit from 'express-rate-limit';

const webhookLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // 60 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/webhooks', webhookLimiter);
```

---

## Environment Configuration

```env
# Blockchain
RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
WS_RPC_URL=wss://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
CHAIN_ID=11155111
ESCROW_FACTORY_ADDRESS=0x...

# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/chainlance

# API
JWT_SECRET=your-secret-key
PORT=3000
```

---

## Testing Strategy

### 1. Unit Tests

```typescript
describe('Escrow Event Processing', () => {
  it('should create escrow transaction from funded event', async () => {
    const event = mockFundedEvent();
    await processEvent(event, 'milestone-id');
    
    const tx = await prisma.escrowTransaction.findFirst({
      where: { milestoneId: 'milestone-id' },
    });
    
    expect(tx).toBeDefined();
    expect(tx?.eventType).toBe('funded');
  });
});
```

---

### 2. Integration Tests

```typescript
describe('Milestone Lifecycle', () => {
  it('should complete full milestone flow', async () => {
    // Create milestone
    const milestone = await createMilestone();
    
    // Fund escrow
    const tx = await fundEscrow(milestone);
    await recordFunding(milestone.id, tx.hash);
    
    // Verify status
    const updated = await prisma.milestone.findUnique({
      where: { id: milestone.id },
    });
    expect(updated?.status).toBe('funded');
  });
});
```

---

### 3. E2E Tests (Testnet)

Use Hardhat local network or testnet (Sepolia) for end-to-end testing:

```typescript
import { ethers } from 'hardhat';

describe('Escrow Contract Integration', () => {
  it('should deploy and fund escrow', async () => {
    const [client, freelancer] = await ethers.getSigners();
    
    const Escrow = await ethers.getContractFactory('Escrow');
    const escrow = await Escrow.deploy(
      client.address,
      freelancer.address,
      ethers.parseEther('1.0'),
      { value: ethers.parseEther('1.0') }
    );
    
    const details = await escrow.getDetails();
    expect(details.amount).to.equal(ethers.parseEther('1.0'));
  });
});
```

---

## Deployment Checklist

- [ ] Deploy escrow factory/template contract
- [ ] Set up event polling service (or webhook endpoint)
- [ ] Configure RPC provider (Alchemy/Infura)
- [ ] Set up reconciliation cron job
- [ ] Add monitoring for failed transactions
- [ ] Test on testnet (Sepolia/Goerli)
- [ ] Set up alerts for critical events
- [ ] Document escrow contract addresses

---

## Monitoring & Alerts

### Key Metrics to Track

1. **Event Processing Lag:** Time between on-chain event and database update
2. **Failed Transactions:** Transactions that failed verification
3. **Reconciliation Mismatches:** Database vs blockchain state diffs
4. **RPC Errors:** Failed RPC calls to blockchain

### Alert Examples

```typescript
// Alert if processing lag > 5 minutes
if (Date.now() - lastEventTimestamp > 5 * 60 * 1000) {
  sendAlert('Event processing lag detected');
}

// Alert on reconciliation mismatch
if (dbStatus !== onChainStatus) {
  sendCriticalAlert(`Status mismatch for milestone ${milestoneId}`);
}
```

---

## Summary

**Key Integration Points:**
1. ✅ Frontend deploys escrow contracts directly
2. ✅ Backend listens for blockchain events (polling recommended)
3. ✅ Backend validates all transactions before updating database
4. ✅ Reconciliation job ensures consistency
5. ✅ Milestone status transitions are driven by blockchain events

**Database ↔ Blockchain Linkage:**
- `milestones.escrow_contract_address` → On-chain contract
- `escrow_transactions` → Immutable audit log
- Status transitions validated against blockchain state

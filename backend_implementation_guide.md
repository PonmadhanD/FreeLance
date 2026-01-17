# Backend Implementation Guide

## Overview

This guide walks you through implementing the ChainLance backend using the provided schema, APIs, and smart contract integration.

---

## Technology Stack

- **Runtime:** Node.js 18+
- **Framework:** Express.js
- **Database:** PostgreSQL 14+
- **ORM:** Prisma 5+
- **Blockchain:** Ethers.js v6
- **Authentication:** JWT + Wallet Signatures
- **Validation:** Zod
- **Testing:** Jest + Supertest

---

## Project Structure

```
chainlance-backend/
├── src/
│   ├── config/
│   │   ├── database.ts          # Prisma client setup
│   │   ├── blockchain.ts        # Ethers.js provider
│   │   └── env.ts               # Environment variables
│   ├── controllers/
│   │   ├── auth.controller.ts
│   │   ├── jobs.controller.ts
│   │   ├── proposals.controller.ts
│   │   ├── projects.controller.ts
│   │   ├── milestones.controller.ts
│   │   ├── disputes.controller.ts
│   │   └── messages.controller.ts
│   ├── services/
│   │   ├── auth.service.ts
│   │   ├── blockchain.service.ts  # Event listening & verification
│   │   ├── escrow.service.ts      # Escrow contract interactions
│   │   └── notification.service.ts
│   ├── middleware/
│   │   ├── auth.middleware.ts     # JWT verification
│   │   ├── validation.middleware.ts
│   │   └── error.middleware.ts
│   ├── routes/
│   │   ├── auth.routes.ts
│   │   ├── jobs.routes.ts
│   │   ├── proposals.routes.ts
│   │   ├── projects.routes.ts
│   │   ├── milestones.routes.ts
│   │   ├── disputes.routes.ts
│   │   └── messages.routes.ts
│   ├── validators/
│   │   └── schemas.ts             # Zod validation schemas
│   ├── workers/
│   │   ├── event-poller.ts        # Blockchain event polling
│   │   └── reconciliation.ts      # Daily reconciliation job
│   ├── utils/
│   │   ├── jwt.ts
│   │   ├── errors.ts
│   │   └── helpers.ts
│   ├── types/
│   │   └── index.ts               # TypeScript types
│   └── index.ts                   # App entry point
├── prisma/
│   ├── schema.prisma
│   ├── seed.ts
│   └── migrations/
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── contracts/                     # Escrow ABI files
│   └── Escrow.json
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

---

## Setup Instructions

### 1. Initialize Project

```bash
mkdir chainlance-backend
cd chainlance-backend
npm init -y
```

### 2. Install Dependencies

```bash
# Core dependencies
npm install express cors helmet dotenv
npm install @prisma/client ethers
npm install jsonwebtoken express-rate-limit
npm install zod

# Dev dependencies
npm install -D typescript @types/node @types/express
npm install -D @types/jsonwebtoken @types/cors
npm install -D prisma ts-node nodemon
npm install -D jest @types/jest ts-jest supertest @types/supertest
```

### 3. Configure TypeScript

**`tsconfig.json`:**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "moduleResolution": "node"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

### 4. Setup Environment Variables

**`.env.example`:**
```env
# Server
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/chainlance

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=7d

# Blockchain
RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
WS_RPC_URL=wss://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY
CHAIN_ID=11155111

# CORS
CORS_ORIGIN=http://localhost:3001

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
```

### 5. Initialize Prisma

Copy the `schema.prisma` file from earlier, then:

```bash
npx prisma generate
npx prisma migrate dev --name init
npx prisma db seed
```

---

## Core Implementation

### Authentication Service

**`src/services/auth.service.ts`:**
```typescript
import { ethers } from 'ethers';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database';

export class AuthService {
  private nonces = new Map<string, string>();

  generateNonce(walletAddress: string): string {
    const nonce = `Sign this message to authenticate: ${Date.now()}`;
    this.nonces.set(walletAddress.toLowerCase(), nonce);
    
    // Expire nonce after 5 minutes
    setTimeout(() => this.nonces.delete(walletAddress.toLowerCase()), 5 * 60 * 1000);
    
    return nonce;
  }

  async verifySignature(
    walletAddress: string,
    signature: string
  ): Promise<{ token: string; user: any }> {
    const nonce = this.nonces.get(walletAddress.toLowerCase());
    
    if (!nonce) {
      throw new Error('Nonce not found or expired');
    }

    // Verify signature
    const recoveredAddress = ethers.verifyMessage(nonce, signature);
    
    if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
      throw new Error('Invalid signature');
    }

    // Delete used nonce
    this.nonces.delete(walletAddress.toLowerCase());

    // Get or create user
    let user = await prisma.user.findUnique({
      where: { walletAddress: walletAddress.toLowerCase() },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          walletAddress: walletAddress.toLowerCase(),
          displayName: `User ${walletAddress.slice(0, 6)}`,
          role: 'both',
        },
      });
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, walletAddress: user.walletAddress },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    return { token, user };
  }
}
```

---

### Blockchain Service

**`src/services/blockchain.service.ts`:**
```typescript
import { ethers } from 'ethers';
import { prisma } from '../config/database';
import escrowABI from '../../contracts/Escrow.json';

export class BlockchainService {
  private provider: ethers.JsonRpcProvider;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
  }

  async verifyTransaction(txHash: string, expectedAmount: string): Promise<boolean> {
    const tx = await this.provider.getTransaction(txHash);
    const receipt = await tx?.wait();

    if (!receipt || receipt.status !== 1) {
      return false;
    }

    // Verify amount
    const actualAmount = ethers.formatEther(tx!.value);
    return actualAmount === expectedAmount;
  }

  async getEscrowDetails(contractAddress: string) {
    const contract = new ethers.Contract(
      contractAddress,
      escrowABI.abi,
      this.provider
    );

    return await contract.getDetails();
  }

  async pollEvents(fromBlock: number, toBlock: number) {
    const milestones = await prisma.milestone.findMany({
      where: {
        escrowContractAddress: { not: null },
        status: { in: ['funded', 'submitted', 'approved'] },
      },
    });

    for (const milestone of milestones) {
      const contract = new ethers.Contract(
        milestone.escrowContractAddress!,
        escrowABI.abi,
        this.provider
      );

      const events = await contract.queryFilter('*', fromBlock, toBlock);

      for (const event of events) {
        await this.processEvent(event, milestone.id);
      }
    }
  }

  private async processEvent(event: any, milestoneId: string) {
    const block = await event.getBlock();
    const tx = await event.getTransaction();

    // Check if already processed
    const exists = await prisma.escrowTransaction.findUnique({
      where: { transactionHash: tx.hash },
    });

    if (exists) return;

    const eventTypeMap: Record<string, string> = {
      EscrowCreated: 'created',
      EscrowFunded: 'funded',
      EscrowReleased: 'released',
      EscrowRefunded: 'refunded',
    };

    const eventType = eventTypeMap[event.eventName || ''];
    if (!eventType) return;

    // Create transaction record
    await prisma.escrowTransaction.create({
      data: {
        milestoneId,
        transactionHash: tx.hash,
        eventType: eventType as any,
        fromAddress: tx.from,
        amount: ethers.formatEther(event.args?.amount || tx.value),
        blockNumber: BigInt(block.number),
        timestamp: new Date(block.timestamp * 1000),
      },
    });

    // Update milestone status
    await this.updateMilestoneStatus(milestoneId, eventType);
  }

  private async updateMilestoneStatus(milestoneId: string, eventType: string) {
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
}
```

---

### Authentication Middleware

**`src/middleware/auth.middleware.ts`:**
```typescript
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    walletAddress: string;
  };
}

export function authenticateJWT(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    req.user = {
      userId: decoded.userId,
      walletAddress: decoded.walletAddress,
    };
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
```

---

### Event Poller Worker

**`src/workers/event-poller.ts`:**
```typescript
import { BlockchainService } from '../services/blockchain.service';

const blockchainService = new BlockchainService();
const POLLING_INTERVAL = 15000; // 15 seconds
let lastProcessedBlock = 0;

async function pollEvents() {
  try {
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
    const currentBlock = await provider.getBlockNumber();

    if (lastProcessedBlock === 0) {
      lastProcessedBlock = currentBlock - 100;
    }

    await blockchainService.pollEvents(lastProcessedBlock + 1, currentBlock);
    lastProcessedBlock = currentBlock;

    console.log(`✅ Processed blocks ${lastProcessedBlock + 1} to ${currentBlock}`);
  } catch (error) {
    console.error('❌ Error polling events:', error);
  }

  setTimeout(pollEvents, POLLING_INTERVAL);
}

export function startEventPoller() {
  console.log('🔄 Starting event poller...');
  pollEvents();
}
```

---

### Main Application

**`src/index.ts`:**
```typescript
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { startEventPoller } from './workers/event-poller';

// Import routes
import authRoutes from './routes/auth.routes';
import jobsRoutes from './routes/jobs.routes';
import proposalsRoutes from './routes/proposals.routes';
import projectsRoutes from './routes/projects.routes';
import milestonesRoutes from './routes/milestones.routes';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN }));
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
});
app.use(limiter);

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/jobs', jobsRoutes);
app.use('/api/v1/proposals', proposalsRoutes);
app.use('/api/v1/projects', projectsRoutes);
app.use('/api/v1/milestones', milestonesRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler
app.use((err: any, req: any, res: any, next: any) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    code: err.code || 'INTERNAL_ERROR',
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  
  // Start background workers
  if (process.env.NODE_ENV !== 'test') {
    startEventPoller();
  }
});

export default app;
```

---

## Package.json Scripts

**`package.json`:**
```json
{
  "scripts": {
    "dev": "nodemon --exec ts-node src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev",
    "prisma:seed": "ts-node prisma/seed.ts",
    "prisma:studio": "prisma studio",
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

---

## Testing

### Unit Test Example

**`tests/unit/auth.service.test.ts`:**
```typescript
import { AuthService } from '../../src/services/auth.service';
import { ethers } from 'ethers';

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService();
  });

  it('should generate nonce', () => {
    const nonce = authService.generateNonce('0x1234...');
    expect(nonce).toContain('Sign this message');
  });

  it('should verify valid signature', async () => {
    const wallet = ethers.Wallet.createRandom();
    const nonce = authService.generateNonce(wallet.address);
    const signature = await wallet.signMessage(nonce);

    const result = await authService.verifySignature(wallet.address, signature);
    expect(result.token).toBeDefined();
    expect(result.user).toBeDefined();
  });
});
```

---

## Deployment

### 1. Database Setup

```bash
# Production database
DATABASE_URL="postgresql://user:pass@prod-db.com:5432/chainlance"

# Run migrations
npx prisma migrate deploy
```

### 2. Build Application

```bash
npm run build
```

### 3. Deploy to Cloud (Example: Railway/Render)

```yaml
# railway.toml
[build]
builder = "NIXPACKS"

[deploy]
startCommand = "npm start"
healthcheckPath = "/health"

[[services]]
name = "api"
```

### 4. Environment Variables

Set all required env vars in deployment platform.

---

## Monitoring

### Add Logging

```typescript
import winston from 'winston';

export const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}
```

---

## Security Checklist

- [x] JWT secret is strong and stored securely
- [x] CORS configured for specific origins
- [x] Rate limiting enabled
- [x] Helmet.js for security headers
- [x] Input validation with Zod
- [x] SQL injection prevention (Prisma)
- [x] Transaction verification before database updates
- [x] Wallet signature validation
- [x] Error messages don't leak sensitive info

---

## Next Steps

1. Implement remaining controllers (jobs, proposals, etc.)
2. Add comprehensive input validation
3. Write integration tests
4. Set up CI/CD pipeline
5. Add monitoring (Sentry/DataDog)
6. Deploy to staging environment
7. Perform security audit
8. Deploy to production

---

## Resources

- [Prisma Documentation](https://www.prisma.io/docs)
- [Ethers.js Documentation](https://docs.ethers.org/v6/)
- [Express Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)

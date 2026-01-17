# ChainLance API Workflows & Design

## 1. Architecture Choice: Frontend-Initiated, Backend-Validated

For ChainLance, we use a **Frontend-Initiated, Backend-Validated** approach for blockchain interactions.

**Justification:**
- **Security**: The backend never handles private keys, minimizing the risk of asset theft.
- **Gas Costs**: Users pay for their own transactions directly via their wallets (MetaMask, etc.).
- **User Agency**: Users maintain full control over their funds as per decentralized principles.
- **Backend Role**: The backend coordinates off-chain metadata (job descriptions, user profiles), provides a fast discovery layer (search/filtering), and monitors the blockchain to synchronize state.

---

## 1.1 Technical Constraints & Standards

### Rate Limiting
- **Global Limit**: 100 requests per 15 minutes per IP.
- **Auth Limit**: 5 login attempts per minute.
- **Headers**: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`.

### Pagination
- **Standard**: Cursor-based pagination for feeds (Jobs, Proposals).
- **Query Params**: `?limit=20&cursor=timestamp_id`.
- **Response Wrapper**:
  ```json
  {
    "data": [...],
    "meta": {
      "nextCursor": "...",
      "hasMore": true
    }
  }
  ```

---

## 2. Endpoint List

### Authentication
1. `POST /api/v1/auth/nonce`: Returns a unique nonce for signing.
2. `POST /api/v1/auth/login`: Verifies signed nonce and returns a JWT.

### User Profiles
3. `GET /api/v1/users/{wallet_address}`: Public profile view.
4. `PATCH /api/v1/users/me`: Update current user profile.

### Job Management
5. `GET /api/v1/jobs`: List/search jobs (filters: status, skill, budget).
6. `POST /api/v1/jobs`: Post a new job.
7. `GET /api/v1/jobs/{id}`: Detailed job view.

### Proposals
8. `POST /api/v1/jobs/{id}/proposals`: Submit a proposal.
9. `GET /api/v1/jobs/{id}/proposals`: List proposals for a job (Client only).
10. `PATCH /api/v1/proposals/{id}`: Accept/Reject/Withdraw proposal.

### Escrow & Payments
11. `POST /api/v1/escrow/prepare`: Generate data needed for contract call (e.g., job hash).
12. `POST /api/v1/escrow/sync`: Submit TX Hash to backend to start monitoring.
13. `GET /api/v1/escrow/{id}`: View escrow status (Blockchain + DB sync).
14. `POST /api/v1/escrow/{id}/release`: Trigger release workflow (updates DB status).

### Feedback
15. `POST /api/v1/reviews`: Submit review for completed project.

### System & Webhooks
16. `POST /api/v1/webhooks/blockchain`: Receive event notifications (protected by secret signature).

---

## 3. Workflow Diagrams

### Workflow: Hiring & Funding Escrow
This workflow handles the transition from a Proposal to an Active Contract.

```text
[Frontend] --(POST /proposals/{id}/accept)--> [Backend API]
                                                    | 1. DB: Set Proposal = ACCEPTED
                                                    | 2. DB: Set Job = HIRED
                                                    | 3. Returns { jobId, deadline, amount }
                                                    V
[Frontend] --(Contract.createEscrow(...))----> [Blockchain]
                                                    | 4. User signs & broadcasts TX
                                                    V
[Frontend] --(POST /escrow/sync {txHash})----> [Backend API]
                                                    | 5. DB: Set Escrow = PENDING_CONFIRMATION
                                                    | 6. Listener monitors for Confirmations
                                                    | 7. DB: Set Escrow = FUNDED
                                                    V
                                               [Status Updated]
```

### Workflow: Job Completion & Payment Release
```text
[Freelancer] --(POST /jobs/{id}/deliver)-----> [Backend API]
                                                    | DB: Set Status = UNDER_REVIEW
                                                    V
[Client] --(Contract.releasePayment(...))----> [Blockchain]
                                                    | User signs & broadcasts TX
                                                    V
[Frontend] --(POST /escrow/sync {txHash})----> [Backend API]
                                                    | DB: Set Escrow = RELEASED
                                                    | DB: Set Job = COMPLETED
                                                    V
                                               [Final Success]
```

---

## 4. Request-Response Examples

### POST `/api/v1/auth/login`
**Request:**
```json
{
  "address": "0x123...abc",
  "signature": "0x456...def",
  "nonce": "unique-random-string"
}
```
**Response:**
```json
{
  "token": "eyJhbGci...",
  "user": {
    "id": "user_123",
    "address": "0x123...abc",
    "role": "FREELANCER"
  }
}
```

### POST `/api/v1/escrow/sync`
**Request:**
```json
{
  "entityId": "escrow_789",
  "txHash": "0x789...ghi",
  "action": "FUND_ESCROW"
}
```
**Response:**
```json
{
  "status": "MONITORING",
  "message": "Transaction 0x789... is being tracked. DB will update upon 1 confirmation."
}
```

---

## 5. Error Handling & Idempotency

### Idempotency Strategy
All state-changing requests (`POST`, `PATCH`) must include an `X-Idempotency-Key` in the header.

**Specific Case: Proposal Approval**
To prevent multiple escrow creation for the same job:
1. **Request**: `PATCH /api/v1/proposals/{id}` with `status: "ACCEPTED"`.
2. **Backend Logic**:
   - Check if the Job already has an accepted proposal.
   - If yes, return `409 Conflict` (or return the existing accepted proposal if the key matches).
   - If no, atomically update Job and Proposal status.
3. **Database**: Store keys in a cache (e.g., Redis) or a dedicated table to ensure that even if the network fails, the retry results in the same outcome.

### Failure Scenarios
1. **Blockchain Revert**: If the synced `txHash` reverts, the Backend marks the escrow as `FAILED_ON_CHAIN` and notifies the client to retry.
2. **Missing Sync**: If a transaction is mined but the frontend fails to call `/sync`, a periodic **Blockchain Indexer** script scans the Escrow contract events to catch missed updates.
3. **Stateless API Failures**: Since APIs are stateless, any partial failure in the "Accept Proposal" -> "Fund Escrow" pipeline can be safely resumed as long as the Proposal state in the DB tracks `WAITING_FOR_ESCROW`.

### Standard Error Response
```json
{
  "error": "INSUFFICIENT_FUNDS",
  "message": "Escrow funding requires exactly 1.5 ETH.",
  "code": 400
}
```

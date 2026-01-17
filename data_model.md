# Backend Data Model Design

## Overview

This document defines the database schema for a freelance marketplace platform with blockchain escrow integration. The design prioritizes simplicity, correctness, and traceability while supporting the complete lifecycle from job posting to milestone completion.

---

## Table Definitions

### 1. `users`

**Purpose:** Store user profiles for both clients and freelancers.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique user identifier |
| `wallet_address` | VARCHAR(42) | UNIQUE, NOT NULL | Ethereum wallet address (0x...) |
| `email` | VARCHAR(255) | UNIQUE, NULLABLE | Optional email for notifications |
| `display_name` | VARCHAR(100) | NOT NULL | User's display name |
| `role` | ENUM | NOT NULL | `client`, `freelancer`, or `both` |
| `bio` | TEXT | NULLABLE | User biography |
| `skills` | JSON | NULLABLE | Array of skill tags (freelancers) |
| `created_at` | TIMESTAMP | NOT NULL | Account creation time |
| `updated_at` | TIMESTAMP | NOT NULL | Last profile update |

**Justification:** Central identity table. Wallet address serves as the primary authentication mechanism. Role field allows users to act as both client and freelancer.

---

### 2. `jobs`

**Purpose:** Store job postings created by clients.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique job identifier |
| `client_id` | UUID | FOREIGN KEY → users(id), NOT NULL | Job creator |
| `title` | VARCHAR(200) | NOT NULL | Job title |
| `description` | TEXT | NOT NULL | Detailed job description |
| `budget` | DECIMAL(18,6) | NOT NULL | Total budget in ETH |
| `status` | ENUM | NOT NULL | `open`, `in_progress`, `completed`, `cancelled` |
| `required_skills` | JSON | NULLABLE | Array of required skill tags |
| `deadline` | TIMESTAMP | NULLABLE | Expected completion date |
| `created_at` | TIMESTAMP | NOT NULL | Job posting time |
| `updated_at` | TIMESTAMP | NOT NULL | Last modification time |

**Justification:** Represents work opportunities. Budget stored in ETH (DECIMAL for precision). Status tracks lifecycle. Jobs exist independently before proposals.

---

### 3. `proposals`

**Purpose:** Store freelancer applications to jobs.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique proposal identifier |
| `job_id` | UUID | FOREIGN KEY → jobs(id), NOT NULL | Target job |
| `freelancer_id` | UUID | FOREIGN KEY → users(id), NOT NULL | Proposing freelancer |
| `cover_letter` | TEXT | NOT NULL | Freelancer's pitch |
| `proposed_amount` | DECIMAL(18,6) | NOT NULL | Bid amount in ETH |
| `estimated_duration` | INTEGER | NULLABLE | Estimated days to complete |
| `status` | ENUM | NOT NULL | `pending`, `accepted`, `rejected`, `withdrawn` |
| `created_at` | TIMESTAMP | NOT NULL | Proposal submission time |
| `updated_at` | TIMESTAMP | NOT NULL | Last status change |

**Constraints:**
- UNIQUE(`job_id`, `freelancer_id`) — One proposal per freelancer per job

**Justification:** Connects freelancers to jobs. Multiple proposals can exist per job. Only one proposal can be accepted (triggers project creation).

---

### 4. `projects`

**Purpose:** Represents active work contracts between client and freelancer.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique project identifier |
| `job_id` | UUID | FOREIGN KEY → jobs(id), NOT NULL | Original job posting |
| `proposal_id` | UUID | FOREIGN KEY → proposals(id), UNIQUE, NOT NULL | Accepted proposal |
| `client_id` | UUID | FOREIGN KEY → users(id), NOT NULL | Hiring client |
| `freelancer_id` | UUID | FOREIGN KEY → users(id), NOT NULL | Hired freelancer |
| `total_amount` | DECIMAL(18,6) | NOT NULL | Total contract value (from proposal) |
| `status` | ENUM | NOT NULL | `active`, `completed`, `disputed`, `cancelled` |
| `started_at` | TIMESTAMP | NOT NULL | Project start time |
| `completed_at` | TIMESTAMP | NULLABLE | Project completion time |
| `updated_at` | TIMESTAMP | NOT NULL | Last status change |

**Justification:** Created when a proposal is accepted. Links back to both job and proposal for full traceability. Acts as the parent container for milestones.

---

### 5. `milestones`

**Purpose:** Break projects into payable work units with escrow contracts.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique milestone identifier |
| `project_id` | UUID | FOREIGN KEY → projects(id), NOT NULL | Parent project |
| `title` | VARCHAR(200) | NOT NULL | Milestone name |
| `description` | TEXT | NOT NULL | Deliverable description |
| `amount` | DECIMAL(18,6) | NOT NULL | Payment amount in ETH |
| `escrow_contract_address` | VARCHAR(42) | UNIQUE, NULLABLE | Deployed escrow contract address |
| `status` | ENUM | NOT NULL | `pending`, `funded`, `submitted`, `approved`, `paid`, `disputed`, `refunded` |
| `due_date` | TIMESTAMP | NULLABLE | Expected completion date |
| `submitted_at` | TIMESTAMP | NULLABLE | Freelancer submission time |
| `approved_at` | TIMESTAMP | NULLABLE | Client approval time |
| `created_at` | TIMESTAMP | NOT NULL | Milestone creation time |
| `updated_at` | TIMESTAMP | NOT NULL | Last status change |

**Constraints:**
- SUM(milestones.amount WHERE project_id = X) ≤ projects.total_amount (enforced at application level)

**Justification:** Core payment unit. Each milestone has its own escrow contract. Status transitions are tightly coupled with blockchain events. The `escrow_contract_address` provides direct linkage to on-chain state.

---

### 6. `escrow_transactions`

**Purpose:** Log all blockchain escrow events for audit and synchronization.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique transaction log ID |
| `milestone_id` | UUID | FOREIGN KEY → milestones(id), NOT NULL | Associated milestone |
| `transaction_hash` | VARCHAR(66) | UNIQUE, NOT NULL | Blockchain tx hash |
| `event_type` | ENUM | NOT NULL | `created`, `funded`, `released`, `refunded` |
| `from_address` | VARCHAR(42) | NOT NULL | Transaction sender |
| `amount` | DECIMAL(18,6) | NOT NULL | Transaction amount in ETH |
| `block_number` | BIGINT | NOT NULL | Block number |
| `timestamp` | TIMESTAMP | NOT NULL | Event timestamp |
| `created_at` | TIMESTAMP | NOT NULL | Database log time |

**Justification:** Immutable audit log of all escrow interactions. Enables reconciliation between off-chain database and on-chain state. Critical for dispute resolution.

---

### 7. `disputes`

**Purpose:** Handle conflicts between clients and freelancers.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique dispute identifier |
| `milestone_id` | UUID | FOREIGN KEY → milestones(id), NOT NULL | Disputed milestone |
| `raised_by` | UUID | FOREIGN KEY → users(id), NOT NULL | User who raised dispute |
| `reason` | TEXT | NOT NULL | Dispute description |
| `status` | ENUM | NOT NULL | `open`, `under_review`, `resolved_client`, `resolved_freelancer`, `resolved_split` |
| `resolution_notes` | TEXT | NULLABLE | Admin resolution explanation |
| `resolved_by` | UUID | FOREIGN KEY → users(id), NULLABLE | Admin who resolved |
| `created_at` | TIMESTAMP | NOT NULL | Dispute creation time |
| `resolved_at` | TIMESTAMP | NULLABLE | Resolution time |
| `updated_at` | TIMESTAMP | NOT NULL | Last status change |

**Justification:** Separate table for dispute management. Links to milestone (not project) for granular conflict resolution. Supports admin intervention.

---

### 8. `messages`

**Purpose:** Enable communication between clients and freelancers.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique message identifier |
| `project_id` | UUID | FOREIGN KEY → projects(id), NOT NULL | Conversation context |
| `sender_id` | UUID | FOREIGN KEY → users(id), NOT NULL | Message sender |
| `content` | TEXT | NOT NULL | Message text |
| `read_at` | TIMESTAMP | NULLABLE | When recipient read message |
| `created_at` | TIMESTAMP | NOT NULL | Message send time |

**Justification:** Simple messaging scoped to projects. No separate conversation table needed (project provides context). Supports read receipts.

---

## Relationships

```
users (1) ──< jobs (many)
  └─ client_id

users (1) ──< proposals (many)
  └─ freelancer_id

jobs (1) ──< proposals (many)
  └─ job_id

proposals (1) ── projects (1)
  └─ proposal_id [UNIQUE]

projects (1) ──< milestones (many)
  └─ project_id

milestones (1) ──< escrow_transactions (many)
  └─ milestone_id

milestones (1) ──< disputes (0..1)
  └─ milestone_id

projects (1) ──< messages (many)
  └─ project_id
```

### Key Relationship Rules

1. **Job → Proposal (1:N):** One job can receive multiple proposals
2. **Proposal → Project (1:1):** Only one accepted proposal creates a project
3. **Project → Milestone (1:N):** Projects are divided into milestones
4. **Milestone → Escrow Contract (1:1):** Each milestone has its own escrow
5. **Milestone → Dispute (1:0..1):** Milestones can optionally have disputes

---

## Enums and State Transitions

### Job Status

```
open → in_progress  (when proposal accepted)
open → cancelled    (client cancels)
in_progress → completed  (all milestones paid)
in_progress → cancelled  (mutual agreement)
```

### Proposal Status

```
pending → accepted   (client accepts)
pending → rejected   (client rejects)
pending → withdrawn  (freelancer withdraws)
```

### Project Status

```
active → completed  (all milestones approved & paid)
active → disputed   (any milestone disputed)
active → cancelled  (mutual cancellation)
disputed → completed (dispute resolved favorably)
disputed → cancelled (dispute resolved with refund)
```

### Milestone Status

```
pending → funded           (escrow contract funded)
funded → submitted         (freelancer submits work)
submitted → approved       (client approves)
approved → paid            (blockchain payment released)

submitted → disputed       (client raises dispute)
funded → disputed          (client raises dispute)
disputed → paid            (resolved for freelancer)
disputed → refunded        (resolved for client)

pending → refunded         (project cancelled before funding)
```

### Dispute Status

```
open → under_review           (admin starts review)
under_review → resolved_client      (refund to client)
under_review → resolved_freelancer  (release to freelancer)
under_review → resolved_split       (partial payment)
```

---

## Sample Data Flow

### Scenario: Job → Proposal → Project → Milestone

#### Step 1: Client Posts Job

```
INSERT INTO jobs:
  id: job-001
  client_id: user-client-1
  title: "Build React Dashboard"
  budget: 2.5 ETH
  status: open
```

#### Step 2: Freelancer Submits Proposal

```
INSERT INTO proposals:
  id: prop-001
  job_id: job-001
  freelancer_id: user-freelancer-1
  proposed_amount: 2.3 ETH
  status: pending
```

#### Step 3: Client Accepts Proposal

```
UPDATE proposals SET status = 'accepted' WHERE id = prop-001

INSERT INTO projects:
  id: proj-001
  job_id: job-001
  proposal_id: prop-001
  client_id: user-client-1
  freelancer_id: user-freelancer-1
  total_amount: 2.3 ETH
  status: active

UPDATE jobs SET status = 'in_progress' WHERE id = job-001
```

#### Step 4: Create Milestones

```
INSERT INTO milestones:
  id: mile-001
  project_id: proj-001
  title: "Design Phase"
  amount: 0.8 ETH
  status: pending

INSERT INTO milestones:
  id: mile-002
  project_id: proj-001
  title: "Development Phase"
  amount: 1.0 ETH
  status: pending

INSERT INTO milestones:
  id: mile-003
  project_id: proj-001
  title: "Testing & Deployment"
  amount: 0.5 ETH
  status: pending
```

#### Step 5: Client Funds First Milestone

```
// Smart contract deployed at 0xABC...
UPDATE milestones 
SET 
  escrow_contract_address = '0xABC...',
  status = 'funded'
WHERE id = mile-001

INSERT INTO escrow_transactions:
  milestone_id: mile-001
  transaction_hash: '0x123...'
  event_type: 'funded'
  from_address: '0x...(client)'
  amount: 0.8 ETH
```

#### Step 6: Freelancer Submits Work

```
UPDATE milestones SET status = 'submitted' WHERE id = mile-001
```

#### Step 7: Client Approves & Payment Released

```
UPDATE milestones 
SET 
  status = 'approved',
  approved_at = NOW()
WHERE id = mile-001

// Blockchain transaction triggers:
INSERT INTO escrow_transactions:
  milestone_id: mile-001
  transaction_hash: '0x456...'
  event_type: 'released'
  from_address: '0x...(escrow)'
  amount: 0.8 ETH

UPDATE milestones SET status = 'paid' WHERE id = mile-001
```

#### Step 8: Repeat for Remaining Milestones

Once all milestones reach `paid` status:

```
UPDATE projects SET status = 'completed' WHERE id = proj-001
UPDATE jobs SET status = 'completed' WHERE id = job-001
```

---

## Traceability: Milestone ↔ Contract Linkage

### How to Trace a Payment

Given a milestone ID `mile-001`:

1. **Get milestone details:**
   ```sql
   SELECT * FROM milestones WHERE id = 'mile-001'
   → escrow_contract_address: 0xABC...
   ```

2. **Get all blockchain events:**
   ```sql
   SELECT * FROM escrow_transactions 
   WHERE milestone_id = 'mile-001'
   ORDER BY timestamp
   ```

3. **Verify on-chain state:**
   - Query blockchain using `escrow_contract_address`
   - Compare on-chain balance/status with database `status`

4. **Trace back to project:**
   ```sql
   SELECT p.*, j.title 
   FROM milestones m
   JOIN projects p ON m.project_id = p.id
   JOIN jobs j ON p.job_id = j.id
   WHERE m.id = 'mile-001'
   ```

### Reconciliation Query

```sql
SELECT 
  m.id,
  m.title,
  m.amount,
  m.status AS db_status,
  m.escrow_contract_address,
  COUNT(et.id) AS transaction_count,
  SUM(CASE WHEN et.event_type = 'funded' THEN et.amount ELSE 0 END) AS total_funded,
  SUM(CASE WHEN et.event_type = 'released' THEN et.amount ELSE 0 END) AS total_released
FROM milestones m
LEFT JOIN escrow_transactions et ON m.id = et.milestone_id
WHERE m.project_id = 'proj-001'
GROUP BY m.id
```

---

## Database Constraints & Indexes

### Foreign Key Constraints

- All `*_id` fields have `ON DELETE RESTRICT` to prevent orphaned records
- Exception: `messages.sender_id` uses `ON DELETE SET NULL` (preserve history)

### Indexes

```
users:
  - UNIQUE(wallet_address)
  - INDEX(role)

jobs:
  - INDEX(client_id, status)
  - INDEX(created_at)

proposals:
  - UNIQUE(job_id, freelancer_id)
  - INDEX(freelancer_id, status)

projects:
  - UNIQUE(proposal_id)
  - INDEX(client_id, status)
  - INDEX(freelancer_id, status)

milestones:
  - UNIQUE(escrow_contract_address) WHERE NOT NULL
  - INDEX(project_id, status)

escrow_transactions:
  - UNIQUE(transaction_hash)
  - INDEX(milestone_id, timestamp)

disputes:
  - INDEX(milestone_id)
  - INDEX(status, created_at)

messages:
  - INDEX(project_id, created_at)
  - INDEX(sender_id)
```

---

## API Design Considerations

### REST Endpoints (Conceptual)

#### Jobs
- `POST /api/jobs` — Create job
- `GET /api/jobs` — List jobs (filter by status)
- `GET /api/jobs/:id` — Get job details
- `PATCH /api/jobs/:id` — Update job
- `DELETE /api/jobs/:id` — Cancel job

#### Proposals
- `POST /api/jobs/:jobId/proposals` — Submit proposal
- `GET /api/jobs/:jobId/proposals` — List proposals for job
- `PATCH /api/proposals/:id/accept` — Accept proposal (creates project)
- `PATCH /api/proposals/:id/reject` — Reject proposal

#### Projects
- `GET /api/projects` — List user's projects
- `GET /api/projects/:id` — Get project details
- `POST /api/projects/:id/milestones` — Create milestone
- `PATCH /api/projects/:id/cancel` — Cancel project

#### Milestones
- `GET /api/milestones/:id` — Get milestone details
- `PATCH /api/milestones/:id/fund` — Record funding (after blockchain tx)
- `PATCH /api/milestones/:id/submit` — Submit work
- `PATCH /api/milestones/:id/approve` — Approve work (triggers blockchain release)

#### Disputes
- `POST /api/milestones/:id/disputes` — Raise dispute
- `GET /api/disputes` — List disputes (admin)
- `PATCH /api/disputes/:id/resolve` — Resolve dispute

#### Escrow Transactions
- `POST /api/escrow-transactions` — Log blockchain event (webhook/polling)
- `GET /api/milestones/:id/transactions` — Get transaction history

---

## Security & Validation Rules

### Application-Level Validations

1. **Proposal acceptance:**
   - Only job owner can accept
   - Job must be in `open` status
   - Only one proposal can be accepted per job

2. **Milestone creation:**
   - Only project participants can create
   - Sum of milestone amounts ≤ project total_amount

3. **Milestone funding:**
   - Only client can fund
   - Must verify blockchain transaction before updating status

4. **Work submission:**
   - Only freelancer can submit
   - Milestone must be in `funded` status

5. **Work approval:**
   - Only client can approve
   - Milestone must be in `submitted` status

6. **Dispute raising:**
   - Only project participants can raise
   - Milestone must be in `funded` or `submitted` status

---

## Why Each Table Exists

| Table | Justification |
|-------|---------------|
| `users` | Central identity; wallet-based authentication |
| `jobs` | Represents work opportunities; exists before any proposals |
| `proposals` | Connects freelancers to jobs; supports competitive bidding |
| `projects` | Active contract between two parties; parent for milestones |
| `milestones` | Payable work units; 1:1 with escrow contracts |
| `escrow_transactions` | Immutable audit log; reconciliation with blockchain |
| `disputes` | Conflict resolution; supports admin intervention |
| `messages` | Communication channel; scoped to projects |

---

## Assumptions & Limitations

### Assumptions
- One currency: ETH (no multi-token support)
- One blockchain network per deployment (testnet or mainnet)
- Disputes require manual admin resolution (no automated arbitration)
- Milestones are created upfront (no dynamic addition after project start)

### Limitations
- No reputation/rating system (future enhancement)
- No file attachments (would require separate `attachments` table)
- No project templates or recurring jobs
- No multi-party projects (always 1 client + 1 freelancer)

---

## Future Enhancements

1. **Ratings Table:**
   ```
   ratings(id, project_id, from_user_id, to_user_id, score, comment)
   ```

2. **Attachments Table:**
   ```
   attachments(id, milestone_id, file_url, uploaded_by, created_at)
   ```

3. **Notifications Table:**
   ```
   notifications(id, user_id, type, reference_id, read_at, created_at)
   ```

4. **Skills Table (Normalized):**
   ```
   skills(id, name)
   user_skills(user_id, skill_id)
   job_skills(job_id, skill_id)
   ```

---

## Conclusion

This data model provides:
✅ **Traceability:** Full audit trail from job → proposal → project → milestone → escrow  
✅ **Correctness:** Enforced state transitions and foreign key constraints  
✅ **Simplicity:** No over-engineering; 8 core tables  
✅ **Blockchain Integration:** Direct linkage via `escrow_contract_address` and transaction logs  
✅ **Dispute Handling:** Separate dispute workflow with admin resolution

The design is production-ready for PostgreSQL or MySQL with standard REST APIs.

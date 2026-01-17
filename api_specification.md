# REST API Specification

## Overview

Complete REST API specification for ChainLance freelance marketplace backend.

**Base URL:** `/api/v1`  
**Authentication:** JWT Bearer Token (from wallet signature)  
**Content-Type:** `application/json`

---

## Authentication

### POST `/auth/nonce`

Get a nonce for wallet signature.

**Request:**
```json
{
  "walletAddress": "0x1234..."
}
```

**Response:**
```json
{
  "nonce": "Sign this message to authenticate: 1234567890"
}
```

---

### POST `/auth/verify`

Verify signature and get JWT token.

**Request:**
```json
{
  "walletAddress": "0x1234...",
  "signature": "0xabcdef..."
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "walletAddress": "0x1234...",
    "displayName": "Alice",
    "role": "client"
  }
}
```

---

## Users

### GET `/users/me`

Get current user profile.

**Auth Required:** Yes

**Response:**
```json
{
  "id": "uuid",
  "walletAddress": "0x1234...",
  "email": "alice@example.com",
  "displayName": "Alice Johnson",
  "role": "client",
  "bio": "Startup founder...",
  "skills": ["React", "Node.js"],
  "createdAt": "2024-01-01T00:00:00Z"
}
```

---

### PATCH `/users/me`

Update current user profile.

**Auth Required:** Yes

**Request:**
```json
{
  "displayName": "Alice J.",
  "email": "newemail@example.com",
  "bio": "Updated bio",
  "skills": ["React", "TypeScript"]
}
```

**Response:** Same as GET `/users/me`

---

### GET `/users/:walletAddress`

Get public user profile.

**Auth Required:** No

**Response:**
```json
{
  "walletAddress": "0x1234...",
  "displayName": "Alice Johnson",
  "role": "client",
  "bio": "Startup founder...",
  "skills": ["React", "Node.js"],
  "createdAt": "2024-01-01T00:00:00Z"
}
```

---

## Jobs

### POST `/jobs`

Create a new job posting.

**Auth Required:** Yes (client or both)

**Request:**
```json
{
  "title": "Build React Dashboard",
  "description": "Need a modern admin dashboard...",
  "budget": 2.5,
  "requiredSkills": ["React", "TypeScript"],
  "deadline": "2024-12-31T23:59:59Z"
}
```

**Response:**
```json
{
  "id": "uuid",
  "clientId": "uuid",
  "title": "Build React Dashboard",
  "description": "Need a modern admin dashboard...",
  "budget": 2.5,
  "status": "open",
  "requiredSkills": ["React", "TypeScript"],
  "deadline": "2024-12-31T23:59:59Z",
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

**Validation:**
- `title`: 1-200 chars
- `description`: min 50 chars
- `budget`: > 0
- `requiredSkills`: array of strings

---

### GET `/jobs`

List all jobs with filtering.

**Auth Required:** No

**Query Parameters:**
- `status` - Filter by status (open, in_progress, completed, cancelled)
- `clientId` - Filter by client
- `skills` - Comma-separated skills
- `minBudget` - Minimum budget
- `maxBudget` - Maximum budget
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20, max: 100)

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "clientId": "uuid",
      "client": {
        "walletAddress": "0x1234...",
        "displayName": "Alice"
      },
      "title": "Build React Dashboard",
      "description": "Need a modern...",
      "budget": 2.5,
      "status": "open",
      "requiredSkills": ["React"],
      "deadline": "2024-12-31T23:59:59Z",
      "proposalCount": 5,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

---

### GET `/jobs/:id`

Get job details.

**Auth Required:** No

**Response:**
```json
{
  "id": "uuid",
  "clientId": "uuid",
  "client": {
    "walletAddress": "0x1234...",
    "displayName": "Alice",
    "bio": "Startup founder..."
  },
  "title": "Build React Dashboard",
  "description": "Full description...",
  "budget": 2.5,
  "status": "open",
  "requiredSkills": ["React", "TypeScript"],
  "deadline": "2024-12-31T23:59:59Z",
  "proposalCount": 5,
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

---

### PATCH `/jobs/:id`

Update job (only if no proposals accepted).

**Auth Required:** Yes (job owner)

**Request:**
```json
{
  "title": "Updated title",
  "description": "Updated description",
  "budget": 3.0,
  "deadline": "2024-12-31T23:59:59Z"
}
```

**Response:** Updated job object

**Error (409):**
```json
{
  "error": "Cannot update job with accepted proposals"
}
```

---

### DELETE `/jobs/:id`

Cancel job.

**Auth Required:** Yes (job owner)

**Response:**
```json
{
  "message": "Job cancelled successfully"
}
```

**Business Rules:**
- Can only cancel if status is `open`
- Sets status to `cancelled`

---

## Proposals

### POST `/jobs/:jobId/proposals`

Submit a proposal.

**Auth Required:** Yes (freelancer or both)

**Request:**
```json
{
  "coverLetter": "I have 5 years of experience...",
  "proposedAmount": 2.3,
  "estimatedDuration": 21
}
```

**Response:**
```json
{
  "id": "uuid",
  "jobId": "uuid",
  "freelancerId": "uuid",
  "coverLetter": "I have 5 years...",
  "proposedAmount": 2.3,
  "estimatedDuration": 21,
  "status": "pending",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

**Validation:**
- `coverLetter`: min 100 chars
- `proposedAmount`: > 0
- `estimatedDuration`: optional, > 0

**Error (409):**
```json
{
  "error": "You have already submitted a proposal for this job"
}
```

---

### GET `/jobs/:jobId/proposals`

List proposals for a job.

**Auth Required:** Yes (job owner only)

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "jobId": "uuid",
      "freelancerId": "uuid",
      "freelancer": {
        "walletAddress": "0x2345...",
        "displayName": "Bob Smith",
        "skills": ["React", "Node.js"],
        "bio": "Full-stack developer..."
      },
      "coverLetter": "I have 5 years...",
      "proposedAmount": 2.3,
      "estimatedDuration": 21,
      "status": "pending",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

---

### GET `/proposals/my-proposals`

Get current user's proposals.

**Auth Required:** Yes (freelancer)

**Query Parameters:**
- `status` - Filter by status
- `page`, `limit` - Pagination

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "job": {
        "id": "uuid",
        "title": "Build React Dashboard",
        "budget": 2.5,
        "status": "open"
      },
      "proposedAmount": 2.3,
      "estimatedDuration": 21,
      "status": "pending",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {...}
}
```

---

### PATCH `/proposals/:id/accept`

Accept a proposal (creates project).

**Auth Required:** Yes (job owner)

**Response:**
```json
{
  "proposal": {
    "id": "uuid",
    "status": "accepted"
  },
  "project": {
    "id": "uuid",
    "jobId": "uuid",
    "proposalId": "uuid",
    "clientId": "uuid",
    "freelancerId": "uuid",
    "totalAmount": 2.3,
    "status": "active",
    "startedAt": "2024-01-01T00:00:00Z"
  }
}
```

**Side Effects:**
- Creates new project
- Updates proposal status to `accepted`
- Updates job status to `in_progress`
- Rejects all other proposals

---

### PATCH `/proposals/:id/reject`

Reject a proposal.

**Auth Required:** Yes (job owner)

**Response:**
```json
{
  "id": "uuid",
  "status": "rejected",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

---

### PATCH `/proposals/:id/withdraw`

Withdraw a proposal.

**Auth Required:** Yes (proposal owner)

**Response:**
```json
{
  "id": "uuid",
  "status": "withdrawn",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

**Error (400):**
```json
{
  "error": "Cannot withdraw accepted proposal"
}
```

---

## Projects

### GET `/projects`

List user's projects.

**Auth Required:** Yes

**Query Parameters:**
- `status` - Filter by status
- `role` - Filter by user role (client/freelancer)
- `page`, `limit` - Pagination

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "job": {
        "id": "uuid",
        "title": "Build React Dashboard"
      },
      "client": {
        "walletAddress": "0x1234...",
        "displayName": "Alice"
      },
      "freelancer": {
        "walletAddress": "0x2345...",
        "displayName": "Bob"
      },
      "totalAmount": 2.3,
      "status": "active",
      "milestonesSummary": {
        "total": 3,
        "completed": 1,
        "totalPaid": 0.8
      },
      "startedAt": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {...}
}
```

---

### GET `/projects/:id`

Get project details.

**Auth Required:** Yes (project participant)

**Response:**
```json
{
  "id": "uuid",
  "jobId": "uuid",
  "proposalId": "uuid",
  "job": {
    "id": "uuid",
    "title": "Build React Dashboard",
    "description": "Full description..."
  },
  "client": {
    "id": "uuid",
    "walletAddress": "0x1234...",
    "displayName": "Alice"
  },
  "freelancer": {
    "id": "uuid",
    "walletAddress": "0x2345...",
    "displayName": "Bob"
  },
  "totalAmount": 2.3,
  "status": "active",
  "milestones": [
    {
      "id": "uuid",
      "title": "Design Phase",
      "amount": 0.8,
      "status": "paid"
    }
  ],
  "startedAt": "2024-01-01T00:00:00Z",
  "completedAt": null
}
```

---

### POST `/projects/:id/milestones`

Create a milestone.

**Auth Required:** Yes (project participant)

**Request:**
```json
{
  "title": "Design Phase",
  "description": "Complete UI/UX design",
  "amount": 0.8,
  "dueDate": "2024-02-01T00:00:00Z"
}
```

**Response:**
```json
{
  "id": "uuid",
  "projectId": "uuid",
  "title": "Design Phase",
  "description": "Complete UI/UX design",
  "amount": 0.8,
  "status": "pending",
  "dueDate": "2024-02-01T00:00:00Z",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

**Validation:**
- Sum of all milestone amounts ≤ project total_amount

**Error (400):**
```json
{
  "error": "Total milestone amount exceeds project budget"
}
```

---

### PATCH `/projects/:id/cancel`

Cancel a project.

**Auth Required:** Yes (both parties must agree)

**Request:**
```json
{
  "reason": "Mutual agreement to cancel"
}
```

**Response:**
```json
{
  "message": "Project cancelled successfully"
}
```

**Business Rules:**
- Can only cancel if no milestones are funded
- Requires confirmation from both parties (implementation specific)

---

## Milestones

### GET `/milestones/:id`

Get milestone details.

**Auth Required:** Yes (project participant)

**Response:**
```json
{
  "id": "uuid",
  "projectId": "uuid",
  "title": "Design Phase",
  "description": "Complete UI/UX design",
  "amount": 0.8,
  "escrowContractAddress": "0xabcd...",
  "status": "funded",
  "dueDate": "2024-02-01T00:00:00Z",
  "submittedAt": null,
  "approvedAt": null,
  "transactions": [
    {
      "id": "uuid",
      "transactionHash": "0x1234...",
      "eventType": "funded",
      "amount": 0.8,
      "timestamp": "2024-01-01T00:00:00Z"
    }
  ],
  "createdAt": "2024-01-01T00:00:00Z"
}
```

---

### PATCH `/milestones/:id/fund`

Record milestone funding (after blockchain tx).

**Auth Required:** Yes (client)

**Request:**
```json
{
  "escrowContractAddress": "0xabcd...",
  "transactionHash": "0x1234..."
}
```

**Response:**
```json
{
  "id": "uuid",
  "status": "funded",
  "escrowContractAddress": "0xabcd...",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

**Side Effects:**
- Creates escrow_transaction record
- Updates milestone status to `funded`

**Validation:**
- Verifies transaction on blockchain
- Checks transaction amount matches milestone amount

---

### PATCH `/milestones/:id/submit`

Submit milestone work.

**Auth Required:** Yes (freelancer)

**Request:**
```json
{
  "deliverableNotes": "Design files are ready for review"
}
```

**Response:**
```json
{
  "id": "uuid",
  "status": "submitted",
  "submittedAt": "2024-01-15T00:00:00Z"
}
```

---

### PATCH `/milestones/:id/approve`

Approve milestone (triggers payment release).

**Auth Required:** Yes (client)

**Request:**
```json
{
  "feedback": "Great work!"
}
```

**Response:**
```json
{
  "id": "uuid",
  "status": "approved",
  "approvedAt": "2024-01-16T00:00:00Z"
}
```

**Side Effects:**
- Initiates blockchain transaction to release funds
- Status will update to `paid` after blockchain confirmation

---

## Disputes

### POST `/milestones/:id/disputes`

Raise a dispute.

**Auth Required:** Yes (project participant)

**Request:**
```json
{
  "reason": "Deliverables do not match requirements"
}
```

**Response:**
```json
{
  "id": "uuid",
  "milestoneId": "uuid",
  "raisedBy": "uuid",
  "reason": "Deliverables do not match...",
  "status": "open",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

**Side Effects:**
- Updates milestone status to `disputed`
- Locks escrow contract (no release until resolved)

---

### GET `/disputes`

List all disputes (admin only).

**Auth Required:** Yes (admin)

**Query Parameters:**
- `status` - Filter by status
- `page`, `limit` - Pagination

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "milestone": {
        "id": "uuid",
        "title": "Design Phase",
        "amount": 0.8
      },
      "project": {
        "id": "uuid",
        "client": {...},
        "freelancer": {...}
      },
      "raisedBy": "uuid",
      "reason": "...",
      "status": "open",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {...}
}
```

---

### PATCH `/disputes/:id/resolve`

Resolve a dispute (admin only).

**Auth Required:** Yes (admin)

**Request:**
```json
{
  "resolution": "resolved_freelancer",
  "resolutionNotes": "Evidence supports freelancer's work quality"
}
```

**Response:**
```json
{
  "id": "uuid",
  "status": "resolved_freelancer",
  "resolutionNotes": "Evidence supports...",
  "resolvedBy": "admin-uuid",
  "resolvedAt": "2024-01-20T00:00:00Z"
}
```

**Side Effects:**
- Updates milestone status based on resolution:
  - `resolved_client` → refund escrow
  - `resolved_freelancer` → release escrow
  - `resolved_split` → partial payment (custom logic)

---

## Escrow Transactions

### POST `/escrow-transactions`

Log a blockchain event (webhook/polling).

**Auth Required:** System only (internal)

**Request:**
```json
{
  "milestoneId": "uuid",
  "transactionHash": "0x1234...",
  "eventType": "released",
  "fromAddress": "0xabcd...",
  "amount": 0.8,
  "blockNumber": 12345678,
  "timestamp": "2024-01-01T00:00:00Z"
}
```

**Response:**
```json
{
  "id": "uuid",
  "milestoneId": "uuid",
  "transactionHash": "0x1234...",
  "eventType": "released",
  "amount": 0.8,
  "createdAt": "2024-01-01T00:00:00Z"
}
```

**Side Effects:**
- Updates milestone status based on event type

---

### GET `/milestones/:id/transactions`

Get transaction history for a milestone.

**Auth Required:** Yes (project participant)

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "transactionHash": "0x1234...",
      "eventType": "funded",
      "fromAddress": "0xabcd...",
      "amount": 0.8,
      "blockNumber": 12345678,
      "timestamp": "2024-01-01T00:00:00Z"
    },
    {
      "id": "uuid",
      "transactionHash": "0x5678...",
      "eventType": "released",
      "fromAddress": "0xefgh...",
      "amount": 0.8,
      "blockNumber": 12345789,
      "timestamp": "2024-01-16T00:00:00Z"
    }
  ]
}
```

---

## Messages

### GET `/projects/:projectId/messages`

Get messages for a project.

**Auth Required:** Yes (project participant)

**Query Parameters:**
- `before` - Get messages before this ID (pagination)
- `limit` - Items per page (default: 50, max: 100)

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "projectId": "uuid",
      "senderId": "uuid",
      "sender": {
        "walletAddress": "0x1234...",
        "displayName": "Alice"
      },
      "content": "Looking forward to working with you!",
      "readAt": "2024-01-01T00:00:00Z",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "hasMore": true
}
```

---

### POST `/projects/:projectId/messages`

Send a message.

**Auth Required:** Yes (project participant)

**Request:**
```json
{
  "content": "I have a question about the requirements..."
}
```

**Response:**
```json
{
  "id": "uuid",
  "projectId": "uuid",
  "senderId": "uuid",
  "content": "I have a question...",
  "readAt": null,
  "createdAt": "2024-01-01T00:00:00Z"
}
```

**Validation:**
- `content`: 1-5000 chars

---

### PATCH `/messages/:id/read`

Mark message as read.

**Auth Required:** Yes (project participant, not sender)

**Response:**
```json
{
  "id": "uuid",
  "readAt": "2024-01-01T00:00:00Z"
}
```

---

## Error Responses

### Standard Error Format

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {}
}
```

### HTTP Status Codes

- **200** - Success
- **201** - Created
- **400** - Bad Request (validation error)
- **401** - Unauthorized (no token or invalid token)
- **403** - Forbidden (insufficient permissions)
- **404** - Not Found
- **409** - Conflict (business rule violation)
- **422** - Unprocessable Entity (semantic error)
- **500** - Internal Server Error

### Error Examples

**400 Bad Request:**
```json
{
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": {
    "title": "Title must be 1-200 characters",
    "budget": "Budget must be greater than 0"
  }
}
```

**401 Unauthorized:**
```json
{
  "error": "Invalid or expired token",
  "code": "UNAUTHORIZED"
}
```

**403 Forbidden:**
```json
{
  "error": "You do not have permission to access this resource",
  "code": "FORBIDDEN"
}
```

**409 Conflict:**
```json
{
  "error": "You have already submitted a proposal for this job",
  "code": "DUPLICATE_PROPOSAL"
}
```

---

## Rate Limiting

- **Standard endpoints:** 100 requests/minute per IP
- **Auth endpoints:** 10 requests/minute per IP
- **Message endpoints:** 30 requests/minute per user

**Rate Limit Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1234567890
```

**Rate Limit Error (429):**
```json
{
  "error": "Too many requests",
  "code": "RATE_LIMIT_EXCEEDED",
  "retryAfter": 60
}
```

---

## Webhooks (Optional)

### Event Types

- `job.created`
- `proposal.submitted`
- `proposal.accepted`
- `project.created`
- `milestone.funded`
- `milestone.submitted`
- `milestone.approved`
- `milestone.paid`
- `dispute.created`
- `dispute.resolved`

### Webhook Payload

```json
{
  "event": "milestone.paid",
  "timestamp": "2024-01-01T00:00:00Z",
  "data": {
    "milestoneId": "uuid",
    "projectId": "uuid",
    "amount": 0.8
  }
}
```

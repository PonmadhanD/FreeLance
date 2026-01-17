# ChanceLance: Frontend Flow Design

This document outlines the UX logic and page structure for ChanceLance, focusing on trustless hiring, milestone tracking, and payment transparency.

## 1. Page List & Responsibilities

| Page Name | Responsibility | Key UI Elements |
|-----------|----------------|-----------------|
| **Marketplace** | Job discovery for freelancers. | Job grid, search/filter, "Connect Wallet" CTA. |
| **Post a Job** | Client interface to define work. | Form (Title, Budget, Milestones), "Create & Fund Escrow" button. |
| **Job Details** | Detailed job specs & applicant view. | Job description, Milestone list (Preview), "Apply" form for freelancers. |
| **My Projects** | High-level tracking of all active work. | "Active", "Pending", "Completed" tabs for both Clients and Freelancers. |
| **Project Workspace** | Real-time collaboration & finance hub. | Milestone Kanban, File sharing placeholder, Payment Status Ribbon, "Raise Dispute" button. |
| **Account/Wallet** | Wallet state and transaction history. | Transaction log, Balance details, Network status (Chain ID). |
| **Admin Panel** | Resolution center for disputed projects. | List of "Disputed" jobs, evidence viewer, "Refund" or "Pay" resolution buttons. |

---

## 2. User Interaction Flow

### A. The Hiring Flow (Client)
1. **Post Job**: Client enters details and predefined milestones.
2. **Review Proposals**: Client browses freelancer profiles and bids.
3. **Hire**: Client selects a freelancer. *System prompts wallet interaction to deposit full budget into Escrow.*
4. **Onboarding**: Project state moves from `Open` to `Active`.

### B. Milestone Execution (Freelancer)
1. **Start Work**: Freelancer picks a milestone from the Workspace.
2. **Submit for Review**: Freelancer marks milestone as "Completed" and optionally provides a link/metadata.
3. **Approval**: Client reviews work.
4. **Payment**: Client clicks "Release Funds". *System prompts contract call to transfer escrowed funds to freelancer.*

### C. Dispute Handling
1. **Initiate**: Either party clicks "Raise Dispute" in the Workspace if negotiations fail.
2. **Locked State**: Escrow funds are locked; milestone transitions are disabled.
3. **Admin Intervention**: Admin reviews the Workspace details and decides the outcome.

---

## 3. UI State Transitions & Payment Transparency

Payment state is visualized via a **"Trust Tracker"** (Status Ribbon) on the Workspace page.

| Payment State | UI Indicator | Visibility & Action |
|---------------|--------------|---------------------|
| **Draft** | Gray / Pulsing | Client only: Needs to fund escrow to activate job. |
| **Escrowed** | Green / Shield Icon | **Transparency**: Both see "Funds secured in Contract: `0x...`". |
| **Milestone Paid** | Blue / Checkmark | Visible in history. Amount deducted from "Total Escrowed". |
| **Disputed** | Orange / Warning Icon | Workspace locked. Notice: "Under Review by Admin". |
| **Released/Finalized**| Purple / Flag Icon | Project archived. Funds transferred. |

---

## 4. Loading & Error States

### Loading States
- **Wallet Connection**: Skeleton screens for job boards while checking `web3` provider.
- **Contract Interaction**: Full-page overlay with "Transaction Pending: Do not refresh" and a link to the Block Explorer (Etherscan/Polygonscan).
- **Data Fetching**: Ghost cards for the Marketplace and Project list.

### Error Handling
- **Insufficient Funds**: Modal warning during job funding if wallet balance < budget + gas.
- **Wrong Network**: Banner notification: "Please switch to Sepolia/Polygon to continue."
- **User Rejection**: Toast notification: "Transaction cancelled by user" if MetaMask dialog is closed.
- **Contract Revert**: High-visibility alert box with "Contract Error: [Reason]" and a "Retry" button.

---

## 5. Admin Workflow Logic

1. **Detection**: Admin dashboard receives a push notification/update when a job status = `DISPUTED`.
2. **Evidence**: Dashboard displays:
   - Original Job Description.
   - Milestone submission history.
   - Chat logs (if stored) or links to external evidence.
3. **Decision**: Admin has two primary buttons:
   - **[RESOLUTION: PAY FREELANCER]**: Calls contract to release specific milestone or full amount to freelancer address.
   - **[RESOLUTION: REFUND CLIENT]**: Calls contract to return remaining escrow to client address.
4. **Closure**: Project is marked `RESOLVED` and moved to history.

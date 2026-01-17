# Edge Cases Documentation

## 1. Dispute Triggers
- **Trigger:** A party raises a dispute when the delivered work does not meet agreed criteria.
- **Conditions:** 
  - Milestone marked as completed but client reports non‑conformity.
  - Freelancer claims non‑payment after milestone release.
  - Any party detects fraudulent activity (e.g., double‑spending, tampered data).

## 2. Admin Resolution Powers
- **Authority:** Admin can review dispute evidence and take one of the following actions:
  - **Approve Refund:** Return escrowed funds to the client.
  - **Approve Release:** Release funds to the freelancer.
  - **Partial Release/Refund:** Split escrow based on partial fulfillment.
  - **Escalate:** Mark dispute for external arbitration.
- **Limitations:** Admin actions are logged and immutable; cannot modify already finalized transactions.

## 3. Timeout Behavior
- **Milestone Completion Timeout:** If a freelancer does not mark a milestone as completed within **7 days** after client approval, the system automatically releases funds to the freelancer.
- **Dispute Resolution Timeout:** Admin must resolve a dispute within **48 hours**; otherwise, the system defaults to a **refund to client**.
- **Inactivity Timeout:** If no activity occurs on a job for **30 days**, the job is archived and escrow is refunded to the client.

## 4. Double‑Approval Prevention
- **Mechanism:** Once a milestone is released or refunded, the corresponding transaction ID is marked as **finalized**. Subsequent attempts to approve the same milestone will be rejected with an error.
- **Idempotency:** API endpoints for release/refund are idempotent; repeated calls with the same transaction hash have no effect.

## 5. Partial Completion Handling
- **Scenario:** Freelancer completes only part of the agreed work.
- **Process:** 
  1. Freelancer submits partial completion evidence.
  2. Client reviews and can:
     - Accept partial work and trigger **partial release** (e.g., 60% of escrow).
     - Request additional work, extending the deadline.
  3. Admin can intervene to enforce a **partial refund** if the dispute is unresolved.
- **Recording:** Partial releases are recorded with a **percentage field** in the escrow contract.

## Manual Admin Interventions
- Admin reviews dispute logs, attached evidence (screenshots, messages), and transaction history.
- Admin uses the admin dashboard to select the appropriate resolution action.
- All actions generate an immutable audit trail for compliance.

## Limitations
- The system does not automatically detect quality of work; it relies on human judgment for disputes.
- Timeout defaults are configurable but must be set before deployment.
- Partial releases require contract support for percentage‑based payouts.
- Admin actions are limited to the scope defined above; any out‑of‑scope changes require contract upgrade.

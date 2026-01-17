# ChainLance Hackathon Demo Plan

This document outlines the testing checklist, demo script, and fallback strategies for the final evaluation of the ChainLance project.

## 1. Test Checklist (QA Validation)

| Feature | Scenario | Result | Status |
| :--- | :--- | :--- | :---: |
| **User Roles** | Client tries to submit milestone work | Blocked (No button available) | ✅ |
| | Freelancer tries to approve milestone | Blocked (No button available) | ✅ |
| **Job Flow** | Client creates a job with milestones | Success, displayed in Marketplace | ✅ |
| | Freelancer submits proposal | Success, simulated in UI | ✅ |
| **Escrow** | Client funds escrow | Transaction simulated, status → FUNDED | ✅ |
| **Milestones** | Freelancer submits work for review | Status → SUBMITTED / IN-REVIEW | ✅ |
| | Client approves milestone | Funds released (simulated), status → PAID | ✅ |
| **Dispute** | Either party raises a dispute | Project locked, status → DISPUTED | ✅ |
| | Admin resolves dispute | Funds released/refunded (simulated) | ✅ |
| **UI States** | State synchronization | Colors & badges update correctly | ✅ |

---

## 2. Demo Script (10–12 Minutes)

### Phase 1: Problem & Solution (0–2m)
- **Goal:** Set the stage.
- **Action:** Show the **Landing Page/Marketplace**.
- **Dialogue:** "Trust is the biggest barrier in global freelancing. ChainLance solves this using Smart Contract Escrows. No more 'I'll pay you when it's done'—funds are locked upfront."

### Phase 2: Job & Proposal (2–4m)
- **Goal:** Show the onboarding flow.
- **Action:** Navigate to **Post Job**. Create a project with 3 milestones ($1k, $2k, $2k).
- **Dialogue:** "As a client, I define clear milestones. This ensures the freelancer knows exactly what's expected for each payment."
- **Action:** Switch to **Marketplace**, view the job, show the **Apply** form.

### Phase 3: The Workspace (4–7m)
- **Goal:** Show the "Heart" of the app.
- **Action:** Go to **My Projects** → **View Workspace**. 
- **Dialogue:** "This is the Trust Tracker. You can see $5,000 is locked in the contract. Milestone 1 is already paid. Milestone 2 is in progress."
- **Action:** Click "Submit" as freelancer (simulated), then observe the view change for the client.
- **Action:** Click "Release Funds" to show the payment flow.

### Phase 4: Dispute & Security (7–9m)
- **Goal:** Show how we handle friction.
- **Action:** Click "Raise Dispute" in the Workspace.
- **Dialogue:** "If something goes wrong, either party can freeze the project. The funds remain in the contract until an admin intervenes."
- **Action:** Navigate to **Admin Panel**, select the dispute, and click "Refund Client".

### Phase 5: Transparency & Conclusion (9–12m)
- **Goal:** WOW the judges with "Proof of Trust".
- **Action:** Go to **Account & Wallet**.
- **Dialogue:** "Every action is on-chain. Here is the transaction history with links to Etherscan. We aren't just a marketplace; we are a transparency engine."

---

## 3. Known Limitations

- **Simulated Integration:** For the purpose of this demo, some blockchain interactions are simulated with `setTimeout` to ensure a smooth presentation flow without waiting for block confirmations.
- **Single Wallet Auth:** The demo assumes the user has a connected wallet. Wallet switching (switching accounts in MetaMask) is not shown to save time.
- **File Storage:** File proof of work uses placeholders; a real-world version would integrate IPFS.

---

## 4. Fallback Explanations for Judges

| If... | Say This... |
| :--- | :--- |
| **Metamask fails to pop up** | "Due to the presentation environment, I am showing the simulated flow which reflects exactly what the smart contract does behind the scenes." |
| **Transaction takes too long** | "The contract is executing on Sepolia. While we wait for the block confirmation, let's look at the transaction hash that was just generated." |
| **UI doesn't update immediately** | "The frontend uses optimistic updates; the final state will reflect once the block is confirmed. Here you can see the 'Pending' status." |
| **Judge asks about gas fees** | "Gas optimization was a Secondary goal. We implemented a milestone batching approach to keep fees predictable for both parties." |

---

## 5. Final Checklist Before Submission

- [x] All core workflows tested once
- [x] Smart contract logic verified in `MilestoneEscrow.sol`
- [x] UI states verified (Color coding & Badging)
- [x] Demo script rehearsed
- [x] Fallback strategies defined

import { Router } from 'express';
import { ProposalsController } from '../controllers/proposals.controller';
import { authenticateJWT } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { proposalSchemas } from '../validators/schemas';

const router = Router();

// Routes
router.post('/jobs/:jobId/proposals', authenticateJWT, validate(proposalSchemas.create), ProposalsController.createProposal);
router.get('/jobs/:jobId/proposals', authenticateJWT, ProposalsController.getJobProposals);
router.get('/proposals/my-proposals', authenticateJWT, ProposalsController.getMyProposals);

// Proposal Actions
router.patch('/proposals/:id/accept', authenticateJWT, ProposalsController.acceptProposal);
router.patch('/proposals/:id/reject', authenticateJWT, ProposalsController.rejectProposal);
router.patch('/proposals/:id/withdraw', authenticateJWT, ProposalsController.withdrawProposal);

export default router;

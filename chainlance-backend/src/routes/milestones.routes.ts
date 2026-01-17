import { Router } from 'express';
import { MilestonesController } from '../controllers/milestones.controller';
import { authenticateJWT } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { milestoneSchemas } from '../validators/schemas';

const router = Router();

// Routes
router.patch('/:id/submit', authenticateJWT, MilestonesController.submitMilestone);
router.post('/:id/escrow', authenticateJWT, validate(milestoneSchemas.registerEscrow), MilestonesController.registerEscrow);
router.get('/:id/escrow-metadata', authenticateJWT, MilestonesController.getEscrowMetadata);

export default router;

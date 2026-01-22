import { Router } from 'express';
import { AdminController } from '../controllers/admin.controller';
import { authenticateJWT } from '../middleware/auth.middleware';

const router = Router();

// All admin routes (removing authentication for demo visibility)
router.get('/disputes', AdminController.getDisputes);
router.get('/stats', AdminController.getStats);

export default router;

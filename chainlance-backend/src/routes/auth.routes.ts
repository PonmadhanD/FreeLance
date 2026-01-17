import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { validate } from '../middleware/validation.middleware';
import { authSchemas } from '../validators/schemas';

const router = Router();

// POST /api/v1/auth/nonce
router.post('/nonce', validate(authSchemas.getNonce), AuthController.getNonce);

// POST /api/v1/auth/verify
router.post('/verify', validate(authSchemas.verifySignature), AuthController.verifySignature);

export default router;

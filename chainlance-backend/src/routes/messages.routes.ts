import { Router } from 'express';
import { MessagesController } from '../controllers/messages.controller';
import { authenticateJWT } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { messageSchemas } from '../validators/schemas';

const router = Router();

// Routes
router.post('/projects/:projectId/messages', authenticateJWT, validate(messageSchemas.send), MessagesController.sendMessage);
router.get('/projects/:projectId/messages', authenticateJWT, MessagesController.getProjectMessages);

export default router;

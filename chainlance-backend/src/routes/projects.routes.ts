import { Router } from 'express';
import { ProjectsController } from '../controllers/projects.controller';
import { authenticateJWT } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { projectSchemas } from '../validators/schemas';

const router = Router();

// Routes
router.get('/', authenticateJWT, ProjectsController.getMyProjects);
router.get('/:id', authenticateJWT, ProjectsController.getProjectById);
router.post('/:id/milestones', authenticateJWT, validate(projectSchemas.addMilestone), ProjectsController.addMilestone);
router.patch('/:id/complete', authenticateJWT, ProjectsController.completeProject);

export default router;

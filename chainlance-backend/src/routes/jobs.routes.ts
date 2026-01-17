import { Router } from 'express';
import { JobsController } from '../controllers/jobs.controller';
import { authenticateJWT } from '../middleware/auth.middleware';
import { validate } from '../middleware/validation.middleware';
import { jobSchemas } from '../validators/schemas';

const router = Router();

// Public routes
router.get('/', validate(jobSchemas.list), JobsController.getJobs);
router.get('/:id', JobsController.getJobById);

// Protected routes (require auth)
router.post('/', authenticateJWT, validate(jobSchemas.create), JobsController.createJob);
router.patch('/:id', authenticateJWT, validate(jobSchemas.update), JobsController.updateJob);
router.delete('/:id', authenticateJWT, JobsController.cancelJob);

export default router;

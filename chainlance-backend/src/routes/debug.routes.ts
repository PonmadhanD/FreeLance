import { Router } from 'express';
import { DebugController } from '../controllers/debug.controller';

const router = Router();

router.post('/seed', DebugController.triggerSeed);

export default router;

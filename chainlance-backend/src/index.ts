import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';

// Import routes
import authRoutes from './routes/auth.routes';
import jobsRoutes from './routes/jobs.routes';
import proposalsRoutes from './routes/proposals.routes';
import projectsRoutes from './routes/projects.routes';
import milestonesRoutes from './routes/milestones.routes';
import messagesRoutes from './routes/messages.routes';
import adminRoutes from './routes/admin.routes';
import debugRoutes from './routes/debug.routes';
import { startEventPoller } from './workers/event-poller';
import { startReconciliationWorker } from './workers/reconciliation';
import { errorHandler } from './middleware/error.middleware';
// ...

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'),
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
});
app.use(limiter);

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/jobs', jobsRoutes);
app.use('/api/v1', proposalsRoutes);
app.use('/api/v1/projects', projectsRoutes);
app.use('/api/v1/milestones', milestonesRoutes);
app.use('/api/v1', messagesRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/debug', debugRoutes);
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Global Error Handler
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);

    // Start event poller in background (skip in test mode)
    if (process.env.NODE_ENV !== 'test') {
        // startEventPoller(); // Disabled for demo stability (no blockchain)
        startReconciliationWorker();
    }
});

export default app;

import { Router, Request, Response } from 'express';

const router = Router();

// Health check endpoint
router.get('/', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    memory: process.memoryUsage()
  });
});

// Liveness probe for K8s
router.get('/live', (_req: Request, res: Response) => {
  res.status(200).send('OK');
});

// Readiness probe for K8s
router.get('/ready', (_req: Request, res: Response) => {
  // Add checks for database connections, external services, etc.
  res.status(200).send('OK');
});

export default router;
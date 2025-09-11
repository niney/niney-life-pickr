import { Router, Request, Response } from 'express';

const router = Router();

// API version info
router.get('/version', (_req: Request, res: Response) => {
  res.json({
    version: '1.0.0',
    api: 'friendly',
    description: 'Niney Life Pickr Friendly Server API'
  });
});

// Placeholder for future endpoints
router.get('/choices', (_req: Request, res: Response) => {
  res.json({
    message: 'Choices endpoint - Coming soon',
    categories: ['food', 'place', 'activity']
  });
});

router.get('/recommendations', (_req: Request, res: Response) => {
  res.json({
    message: 'Recommendations endpoint - Coming soon',
    sample: []
  });
});

export default router;
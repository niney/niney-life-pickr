import { Router, Request, Response } from 'express';
import userService, { CreateUserDto } from '../services/userService';

const router = Router();

/**
 * Register a new user
 * POST /api/auth/register
 */
router.post('/register', async (req: Request, res: Response): Promise<Response> => {
  try {
    const { email, username, password } = req.body;
    
    // Validate input
    if (!email || !username || !password) {
      return res.status(400).json({
        error: 'Missing required fields: email, username, password'
      });
    }
    
    // Simple validation
    if (password.length < 6) {
      return res.status(400).json({
        error: 'Password must be at least 6 characters long'
      });
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Invalid email format'
      });
    }
    
    // Create user
    const userData: CreateUserDto = {
      email,
      username,
      password
    };
    
    const user = await userService.createUser(userData);
    
    return res.status(201).json({
      message: 'User created successfully',
      user
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    
    if (error.message.includes('already exists')) {
      return res.status(409).json({
        error: error.message
      });
    }
    
    return res.status(500).json({
      error: 'Failed to register user'
    });
  }
});

/**
 * Login user (simple hardcoded for now)
 * POST /api/auth/login
 */
router.post('/login', async (req: Request, res: Response): Promise<Response> => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        error: 'Email and password are required'
      });
    }
    
    const user = await userService.verifyPassword(email, password);
    
    if (!user) {
      return res.status(401).json({
        error: 'Invalid email or password'
      });
    }
    
    // For now, just return user data (no JWT yet)
    return res.json({
      message: 'Login successful',
      user
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      error: 'Failed to login'
    });
  }
});

/**
 * Get all users (for testing)
 * GET /api/auth/users
 */
router.get('/users', async (_req: Request, res: Response): Promise<Response> => {
  try {
    const users = await userService.getAllUsers();
    return res.json({ users });
  } catch (error) {
    console.error('Error fetching users:', error);
    return res.status(500).json({
      error: 'Failed to fetch users'
    });
  }
});

export default router;
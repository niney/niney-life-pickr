import { Router, Request, Response } from 'express';
import userService, { CreateUserDto } from '../services/userService';
import { ResponseHelper } from '../utils/response.utils';
import { AuthResponseData, UserListResponseData } from '../types/response.types';

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
      return ResponseHelper.validationError(
        res,
        'Missing required fields: email, username, password'
      );
    }

    // Simple validation
    if (password.length < 6) {
      return ResponseHelper.validationError(
        res,
        'Password must be at least 6 characters long'
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return ResponseHelper.validationError(
        res,
        'Invalid email format'
      );
    }

    // Create user
    const userData: CreateUserDto = {
      email,
      username,
      password
    };

    const user = await userService.createUser(userData);

    const responseData: AuthResponseData = {
      user: {
        id: user.id!,
        email: user.email,
        username: user.username,
        provider: user.provider,
        created_at: user.created_at,
        is_active: user.is_active
      }
    };

    return ResponseHelper.created(
      res,
      responseData,
      'User registered successfully'
    );
  } catch (error: any) {
    console.error('Registration error:', error);

    if (error.message.includes('already exists')) {
      return ResponseHelper.conflict(res, error.message);
    }

    return ResponseHelper.error(
      res,
      'Failed to register user',
      500
    );
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
      return ResponseHelper.validationError(
        res,
        'Email and password are required'
      );
    }

    const user = await userService.verifyPassword(email, password);

    if (!user) {
      return ResponseHelper.unauthorized(
        res,
        'Invalid email or password'
      );
    }

    const responseData: AuthResponseData = {
      user: {
        id: user.id!,
        email: user.email,
        username: user.username,
        provider: user.provider,
        last_login: user.last_login,
        is_active: user.is_active
      }
      // token will be added here when JWT is implemented
    };

    return ResponseHelper.success(
      res,
      responseData,
      'Login successful'
    );
  } catch (error: any) {
    console.error('Login error:', error);
    return ResponseHelper.error(
      res,
      'Failed to login',
      500
    );
  }
});

/**
 * Get all users (for testing)
 * GET /api/auth/users
 */
router.get('/users', async (_req: Request, res: Response): Promise<Response> => {
  try {
    const users = await userService.getAllUsers();

    const responseData: UserListResponseData = {
      users: users.map(user => ({
        id: user.id!,
        email: user.email,
        username: user.username,
        provider: user.provider,
        created_at: user.created_at,
        last_login: user.last_login,
        is_active: user.is_active
      })),
      count: users.length
    };

    return ResponseHelper.success(
      res,
      responseData,
      'Users fetched successfully'
    );
  } catch (error: any) {
    console.error('Error fetching users:', error);
    return ResponseHelper.error(
      res,
      'Failed to fetch users',
      500
    );
  }
});

export default router;

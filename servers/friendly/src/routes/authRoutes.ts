import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Type } from '@sinclair/typebox';
import userService, { CreateUserDto } from '../services/userService';
import { ResponseHelper } from '../utils/response.utils';
import { AuthResponseData, UserListResponseData } from '../types/response.types';

// Request body schemas using TypeBox
const RegisterSchema = Type.Object({
  email: Type.String({ format: 'email' }),
  username: Type.String({ minLength: 3, maxLength: 50 }),
  password: Type.String({ minLength: 6 })
});

const LoginSchema = Type.Object({
  email: Type.String({ format: 'email' }),
  password: Type.String()
});

export default async function authRoutes(fastify: FastifyInstance) {
  /**
   * Register a new user
   * POST /api/auth/register
   */
  fastify.post<{
    Body: typeof RegisterSchema.static
  }>('/register', {
    schema: {
      tags: ['auth'],
      summary: 'Register a new user',
      description: 'Create a new user account with email, username and password',
      body: RegisterSchema,
      response: {
        201: Type.Object({
          result: Type.Boolean(),
          message: Type.String(),
          data: Type.Object({
            user: Type.Object({
              id: Type.Number(),
              email: Type.String(),
              username: Type.String(),
              provider: Type.Optional(Type.String()),
              created_at: Type.Optional(Type.String()),
              is_active: Type.Optional(Type.Boolean())
            })
          }),
          timestamp: Type.String()
        })
      }
    }
  }, async (request: FastifyRequest<{ Body: typeof RegisterSchema.static }>, reply: FastifyReply) => {
    try {
      const { email, username, password } = request.body;

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
        reply,
        responseData,
        'User registered successfully'
      );
    } catch (error: any) {
      fastify.log.error('Registration error:', error);

      if (error.message.includes('already exists')) {
        return ResponseHelper.conflict(reply, error.message);
      }

      return ResponseHelper.error(
        reply,
        'Failed to register user',
        500
      );
    }
  });

  /**
   * Login user
   * POST /api/auth/login
   */
  fastify.post<{
    Body: typeof LoginSchema.static
  }>('/login', {
    schema: {
      tags: ['auth'],
      summary: 'User login',
      description: 'Authenticate user with email and password',
      body: LoginSchema,
      response: {
        200: Type.Object({
          result: Type.Boolean(),
          message: Type.String(),
          data: Type.Object({
            user: Type.Object({
              id: Type.Number(),
              email: Type.String(),
              username: Type.String(),
              provider: Type.Optional(Type.String()),
              last_login: Type.Optional(Type.String()),
              is_active: Type.Optional(Type.Boolean())
            })
          }),
          timestamp: Type.String()
        })
      }
    }
  }, async (request: FastifyRequest<{ Body: typeof LoginSchema.static }>, reply: FastifyReply) => {
    try {
      const { email, password } = request.body;

      const user = await userService.verifyPassword(email, password);

      if (!user) {
        return ResponseHelper.unauthorized(
          reply,
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
        reply,
        responseData,
        'Login successful'
      );
    } catch (error: any) {
      fastify.log.error('Login error:', error);
      return ResponseHelper.error(
        reply,
        'Failed to login',
        500
      );
    }
  });

  /**
   * Get all users (for testing)
   * GET /api/auth/users
   */
  fastify.get('/users', {
    schema: {
      tags: ['users'],
      summary: 'Get all users',
      description: 'Retrieve a list of all registered users (for testing purposes)',
      response: {
        200: Type.Object({
          result: Type.Boolean(),
          message: Type.String(),
          data: Type.Object({
            users: Type.Array(Type.Object({
              id: Type.Number(),
              email: Type.String(),
              username: Type.String(),
              provider: Type.Optional(Type.String()),
              created_at: Type.Optional(Type.String()),
              last_login: Type.Optional(Type.String()),
              is_active: Type.Optional(Type.Boolean())
            })),
            count: Type.Number()
          }),
          timestamp: Type.String()
        })
      }
    }
  }, async (_request, reply) => {
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
        reply,
        responseData,
        'Users fetched successfully'
      );
    } catch (error: any) {
      fastify.log.error('Error fetching users:', error);
      return ResponseHelper.error(
        reply,
        'Failed to fetch users',
        500
      );
    }
  });
}
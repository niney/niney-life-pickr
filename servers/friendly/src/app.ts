import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import sensible from '@fastify/sensible';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import routes
import healthRoutes from './routes/health.routes';
import apiRoutes from './routes/api.routes';
import authRoutes from './routes/authRoutes';

// Create Fastify app with TypeBox provider
export const buildApp = async (): Promise<FastifyInstance> => {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
      transport: process.env.NODE_ENV === 'development' 
        ? {
            target: 'pino-pretty',
            options: {
              translateTime: 'HH:MM:ss Z',
              ignore: 'pid,hostname',
            },
          }
        : undefined,
    },
    trustProxy: true,
  }).withTypeProvider<TypeBoxTypeProvider>();

  // Register plugins
  await app.register(cors, {
    origin: true,
    credentials: true,
  });

  await app.register(helmet, {
    contentSecurityPolicy: false, // Disable for API
  });

  await app.register(sensible);

  // Global error handler
  app.setErrorHandler((error, request, reply) => {
    const statusCode = error.statusCode || 500;
    const message = error.message || 'Internal Server Error';
    
    app.log.error({
      err: error,
      req: request.raw,
      res: reply.raw,
    });

    reply.status(statusCode).send({
      result: false,
      message,
      statusCode,
      timestamp: new Date().toISOString(),
    });
  });

  // 404 handler
  app.setNotFoundHandler((request, reply) => {
    reply.status(404).send({
      result: false,
      message: `Route ${request.method} ${request.url} not found`,
      statusCode: 404,
      timestamp: new Date().toISOString(),
    });
  });

  // Root route
  app.get('/', async () => {
    return {
      name: 'Niney Life Pickr Friendly Server',
      version: '1.0.0',
      status: 'running',
      timestamp: new Date().toISOString(),
    };
  });

  // Register routes
  await app.register(healthRoutes, { prefix: '/health' });
  await app.register(apiRoutes, { prefix: '/api' });
  await app.register(authRoutes, { prefix: '/api/auth' });

  return app;
};

export default buildApp;
import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import sensible from '@fastify/sensible';
import swagger from '@fastify/swagger';
import swaggerUI from '@fastify/swagger-ui';
import scalarApiReference from '@scalar/fastify-api-reference';
import { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Import routes
import healthRoutes from './routes/health.routes';
import apiRoutes from './routes/api.routes';
import authRoutes from './routes/auth.routes';
import docsRoutes from './routes/docs.routes';
import crawlerRoutes from './routes/crawler.routes';

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

  // Register Swagger for API documentation
  await app.register(swagger, {
    openapi: {
      openapi: '3.0.0',
      info: {
        title: 'Niney Life Pickr API',
        description: 'Life decision-making application API documentation',
        version: '1.0.0',
        contact: {
          name: 'API Support',
          email: 'api@nineylifepickr.com'
        },
        license: {
          name: 'MIT',
          url: 'https://opensource.org/licenses/MIT'
        }
      },
      servers: [
        {
          url: process.env.NODE_ENV === 'production'
            ? 'https://api.nineylifepickr.com'
            : `http://localhost:${process.env.PORT || 4000}`,
          description: process.env.NODE_ENV === 'production' ? 'Production' : 'Development'
        }
      ],
      tags: [
        { name: 'auth', description: 'Authentication endpoints' },
        { name: 'health', description: 'Health check endpoints' },
        { name: 'api', description: 'General API endpoints' },
        { name: 'users', description: 'User management endpoints' },
        { name: 'crawler', description: 'Naver Map restaurant crawler endpoints' }
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'JWT token for authentication'
          }
        }
      },
      security: []
    }
  });

  // Register Swagger UI
  await app.register(swaggerUI, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
      persistAuthorization: true,
      displayOperationId: false,
      defaultModelsExpandDepth: 1,
      defaultModelExpandDepth: 1,
      defaultModelRendering: 'example',
      displayRequestDuration: true,
      filter: true,
      showExtensions: true,
      showCommonExtensions: true,
      tryItOutEnabled: true
    },
    staticCSP: false,
    transformStaticCSP: (header) => header,
    transformSpecification: (swaggerObject) => {
      return swaggerObject
    },
    transformSpecificationClone: true
  });

  // Register Scalar API Reference (modern alternative to Swagger UI)
  await app.register(scalarApiReference, {
    routePrefix: '/reference',
    configuration: {
      url: '/docs/json',
      theme: 'purple',
      darkMode: true,
      hideModels: false,
      hideDownloadButton: false
    }
  });

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
  await app.register(docsRoutes, { prefix: '/api/docs' });
  await app.register(crawlerRoutes, { prefix: '/api/crawler' });

  return app;
};

export default buildApp;

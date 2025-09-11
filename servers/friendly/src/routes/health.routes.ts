import { FastifyInstance } from 'fastify';
import { Type } from '@sinclair/typebox';

export default async function healthRoutes(fastify: FastifyInstance) {
  // Health check endpoint
  fastify.get('/', {
    schema: {
      response: {
        200: Type.Object({
          status: Type.String(),
          uptime: Type.Number(),
          timestamp: Type.String(),
          environment: Type.String(),
          memory: Type.Object({
            rss: Type.Number(),
            heapTotal: Type.Number(),
            heapUsed: Type.Number(),
            external: Type.Number(),
            arrayBuffers: Type.Number()
          })
        })
      }
    }
  }, async () => {
    return {
      status: 'healthy',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      memory: process.memoryUsage()
    };
  });

  // Liveness probe for K8s
  fastify.get('/live', async (_request, reply) => {
    return reply.code(200).send('OK');
  });

  // Readiness probe for K8s
  fastify.get('/ready', async (_request, reply) => {
    // Add checks for database connections, external services, etc.
    return reply.code(200).send('OK');
  });
}
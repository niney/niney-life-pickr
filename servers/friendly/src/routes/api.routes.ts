import { FastifyInstance } from 'fastify';
import { Type } from '@sinclair/typebox';

export default async function apiRoutes(fastify: FastifyInstance) {
  // API version info
  fastify.get('/version', {
    schema: {
      response: {
        200: Type.Object({
          version: Type.String(),
          api: Type.String(),
          description: Type.String()
        })
      }
    }
  }, async () => {
    return {
      version: '1.0.0',
      api: 'friendly',
      description: 'Niney Life Pickr Friendly Server API'
    };
  });

  // Placeholder for future endpoints
  fastify.get('/choices', {
    schema: {
      response: {
        200: Type.Object({
          message: Type.String(),
          categories: Type.Array(Type.String())
        })
      }
    }
  }, async () => {
    return {
      message: 'Choices endpoint - Coming soon',
      categories: ['food', 'place', 'activity']
    };
  });

  fastify.get('/recommendations', {
    schema: {
      response: {
        200: Type.Object({
          message: Type.String(),
          sample: Type.Array(Type.Any())
        })
      }
    }
  }, async () => {
    return {
      message: 'Recommendations endpoint - Coming soon',
      sample: []
    };
  });
}
import { FastifyInstance } from 'fastify';
import { Type } from '@sinclair/typebox';

export default async function apiRoutes(fastify: FastifyInstance) {
  // API version info
  fastify.get('/version', {
    schema: {
      tags: ['api'],
      summary: 'API version information',
      description: 'Get the current API version and basic information',
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
      tags: ['api'],
      summary: 'Get choice categories',
      description: 'Get available choice categories for decision making',
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
      tags: ['api'],
      summary: 'Get recommendations',
      description: 'Get personalized recommendations (coming soon)',
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
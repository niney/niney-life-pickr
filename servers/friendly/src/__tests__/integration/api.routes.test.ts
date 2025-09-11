import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { buildApp } from '../../app';
import { FastifyInstance } from 'fastify';

describe('API Routes Integration Tests', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/version', () => {
    it('should return API version info', async () => {
      const response = await request(app.server).get('/api/version');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('version', '1.0.0');
      expect(response.body).toHaveProperty('api', 'friendly');
      expect(response.body).toHaveProperty('description', 'Niney Life Pickr Friendly Server API');
    });

    it('should return JSON content type', async () => {
      const response = await request(app.server).get('/api/version');

      expect(response.headers['content-type']).toMatch(/application\/json/);
    });
  });

  describe('GET /api/choices', () => {
    it('should return choices placeholder', async () => {
      const response = await request(app.server).get('/api/choices');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Choices endpoint - Coming soon');
      expect(response.body).toHaveProperty('categories');
      expect(response.body.categories).toBeInstanceOf(Array);
      expect(response.body.categories).toContain('food');
      expect(response.body.categories).toContain('place');
      expect(response.body.categories).toContain('activity');
    });

    it('should have exactly 3 categories', async () => {
      const response = await request(app.server).get('/api/choices');

      expect(response.body.categories).toHaveLength(3);
    });
  });

  describe('GET /api/recommendations', () => {
    it('should return recommendations placeholder', async () => {
      const response = await request(app.server).get('/api/recommendations');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Recommendations endpoint - Coming soon');
      expect(response.body).toHaveProperty('sample');
      expect(response.body.sample).toBeInstanceOf(Array);
      expect(response.body.sample).toHaveLength(0);
    });
  });

  describe('API routes error handling', () => {
    it('should return 404 for non-existent API routes', async () => {
      const response = await request(app.server).get('/api/non-existent');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('result', false);
      expect(response.body.message).toContain('/api/non-existent');
    });

    it('should handle unsupported HTTP methods', async () => {
      const response = await request(app.server).delete('/api/version');

      expect(response.status).toBe(404);
      expect(response.body.message).toContain('Route DELETE /api/version not found');
    });
  });

  describe('API routes performance', () => {
    it('should respond quickly to API requests', async () => {
      const startTime = Date.now();
      await request(app.server).get('/api/version');
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(200); // Should respond in less than 200ms
    });

    it('should handle concurrent API requests', async () => {
      const requests = [
        request(app.server).get('/api/version'),
        request(app.server).get('/api/choices'),
        request(app.server).get('/api/recommendations')
      ];

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });
  });
});

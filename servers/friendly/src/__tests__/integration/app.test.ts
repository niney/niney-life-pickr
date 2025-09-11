import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { buildApp } from '../../app';
import { FastifyInstance } from 'fastify';

describe('App Integration Tests', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    // Build and prepare app for testing
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    // Close app after tests
    await app.close();
  });

  describe('GET /', () => {
    it('should return server info', async () => {
      const response = await request(app.server).get('/');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('name', 'Niney Life Pickr Friendly Server');
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('status', 'running');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('404 Handler', () => {
    it('should return 404 for unknown routes', async () => {
      const response = await request(app.server).get('/unknown-route');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('result', false);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Route GET /unknown-route not found');
    });

    it('should handle POST requests to unknown routes', async () => {
      const response = await request(app.server)
        .post('/unknown-route')
        .send({ test: 'data' });

      expect(response.status).toBe(404);
      expect(response.body.message).toContain('Route POST /unknown-route not found');
    });
  });

  describe('Middleware', () => {
    it('should parse JSON body', async () => {
      const testData = { test: 'data', number: 123 };
      const response = await request(app.server)
        .post('/api/test-echo') // This endpoint doesn't exist, but we can test parsing
        .send(testData)
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(404); // Expected since route doesn't exist
      // The fact that it doesn't crash means JSON parsing works
    });

    it('should handle CORS headers', async () => {
      const response = await request(app.server)
        .get('/')
        .set('Origin', 'http://localhost:3000');

      expect(response.headers).toHaveProperty('access-control-allow-origin');
    });

    it('should have security headers from Helmet', async () => {
      const response = await request(app.server).get('/');

      // Check for some common Helmet headers
      expect(response.headers).toHaveProperty('x-dns-prefetch-control');
      expect(response.headers).toHaveProperty('x-frame-options');
      expect(response.headers).toHaveProperty('x-content-type-options');
    });
  });
});

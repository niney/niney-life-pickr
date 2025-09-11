import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { buildApp } from '../../app';
import { FastifyInstance } from 'fastify';

describe('Health Routes Integration Tests', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app.server).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('environment');
      expect(response.body).toHaveProperty('memory');

      // Check memory object structure
      expect(response.body.memory).toHaveProperty('rss');
      expect(response.body.memory).toHaveProperty('heapTotal');
      expect(response.body.memory).toHaveProperty('heapUsed');
      expect(response.body.memory).toHaveProperty('external');
    });

    it('should return correct environment', async () => {
      const response = await request(app.server).get('/health');

      expect(response.body.environment).toBe('test');
    });

    it('should return positive uptime', async () => {
      const response = await request(app.server).get('/health');

      expect(response.body.uptime).toBeGreaterThan(0);
    });
  });

  describe('GET /health/live', () => {
    it('should return OK for liveness probe', async () => {
      const response = await request(app.server).get('/health/live');

      expect(response.status).toBe(200);
      expect(response.text).toBe('OK');
    });

    it('should be lightweight and fast', async () => {
      const startTime = Date.now();
      const response = await request(app.server).get('/health/live');
      const endTime = Date.now();

      expect(response.status).toBe(200);
      expect(endTime - startTime).toBeLessThan(100); // Should respond in less than 100ms
    });
  });

  describe('GET /health/ready', () => {
    it('should return OK for readiness probe', async () => {
      const response = await request(app.server).get('/health/ready');

      expect(response.status).toBe(200);
      expect(response.text).toBe('OK');
    });

    it('should be able to handle multiple concurrent requests', async () => {
      const requests = Array(10).fill(null).map(() =>
        request(app.server).get('/health/ready')
      );

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.text).toBe('OK');
      });
    });
  });

  describe('Health endpoints error handling', () => {
    it('should handle invalid health endpoints', async () => {
      const response = await request(app.server).get('/health/invalid');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('result', false);
    });
  });
});

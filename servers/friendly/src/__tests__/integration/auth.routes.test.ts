import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { buildApp } from '../../app';
import { FastifyInstance } from 'fastify';
import { db } from '../../db/database';
import migrator from '../../db/migrate';

describe('Auth Routes Integration Tests', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    // Connect to database
    await db.connect();

    // Run migrations
    await migrator.migrate();

    // Build and prepare app for testing
    app = await buildApp();
    await app.ready();
  });

  beforeEach(async () => {
    // Clean up database before each test
    await db.run('DELETE FROM users WHERE email LIKE ?', ['test%']);
  });

  afterAll(async () => {
    // Final cleanup
    await db.run('DELETE FROM users WHERE email LIKE ?', ['test%']);
    await app.close();
    await db.close();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const newUser = {
        email: 'test@example.com',
        username: 'testuser',
        password: 'password123'
      };

      const response = await request(app.server)
        .post('/api/auth/register')
        .send(newUser);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('result', true);
      expect(response.body).toHaveProperty('message', 'User registered successfully');
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('user');
      expect(response.body.data.user).toMatchObject({
        email: newUser.email,
        username: newUser.username
      });
      expect(response.body.data.user).toHaveProperty('id');
      expect(response.body.data.user).not.toHaveProperty('password');
      expect(response.body.data.user).not.toHaveProperty('password_hash');
    });

    it('should not register user with duplicate email', async () => {
      const user = {
        email: 'test.duplicate@example.com',
        username: 'testuser1',
        password: 'password123'
      };

      // First registration should succeed
      await request(app.server)
        .post('/api/auth/register')
        .send(user);

      // Second registration with same email should fail
      const response = await request(app.server)
        .post('/api/auth/register')
        .send({
          ...user,
          username: 'differentuser'
        });

      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty('result', false);
      expect(response.body.message).toContain('already exists');
    });

    it('should not register user with duplicate username', async () => {
      const user = {
        email: 'test1@example.com',
        username: 'testduplicateuser',
        password: 'password123'
      };

      // First registration should succeed
      await request(app.server)
        .post('/api/auth/register')
        .send(user);

      // Second registration with same username should fail
      const response = await request(app.server)
        .post('/api/auth/register')
        .send({
          ...user,
          email: 'test2@example.com'
        });

      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty('result', false);
      expect(response.body.message).toContain('already exists');
    });

    it('should validate email format', async () => {
      const response = await request(app.server)
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          username: 'testuser',
          password: 'password123'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('result', false);
      expect(response.body.message).toContain('body/email');
    });

    it('should validate password minimum length', async () => {
      const response = await request(app.server)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          username: 'testuser',
          password: '12345' // Too short
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('result', false);
      expect(response.body.message).toContain('body/password');
    });

    it('should validate username minimum length', async () => {
      const response = await request(app.server)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          username: 'ab', // Too short
          password: 'password123'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('result', false);
      expect(response.body.message).toContain('body/username');
    });

    it('should validate username maximum length', async () => {
      const response = await request(app.server)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          username: 'a'.repeat(51), // Too long
          password: 'password123'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('result', false);
      expect(response.body.message).toContain('body/username');
    });

    it('should handle missing required fields', async () => {
      const response = await request(app.server)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com'
          // Missing username and password
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('result', false);
      expect(response.body.message).toContain('body');
    });

    it('should return consistent timestamp format', async () => {
      const response = await request(app.server)
        .post('/api/auth/register')
        .send({
          email: 'test.timestamp@example.com',
          username: 'timestampuser',
          password: 'password123'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  describe('POST /api/auth/login', () => {
    const testUser = {
      email: 'test.login@example.com',
      username: 'loginuser',
      password: 'password123'
    };

    beforeEach(async () => {
      // Register a user for login tests
      await request(app.server)
        .post('/api/auth/register')
        .send(testUser);
    });

    it('should login with valid credentials', async () => {
      const response = await request(app.server)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('result', true);
      expect(response.body).toHaveProperty('message', 'Login successful');
      expect(response.body.data.user).toMatchObject({
        email: testUser.email,
        username: testUser.username
      });
      expect(response.body.data.user).toHaveProperty('last_login');
      expect(response.body.data.user).not.toHaveProperty('password');
      expect(response.body.data.user).not.toHaveProperty('password_hash');
    });

    it('should fail login with invalid password', async () => {
      const response = await request(app.server)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('result', false);
      expect(response.body).toHaveProperty('message', 'Invalid email or password');
    });

    it('should fail login with non-existent email', async () => {
      const response = await request(app.server)
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('result', false);
      expect(response.body).toHaveProperty('message', 'Invalid email or password');
    });

    it('should validate email format on login', async () => {
      const response = await request(app.server)
        .post('/api/auth/login')
        .send({
          email: 'invalid-email',
          password: 'password123'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('result', false);
      expect(response.body.message).toContain('body/email');
    });

    it('should handle missing email field', async () => {
      const response = await request(app.server)
        .post('/api/auth/login')
        .send({
          password: 'password123'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('result', false);
      expect(response.body.message).toContain('body');
    });

    it('should handle missing password field', async () => {
      const response = await request(app.server)
        .post('/api/auth/login')
        .send({
          email: testUser.email
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('result', false);
      expect(response.body.message).toContain('body');
    });

    it('should update last_login timestamp', async () => {
      // First login
      const firstLogin = await request(app.server)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });

      const firstLoginTime = firstLogin.body.data.user.last_login;

      // Wait 1.1 seconds to ensure different timestamp (SQLite CURRENT_TIMESTAMP has second precision)
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Second login
      const secondLogin = await request(app.server)
        .post('/api/auth/login')
        .send({
          email: testUser.email,
          password: testUser.password
        });

      const secondLoginTime = secondLogin.body.data.user.last_login;

      expect(firstLoginTime).toBeTruthy();
      expect(secondLoginTime).toBeTruthy();
      expect(secondLoginTime).not.toBe(firstLoginTime);
    });

    it('should handle case-insensitive email', async () => {
      const response = await request(app.server)
        .post('/api/auth/login')
        .send({
          email: testUser.email.toUpperCase(),
          password: testUser.password
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('result', true);
      expect(response.body.data.user.email).toBe(testUser.email);
    });
  });

  describe('GET /api/auth/users', () => {
    beforeEach(async () => {
      // Register multiple test users
      const users = [
        { email: 'test1@example.com', username: 'testuser1', password: 'password123' },
        { email: 'test2@example.com', username: 'testuser2', password: 'password456' },
        { email: 'test3@example.com', username: 'testuser3', password: 'password789' }
      ];

      for (const user of users) {
        await request(app.server)
          .post('/api/auth/register')
          .send(user);
      }
    });

    it('should return list of all users', async () => {
      const response = await request(app.server).get('/api/auth/users');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('result', true);
      expect(response.body).toHaveProperty('message', 'Users fetched successfully');
      expect(response.body.data).toHaveProperty('users');
      expect(response.body.data).toHaveProperty('count');
      expect(Array.isArray(response.body.data.users)).toBe(true);
      expect(response.body.data.users.length).toBeGreaterThanOrEqual(3);
      expect(response.body.data.count).toBe(response.body.data.users.length);
    });

    it('should not include password hashes in user list', async () => {
      const response = await request(app.server).get('/api/auth/users');

      expect(response.status).toBe(200);
      response.body.data.users.forEach((user: any) => {
        expect(user).not.toHaveProperty('password');
        expect(user).not.toHaveProperty('password_hash');
      });
    });

    it('should include all user fields except passwords', async () => {
      const response = await request(app.server).get('/api/auth/users');

      expect(response.status).toBe(200);
      response.body.data.users.forEach((user: any) => {
        expect(user).toHaveProperty('id');
        expect(user).toHaveProperty('email');
        expect(user).toHaveProperty('username');
        expect(user).toHaveProperty('created_at');
        expect(user).toHaveProperty('is_active');
      });
    });

    it('should return empty array when no users exist', async () => {
      // Clean all test users
      await db.run('DELETE FROM users WHERE email LIKE ?', ['test%']);

      const response = await request(app.server).get('/api/auth/users');

      expect(response.status).toBe(200);
      expect(response.body.data.users).toEqual([]);
      expect(response.body.data.count).toBe(0);
    });

    it('should return users in consistent order', async () => {
      const response1 = await request(app.server).get('/api/auth/users');
      const response2 = await request(app.server).get('/api/auth/users');

      expect(response1.body.data.users.length).toBe(response2.body.data.users.length);

      // Users should be in the same order (by ID typically)
      const ids1 = response1.body.data.users.map((u: any) => u.id);
      const ids2 = response2.body.data.users.map((u: any) => u.id);
      expect(ids1).toEqual(ids2);
    });
  });

  describe('Error Handling', () => {
    it.skip('should handle database errors gracefully', async () => {
      // Skip this test as we can't easily simulate database errors
      // without affecting other tests
    });

    it('should handle invalid JSON in request body', async () => {
      const response = await request(app.server)
        .post('/api/auth/register')
        .send('invalid json')
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('result', false);
    });

    it('should handle empty request body', async () => {
      const response = await request(app.server)
        .post('/api/auth/register')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('result', false);
      expect(response.body.message).toContain('body');
    });
  });

  describe('Performance', () => {
    it('should handle registration within reasonable time', async () => {
      const startTime = Date.now();

      await request(app.server)
        .post('/api/auth/register')
        .send({
          email: 'test.perf@example.com',
          username: 'perfuser',
          password: 'password123'
        });

      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle concurrent registrations', async () => {
      const requests = Array.from({ length: 5 }, (_, i) =>
        request(app.server)
          .post('/api/auth/register')
          .send({
            email: `test.concurrent${i}@example.com`,
            username: `concurrentuser${i}`,
            password: 'password123'
          })
      );

      const responses = await Promise.all(requests);

      responses.forEach(response => {
        expect(response.status).toBe(201);
        expect(response.body.result).toBe(true);
      });
    });
  });
});

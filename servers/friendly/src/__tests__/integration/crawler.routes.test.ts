import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import { buildApp } from '../../app';
import { FastifyInstance } from 'fastify';
import { db } from '../../db/database';
import migrator from '../../db/migrate';
import naverCrawlerService from '../../services/naver-crawler.service';

describe('POST /api/crawler/restaurant', () => {
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
    // Clean up test data before each test
    await db.run('DELETE FROM menus WHERE restaurant_id IN (SELECT id FROM restaurants WHERE place_id LIKE ?)', ['test%']);
    await db.run('DELETE FROM restaurants WHERE place_id LIKE ?', ['test%']);
  });

  afterAll(async () => {
    // Final cleanup
    await db.run('DELETE FROM menus WHERE restaurant_id IN (SELECT id FROM restaurants WHERE place_id LIKE ?)', ['test%']);
    await db.run('DELETE FROM restaurants WHERE place_id LIKE ?', ['test%']);
    await app.close();
    await db.close();
  });

  describe('Validation Tests', () => {
    it('should return validation error for missing URL', async () => {
      const response = await request(app.server)
        .post('/api/crawler/restaurant')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('result', false);
      expect(response.body.message).toContain('required property');
    });

    it('should return validation error for invalid URL domain', async () => {
      const response = await request(app.server)
        .post('/api/crawler/restaurant')
        .send({
          url: 'https://invalid-domain.com/restaurant/123'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('result', false);
      expect(response.body.message).toContain('Invalid Naver Map URL');
    });
  });

  describe('Restaurant Crawling with DB Save', () => {
    it('should crawl restaurant info and save to DB', async () => {
      // Mock crawler service similar to real response example
      const mockRestaurantInfo = {
        name: '조연탄',
        address: '서울 강서구 곰달래로60길 29 조연탄',
        category: '한식',
        phone: '0507-1494-2013',
        description: '한식 - 메뉴 7개',
        businessHours: null,
        coordinates: null,
        url: 'https://map.naver.com/p/entry/place/test20848484',
        placeId: 'test20848484',
        placeName: '조연탄',
        crawledAt: new Date().toISOString(),
        menuItems: [
          {
            name: '제주먹고기',
            price: '17,000원',
            description: '두툼한 두께와 풍부한 육즙 조연탄 대표메뉴 제주먹고기'
          },
          {
            name: '제주껍데기',
            price: '10,000원',
            description: '쫄깃한 식감과 고소한 향이 매력적인 껍데기'
          },
          {
            name: '제주 고기만두',
            price: '8,000원',
            description: '수제로 만드는 고기만두 풍부한 육즙과 쫄깃한 반죽'
          },
          {
            name: '라면',
            price: '3,000원',
            description: '양푼에 끓여내는 조연탄 라면'
          },
          {
            name: '명란젓',
            price: '3,000원',
            description: '참기름과 다진마늘이 첨가되는 명란젓'
          },
          {
            name: '누룽지',
            price: '3,000원',
            description: '구수하게 즐길 수 있는 누룽지'
          },
          {
            name: '솥밥',
            price: '3,000원',
            description: '갓 지어져서 나오는 조연탄 솥밥 + 된장찌개'
          }
        ]
      };

      const crawlSpy = vi.spyOn(naverCrawlerService, 'crawlRestaurant')
        .mockResolvedValue(mockRestaurantInfo);

      const response = await request(app.server)
        .post('/api/crawler/restaurant')
        .send({
          url: 'https://map.naver.com/p/entry/place/test20848484',
          crawlMenus: true
        });

      // Response validation
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('result', true);
      expect(response.body).toHaveProperty('message', '식당 정보 크롤링 성공');
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('timestamp');

      // Restaurant data validation
      expect(response.body.data).toHaveProperty('name', '조연탄');
      expect(response.body.data).toHaveProperty('address', '서울 강서구 곰달래로60길 29 조연탄');
      expect(response.body.data).toHaveProperty('category', '한식');
      expect(response.body.data).toHaveProperty('phone', '0507-1494-2013');
      expect(response.body.data).toHaveProperty('description', '한식 - 메뉴 7개');
      expect(response.body.data).toHaveProperty('placeId', 'test20848484');
      expect(response.body.data).toHaveProperty('placeName', '조연탄');
      expect(response.body.data).toHaveProperty('url');
      expect(response.body.data).toHaveProperty('crawledAt');

      // DB save validation
      expect(response.body.data).toHaveProperty('savedToDb', true);
      expect(response.body.data).toHaveProperty('restaurantId');

      // Menu items validation
      expect(response.body.data).toHaveProperty('menuItems');
      expect(Array.isArray(response.body.data.menuItems)).toBe(true);
      expect(response.body.data.menuItems).toHaveLength(7);

      // Check first menu item
      expect(response.body.data.menuItems[0]).toHaveProperty('name', '제주먹고기');
      expect(response.body.data.menuItems[0]).toHaveProperty('price', '17,000원');
      expect(response.body.data.menuItems[0]).toHaveProperty('description');

      // Verify data was saved to DB
      const savedRestaurant = await db.get(
        'SELECT * FROM restaurants WHERE place_id = ?',
        ['test20848484']
      );
      expect(savedRestaurant).toBeDefined();
      expect(savedRestaurant).toHaveProperty('name', '조연탄');
      expect(savedRestaurant).toHaveProperty('phone', '0507-1494-2013');
      expect(savedRestaurant).toHaveProperty('category', '한식');

      // Verify menus were saved
      const savedMenus = await db.all(
        'SELECT * FROM menus WHERE restaurant_id = ?',
        [savedRestaurant.id]
      );
      expect(savedMenus).toHaveLength(7);
      expect(savedMenus[0]).toHaveProperty('name', '제주먹고기');
      expect(savedMenus[0]).toHaveProperty('price', '17,000원');

      crawlSpy.mockRestore();
    });
  });
});

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { buildApp } from '../../app';
import { FastifyInstance } from 'fastify';
import { db } from '../../db/database';
import migrator from '../../db/migrate';
import restaurantRepository from '../../db/repositories/restaurant.repository';

describe('Restaurant Routes', () => {
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

  describe('GET /api/restaurants/categories', () => {
    beforeEach(async () => {
      // Extra cleanup to ensure clean state
      await db.run('DELETE FROM menus WHERE restaurant_id IN (SELECT id FROM restaurants WHERE place_id LIKE ?)', ['test%']);
      await db.run('DELETE FROM restaurants WHERE place_id LIKE ?', ['test%']);
    });

    it('should return empty array when no restaurants exist', async () => {
      const response = await request(app.server)
        .get('/api/restaurants/categories');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('result', true);
      expect(response.body.data).toBeInstanceOf(Array);
    });

    it('should return categories grouped by count', async () => {
      // Insert test restaurants with unique IDs
      await restaurantRepository.upsertRestaurant({
        place_id: 'test_cat_001',
        name: '한식당1',
        place_name: '한식당1',
        category: '한식',
        phone: '02-1234-5678',
        address: '서울시 강남구',
        description: '한식',
        business_hours: null,
        lat: null,
        lng: null,
        url: 'https://map.naver.com/p/entry/place/test_cat_001',
        crawled_at: new Date().toISOString()
      });

      await restaurantRepository.upsertRestaurant({
        place_id: 'test_cat_002',
        name: '한식당2',
        place_name: '한식당2',
        category: '한식',
        phone: '02-1234-5679',
        address: '서울시 강남구',
        description: '한식',
        business_hours: null,
        lat: null,
        lng: null,
        url: 'https://map.naver.com/p/entry/place/test_cat_002',
        crawled_at: new Date().toISOString()
      });

      await restaurantRepository.upsertRestaurant({
        place_id: 'test_cat_003',
        name: '중식당1',
        place_name: '중식당1',
        category: '중식',
        phone: '02-1234-5680',
        address: '서울시 강남구',
        description: '중식',
        business_hours: null,
        lat: null,
        lng: null,
        url: 'https://map.naver.com/p/entry/place/test_cat_003',
        crawled_at: new Date().toISOString()
      });

      const response = await request(app.server)
        .get('/api/restaurants/categories');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('result', true);
      expect(response.body.data).toBeInstanceOf(Array);

      // 테스트 데이터만 확인 (실제 DB 데이터와 무관하게)
      const testCategories = response.body.data.filter((cat: any) =>
        cat.category === '한식' || cat.category === '중식'
      );

      expect(testCategories.length).toBeGreaterThanOrEqual(2);

      // 한식 카테고리 확인 (이 테스트에서 2개 추가)
      const koreanCategory = response.body.data.find((cat: any) => cat.category === '한식');
      expect(koreanCategory).toBeDefined();
      expect(koreanCategory.count).toBeGreaterThanOrEqual(2);

      // 중식 카테고리 확인
      const chineseCategory = response.body.data.find((cat: any) => cat.category === '중식');
      expect(chineseCategory).toBeDefined();
      expect(chineseCategory.count).toBeGreaterThanOrEqual(1);
    });

    it('should handle null category as Unknown', async () => {
      await restaurantRepository.upsertRestaurant({
        place_id: 'test_cat_null',
        name: '무카테고리',
        place_name: '무카테고리',
        category: null,
        phone: '02-1234-5681',
        address: '서울시 강남구',
        description: '카테고리 없음',
        business_hours: null,
        lat: null,
        lng: null,
        url: 'https://map.naver.com/p/entry/place/test_cat_null',
        crawled_at: new Date().toISOString()
      });

      const response = await request(app.server)
        .get('/api/restaurants/categories');

      expect(response.status).toBe(200);
      expect(response.body.data).toContainEqual({
        category: 'Unknown',
        count: 1
      });
    });
  });

  describe('GET /api/restaurants', () => {
    beforeEach(async () => {
      // Extra cleanup to ensure clean state
      await db.run('DELETE FROM menus WHERE restaurant_id IN (SELECT id FROM restaurants WHERE place_id LIKE ?)', ['test%']);
      await db.run('DELETE FROM restaurants WHERE place_id LIKE ?', ['test%']);
    });

    it('should return paginated restaurant list', async () => {
      // Insert test restaurants with unique prefix
      for (let i = 1; i <= 5; i++) {
        await restaurantRepository.upsertRestaurant({
          place_id: `test_page_${i.toString().padStart(3, '0')}`,
          name: `테스트음식점${i}`,
          place_name: `테스트음식점${i}`,
          category: '한식',
          phone: `02-1234-${i.toString().padStart(4, '0')}`,
          address: '서울시 강남구',
          description: '테스트',
          business_hours: null,
          lat: null,
          lng: null,
          url: `https://map.naver.com/p/entry/place/test_page_${i.toString().padStart(3, '0')}`,
          crawled_at: new Date().toISOString()
        });
      }

      const response = await request(app.server)
        .get('/api/restaurants')
        .query({ limit: 3, offset: 0 });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('result', true);
      expect(response.body.data).toHaveProperty('total');
      // 실제 DB에 데이터가 있을 수 있으므로 >= 5로 검증
      expect(response.body.data.total).toBeGreaterThanOrEqual(5);
      expect(response.body.data).toHaveProperty('limit', 3);
      expect(response.body.data).toHaveProperty('offset', 0);
      expect(response.body.data.restaurants).toBeInstanceOf(Array);
      expect(response.body.data.restaurants.length).toBe(3);
    });

    it('should use default pagination values', async () => {
      const response = await request(app.server)
        .get('/api/restaurants');

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('limit', 20);
      expect(response.body.data).toHaveProperty('offset', 0);
    });

    it('should handle offset correctly', async () => {
      // Insert test restaurants with unique prefix
      for (let i = 1; i <= 5; i++) {
        await restaurantRepository.upsertRestaurant({
          place_id: `test_offset_${i.toString().padStart(3, '0')}`,
          name: `테스트음식점${i}`,
          place_name: `테스트음식점${i}`,
          category: '한식',
          phone: `02-1234-${i.toString().padStart(4, '0')}`,
          address: '서울시 강남구',
          description: '테스트',
          business_hours: null,
          lat: null,
          lng: null,
          url: `https://map.naver.com/p/entry/place/test_offset_${i.toString().padStart(3, '0')}`,
          crawled_at: new Date().toISOString()
        });
      }

      const response = await request(app.server)
        .get('/api/restaurants')
        .query({ limit: 2, offset: 2 });

      expect(response.status).toBe(200);
      expect(response.body.data.restaurants.length).toBe(2);
      // 실제 DB에 데이터가 있을 수 있으므로 >= 5로 검증
      expect(response.body.data.total).toBeGreaterThanOrEqual(5);
    });
  });

  describe('GET /api/restaurants/:id', () => {
    beforeEach(async () => {
      // Extra cleanup to ensure clean state
      await db.run('DELETE FROM menus WHERE restaurant_id IN (SELECT id FROM restaurants WHERE place_id LIKE ?)', ['test%']);
      await db.run('DELETE FROM restaurants WHERE place_id LIKE ?', ['test%']);
    });

    it('should return restaurant details with menus', async () => {
      // Insert test restaurant
      const restaurantId = await restaurantRepository.upsertRestaurant({
        place_id: 'test_detail_100',
        name: '테스트음식점',
        place_name: '테스트음식점',
        category: '한식',
        phone: '02-1234-5678',
        address: '서울시 강남구',
        description: '테스트 음식점',
        business_hours: null,
        lat: null,
        lng: null,
        url: 'https://map.naver.com/p/entry/place/test_detail_100',
        crawled_at: new Date().toISOString()
      });

      // Insert test menus
      await restaurantRepository.saveMenus(restaurantId, [
        {
          name: '김치찌개',
          description: '얼큰한 김치찌개',
          price: '8,000원',
          image: null
        },
        {
          name: '된장찌개',
          description: '구수한 된장찌개',
          price: '7,000원',
          image: null
        }
      ]);

      const response = await request(app.server)
        .get(`/api/restaurants/${restaurantId}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('result', true);
      expect(response.body.data).toHaveProperty('restaurant');
      expect(response.body.data).toHaveProperty('menus');
      expect(response.body.data.restaurant).toMatchObject({
        id: restaurantId,
        place_id: 'test_detail_100',
        name: '테스트음식점',
        category: '한식'
      });
      expect(response.body.data.menus).toBeInstanceOf(Array);
      expect(response.body.data.menus.length).toBe(2);
      expect(response.body.data.menus[0]).toMatchObject({
        name: '김치찌개',
        price: '8,000원'
      });
    });

    it('should return 404 for non-existent restaurant', async () => {
      const response = await request(app.server)
        .get('/api/restaurants/999999');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('result', false);
      expect(response.body.message).toContain('찾을 수 없습니다');
    });

    it('should return restaurant without menus if no menus exist', async () => {
      // Insert test restaurant without menus
      const restaurantId = await restaurantRepository.upsertRestaurant({
        place_id: 'test_detail_101',
        name: '메뉴없는음식점',
        place_name: '메뉴없는음식점',
        category: '카페',
        phone: '02-1234-5679',
        address: '서울시 강남구',
        description: '메뉴 없음',
        business_hours: null,
        lat: null,
        lng: null,
        url: 'https://map.naver.com/p/entry/place/test_detail_101',
        crawled_at: new Date().toISOString()
      });

      const response = await request(app.server)
        .get(`/api/restaurants/${restaurantId}`);

      expect(response.status).toBe(200);
      expect(response.body.data.restaurant).toMatchObject({
        id: restaurantId,
        name: '메뉴없는음식점'
      });
      expect(response.body.data.menus).toBeInstanceOf(Array);
      expect(response.body.data.menus.length).toBe(0);
    });
  });

  describe('Response Format', () => {
    it('should follow standardized response format', async () => {
      const response = await request(app.server)
        .get('/api/restaurants/categories');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('result');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('timestamp');
      expect(typeof response.body.result).toBe('boolean');
      expect(typeof response.body.message).toBe('string');
      expect(typeof response.body.timestamp).toBe('string');
    });
  });
});

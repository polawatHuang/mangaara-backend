const request = require('supertest');
const express = require('express');
const episodesRouter = require('../routes/episodes');
const db = require('../db');

jest.mock('../db');
jest.mock('multer', () => {
  const multer = () => ({
    array: () => (req, res, next) => {
      req.files = [
        { filename: 'page_1.jpg' },
        { filename: 'page_2.jpg' }
      ];
      next();
    }
  });
  multer.diskStorage = () => {};
  return multer;
});

const app = express();
app.use(express.json());
app.use('/api/episodes', episodesRouter);

describe('Episodes Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/episodes - OK Cases', () => {
    test('should get all episodes', async () => {
      db.execute.mockResolvedValueOnce([[
        { episode_id: 1, manga_id: 1, episode_number: 1 },
        { episode_id: 2, manga_id: 1, episode_number: 2 }
      ]]);

      const response = await request(app).get('/api/episodes');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
    });
  });

  describe('GET /api/episodes - NG Cases', () => {
    test('should return 500 on database error', async () => {
      db.execute.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app).get('/api/episodes');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/episodes/manga/:manga_id - OK Cases', () => {
    test('should get episodes by manga id', async () => {
      db.execute.mockResolvedValueOnce([[
        { episode_id: 1, manga_id: 1, episode_number: 1 }
      ]]);

      const response = await request(app).get('/api/episodes/manga/1');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    test('should return empty array if no episodes found', async () => {
      db.execute.mockResolvedValueOnce([[]]);

      const response = await request(app).get('/api/episodes/manga/999');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });
  });

  describe('GET /api/episodes/:id - OK Cases', () => {
    test('should get episode by id', async () => {
      db.execute.mockResolvedValueOnce([[
        { episode_id: 1, manga_id: 1, episode_number: 1 }
      ]]);

      const response = await request(app).get('/api/episodes/1');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('episode_id', 1);
    });
  });

  describe('GET /api/episodes/:id - NG Cases', () => {
    test('should return 404 if episode not found', async () => {
      db.execute.mockResolvedValueOnce([[]]);

      const response = await request(app).get('/api/episodes/999');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Episode not found');
    });
  });

  describe('GET /api/episodes/:episode_id/pages - OK Cases', () => {
    test('should get all pages for an episode', async () => {
      db.execute.mockResolvedValueOnce([[
        { id: 1, page_number: 1, episode_image: '/images/page1.jpg' },
        { id: 2, page_number: 2, episode_image: '/images/page2.jpg' }
      ]]);

      const response = await request(app).get('/api/episodes/1/pages');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
    });
  });

  describe('POST /api/episodes - OK Cases', () => {
    test('should create episode successfully', async () => {
      db.execute.mockResolvedValueOnce([{ insertId: 1 }]);

      const response = await request(app)
        .post('/api/episodes')
        .send({
          manga_id: 1,
          episode_number: 1,
          episode_name: 'Episode 1',
          created_date: '2024-01-01'
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('episode_id', 1);
    });
  });

  describe('POST /api/episodes - NG Cases', () => {
    test('should return 400 if manga_id is missing', async () => {
      const response = await request(app)
        .post('/api/episodes')
        .send({
          episode_number: 1
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    test('should return 400 if episode_number is missing', async () => {
      const response = await request(app)
        .post('/api/episodes')
        .send({
          manga_id: 1
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/episodes/pages/upload - OK Cases', () => {
    test('should upload episode pages successfully', async () => {
      db.execute
        .mockResolvedValueOnce([[{ manga_id: 1, manga_slug: 'test-manga' }]])
        .mockResolvedValueOnce([{ insertId: 10 }])
        .mockResolvedValueOnce([{}])
        .mockResolvedValueOnce([{}]);

      const response = await request(app)
        .post('/api/episodes/pages/upload')
        .send({
          manga_slug: 'test-manga',
          episode_number: 1
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('episode_id', 10);
      expect(response.body).toHaveProperty('pages_uploaded', 2);
    });
  });

  describe('POST /api/episodes/pages/upload - NG Cases', () => {
    test('should return 400 if manga_slug is missing', async () => {
      const response = await request(app)
        .post('/api/episodes/pages/upload')
        .send({
          episode_number: 1
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    test('should return 404 if manga not found', async () => {
      db.execute.mockResolvedValueOnce([[]]);

      const response = await request(app)
        .post('/api/episodes/pages/upload')
        .send({
          manga_slug: 'nonexistent',
          episode_number: 1
        });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Manga not found');
    });
  });

  describe('PUT /api/episodes/:id - OK Cases', () => {
    test('should update episode successfully', async () => {
      db.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const response = await request(app)
        .put('/api/episodes/1')
        .send({
          episode_name: 'Updated Episode',
          episode_number: 2
        });

      expect(response.status).toBe(204);
    });
  });

  describe('PUT /api/episodes/:id - NG Cases', () => {
    test('should return 404 if episode not found', async () => {
      db.execute.mockResolvedValueOnce([{ affectedRows: 0 }]);

      const response = await request(app)
        .put('/api/episodes/999')
        .send({
          episode_name: 'Updated'
        });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/episodes/:id - OK Cases', () => {
    test('should delete episode successfully', async () => {
      db.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const response = await request(app).delete('/api/episodes/1');

      expect(response.status).toBe(204);
    });
  });

  describe('DELETE /api/episodes/:id - NG Cases', () => {
    test('should return 404 if episode not found', async () => {
      db.execute.mockResolvedValueOnce([{ affectedRows: 0 }]);

      const response = await request(app).delete('/api/episodes/999');

      expect(response.status).toBe(404);
    });
  });
});

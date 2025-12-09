const request = require('supertest');
const express = require('express');
const mangaRouter = require('../routes/manga');
const db = require('../db');

jest.mock('../db');
jest.mock('multer', () => {
  const multer = () => ({
    single: () => (req, res, next) => {
      req.file = {
        filename: 'test-image.jpg',
        path: '/test/path/test-image.jpg'
      };
      next();
    }
  });
  multer.diskStorage = () => {};
  return multer;
});

const app = express();
app.use(express.json());
app.use('/api/manga', mangaRouter);

describe('Manga Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/manga - OK Cases', () => {
    test('should get all manga with mapped field names', async () => {
      db.execute.mockResolvedValueOnce([[
        {
          manga_id: 1,
          manga_name: 'Test Manga',
          manga_slug: 'test-manga',
          manga_disc: 'Test description',
          manga_bg_img: '/images/test-manga/cover.jpg',
          tag_id: '[1, 2]',
          created_date: '2024-01-01'
        }
      ]]);

      const response = await request(app).get('/api/manga');

      expect(response.status).toBe(200);
      expect(response.body[0]).toHaveProperty('name', 'Test Manga');
      expect(response.body[0]).toHaveProperty('slug', 'test-manga');
      expect(response.body[0]).toHaveProperty('description', 'Test description');
      expect(response.body[0]).toHaveProperty('background_image', '/images/test-manga/cover.jpg');
      expect(response.body[0]).toHaveProperty('tag', [1, 2]);
    });

    test('should get manga by slug query parameter', async () => {
      db.execute.mockResolvedValueOnce([[
        {
          manga_id: 1,
          manga_name: 'Test Manga',
          manga_slug: 'test-manga',
          manga_disc: 'Test description',
          manga_bg_img: '/images/test-manga/cover.jpg',
          tag_id: '[1]'
        }
      ]]);

      const response = await request(app).get('/api/manga?slug=test-manga');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('name', 'Test Manga');
    });

    test('should get manga by id query parameter', async () => {
      db.execute.mockResolvedValueOnce([[
        {
          manga_id: 1,
          manga_name: 'Test Manga',
          manga_slug: 'test-manga',
          manga_disc: 'Test description',
          manga_bg_img: '/images/test-manga/cover.jpg',
          tag_id: '[1]'
        }
      ]]);

      const response = await request(app).get('/api/manga?id=1');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('manga_id', 1);
    });

    test('should get trending manga', async () => {
      db.execute.mockResolvedValueOnce([[
        { manga_id: 1, manga_name: 'Trending Manga', view_count: 1000 }
      ]]);

      const response = await request(app).get('/api/manga/trending');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    test('should search manga by keyword', async () => {
      db.execute.mockResolvedValueOnce([[
        { manga_id: 1, manga_name: 'Naruto' }
      ]]);

      const response = await request(app).get('/api/manga/search?keyword=naruto');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    test('should get manga by tag', async () => {
      db.execute.mockResolvedValueOnce([[
        { manga_id: 1, manga_name: 'Action Manga', tag_id: '[1]' }
      ]]);

      const response = await request(app).get('/api/manga/tag/1');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('GET /api/manga - NG Cases', () => {
    test('should return 404 if manga not found by slug', async () => {
      db.execute.mockResolvedValueOnce([[]]);

      const response = await request(app).get('/api/manga?slug=nonexistent');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Manga not found');
    });

    test('should return 404 if manga not found by id', async () => {
      db.execute.mockResolvedValueOnce([[]]);

      const response = await request(app).get('/api/manga?id=999');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Manga not found');
    });

    test('should return 400 if search keyword is missing', async () => {
      const response = await request(app).get('/api/manga/search');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Keyword is required');
    });

    test('should return 500 on database error', async () => {
      db.execute.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app).get('/api/manga');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/manga - OK Cases', () => {
    test('should create new manga successfully', async () => {
      db.execute.mockResolvedValueOnce([{ insertId: 1 }]);

      const response = await request(app)
        .post('/api/manga')
        .send({
          manga_name: 'New Manga',
          manga_disc: 'Description',
          manga_slug: 'new-manga',
          tag_id: [1, 2]
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('manga_id', 1);
    });

    test('should create manga with string tag_id', async () => {
      db.execute.mockResolvedValueOnce([{ insertId: 2 }]);

      const response = await request(app)
        .post('/api/manga')
        .send({
          manga_name: 'New Manga',
          manga_disc: 'Description',
          manga_slug: 'new-manga',
          tag_id: '1'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('manga_id', 2);
    });
  });

  describe('POST /api/manga - NG Cases', () => {
    test('should return 400 if required fields are missing', async () => {
      const response = await request(app)
        .post('/api/manga')
        .send({
          manga_name: 'New Manga'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    test('should return 409 on duplicate manga slug', async () => {
      db.execute.mockRejectedValueOnce({ code: 'ER_DUP_ENTRY' });

      const response = await request(app)
        .post('/api/manga')
        .send({
          manga_name: 'Duplicate Manga',
          manga_disc: 'Description',
          manga_slug: 'duplicate-manga',
          tag_id: [1]
        });

      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty('error', 'Manga with this slug already exists');
    });
  });

  describe('PUT /api/manga/:id - OK Cases', () => {
    test('should update manga successfully', async () => {
      db.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const response = await request(app)
        .put('/api/manga/1')
        .send({
          manga_name: 'Updated Manga',
          manga_disc: 'Updated description',
          manga_slug: 'updated-manga',
          tag_id: [1, 2]
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Manga updated successfully');
    });

    test('should update manga with id in body', async () => {
      db.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const response = await request(app)
        .put('/api/manga')
        .send({
          id: 1,
          manga_name: 'Updated Manga',
          manga_disc: 'Updated description',
          manga_slug: 'updated-manga',
          tag_id: [1]
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Manga updated successfully');
    });
  });

  describe('PUT /api/manga/:id - NG Cases', () => {
    test('should return 400 if manga ID is missing', async () => {
      const response = await request(app)
        .put('/api/manga')
        .send({
          manga_name: 'Updated Manga'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Manga ID is required');
    });

    test('should return 404 if manga not found', async () => {
      db.execute.mockResolvedValueOnce([{ affectedRows: 0 }]);

      const response = await request(app)
        .put('/api/manga/999')
        .send({
          manga_name: 'Updated Manga',
          manga_slug: 'updated'
        });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Manga not found');
    });
  });

  describe('DELETE /api/manga/:id - OK Cases', () => {
    test('should delete manga successfully', async () => {
      db.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const response = await request(app).delete('/api/manga/1');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Manga deleted successfully');
    });

    test('should delete manga with id in body', async () => {
      db.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const response = await request(app)
        .delete('/api/manga')
        .send({ id: 1 });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Manga deleted successfully');
    });
  });

  describe('DELETE /api/manga/:id - NG Cases', () => {
    test('should return 400 if manga ID is missing', async () => {
      const response = await request(app).delete('/api/manga');

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Manga ID is required');
    });

    test('should return 404 if manga not found', async () => {
      db.execute.mockResolvedValueOnce([{ affectedRows: 0 }]);

      const response = await request(app).delete('/api/manga/999');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Manga not found');
    });
  });
});

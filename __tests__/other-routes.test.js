const request = require('supertest');
const express = require('express');
const commentsRouter = require('../routes/comments');
const recommendRouter = require('../routes/recommend');
const advertiseRouter = require('../routes/advertise');
const menubarRouter = require('../routes/menubar');
const favoritesRouter = require('../routes/favorites');
const db = require('../db');

jest.mock('../db');
jest.mock('multer', () => {
  const multer = () => ({
    single: () => (req, res, next) => {
      req.file = { filename: 'test.jpg', path: '/test/test.jpg' };
      next();
    }
  });
  multer.diskStorage = () => {};
  return multer;
});

const app = express();
app.use(express.json());
app.use('/api/comments', commentsRouter);
app.use('/api/recommend', recommendRouter);
app.use('/api/advertise', advertiseRouter);
app.use('/api/menubar', menubarRouter);
app.use('/api/favorites', favoritesRouter);

describe('Comments Routes', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('GET /api/comments/manga/:manga_id/episode/:episode - OK Cases', () => {
    test('should get all comments for an episode', async () => {
      db.execute.mockResolvedValueOnce([[
        { comment_id: 1, user_id: 1, comment: 'Great!', status: 'published' }
      ]]);

      const response = await request(app).get('/api/comments/manga/1/episode/1');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    test('should filter comments by status', async () => {
      db.execute.mockResolvedValueOnce([[
        { comment_id: 1, status: 'pending' }
      ]]);

      const response = await request(app)
        .get('/api/comments/manga/1/episode/1?status=pending');

      expect(response.status).toBe(200);
    });
  });

  describe('POST /api/comments - OK Cases', () => {
    test('should create comment successfully', async () => {
      db.execute.mockResolvedValueOnce([{ insertId: 1 }]);

      const response = await request(app)
        .post('/api/comments')
        .send({
          user_id: 1,
          manga_id: 1,
          episode: 1,
          comment: 'Nice episode!',
          parent_comment_id: null
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('comment_id', 1);
    });
  });

  describe('POST /api/comments - NG Cases', () => {
    test('should return 400 if required fields missing', async () => {
      const response = await request(app)
        .post('/api/comments')
        .send({ comment: 'Test' });

      expect(response.status).toBe(400);
    });
  });

  describe('PATCH /api/comments/:id/status - OK Cases', () => {
    test('should update comment status', async () => {
      db.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const response = await request(app)
        .patch('/api/comments/1/status')
        .send({ status: 'published' });

      expect(response.status).toBe(200);
    });
  });

  describe('PATCH /api/comments/:id/status - NG Cases', () => {
    test('should return 400 for invalid status', async () => {
      const response = await request(app)
        .patch('/api/comments/1/status')
        .send({ status: 'invalid' });

      expect(response.status).toBe(400);
    });

    test('should return 404 if comment not found', async () => {
      db.execute.mockResolvedValueOnce([{ affectedRows: 0 }]);

      const response = await request(app)
        .patch('/api/comments/999/status')
        .send({ status: 'published' });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/comments/:id - OK Cases', () => {
    test('should delete comment successfully', async () => {
      db.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const response = await request(app).delete('/api/comments/1');

      expect(response.status).toBe(204);
    });
  });
});

describe('Recommend Routes', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('GET /api/recommend - OK Cases', () => {
    test('should get all recommendations', async () => {
      db.execute.mockResolvedValueOnce([[
        { recommend_id: 1, name: 'Test Manga', status: 'published' }
      ]]);

      const response = await request(app).get('/api/recommend');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    test('should filter by status', async () => {
      db.execute.mockResolvedValueOnce([[
        { recommend_id: 1, status: 'pending' }
      ]]);

      const response = await request(app).get('/api/recommend?status=pending');

      expect(response.status).toBe(200);
    });
  });

  describe('POST /api/recommend - OK Cases', () => {
    test('should create recommendation successfully', async () => {
      db.execute.mockResolvedValueOnce([{ insertId: 1 }]);

      const response = await request(app)
        .post('/api/recommend')
        .send({
          name: 'Test Manga',
          slug: 'test-manga',
          commenter: 'User1',
          comment: 'Great manga!'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('recommend_id', 1);
      expect(response.body).toHaveProperty('status', 'pending');
    });
  });

  describe('POST /api/recommend - NG Cases', () => {
    test('should return 400 if required fields missing', async () => {
      const response = await request(app)
        .post('/api/recommend')
        .send({ name: 'Test' });

      expect(response.status).toBe(400);
    });
  });

  describe('PUT /api/recommend/:id - OK Cases', () => {
    test('should update recommendation', async () => {
      db.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const response = await request(app)
        .put('/api/recommend/1')
        .send({ comment: 'Updated comment' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Recommendation updated successfully');
    });
  });

  describe('PUT /api/recommend/:id - NG Cases', () => {
    test('should return 404 if not found', async () => {
      db.execute.mockResolvedValueOnce([{ affectedRows: 0 }]);

      const response = await request(app)
        .put('/api/recommend/999')
        .send({ comment: 'Updated' });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/recommend/:id - OK Cases', () => {
    test('should delete recommendation', async () => {
      db.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const response = await request(app).delete('/api/recommend/1');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Recommendation deleted successfully');
    });
  });
});

describe('Advertise Routes', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('POST /api/advertise - OK Cases', () => {
    test('should create advertisement', async () => {
      db.execute.mockResolvedValueOnce([{ insertId: 1 }]);

      const response = await request(app)
        .post('/api/advertise')
        .send({
          name: 'Ad 1',
          link_url: 'https://example.com'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('ad_id', 1);
    });
  });

  describe('PATCH /api/advertise/:id/toggle - OK Cases', () => {
    test('should toggle ad status', async () => {
      db.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const response = await request(app).patch('/api/advertise/1/toggle');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Advertisement status toggled successfully');
    });
  });

  describe('DELETE /api/advertise/:id - OK Cases', () => {
    test('should delete advertisement', async () => {
      db.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const response = await request(app).delete('/api/advertise/1');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Advertisement deleted successfully');
    });
  });
});

describe('Menubar Routes', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('POST /api/menubar - OK Cases', () => {
    test('should create menu item', async () => {
      db.execute.mockResolvedValueOnce([{ insertId: 1 }]);

      const response = await request(app)
        .post('/api/menubar')
        .send({
          name: 'Home',
          href: '/home'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('menu_id', 1);
      expect(response.body).toHaveProperty('name', 'Home');
    });
  });

  describe('POST /api/menubar - NG Cases', () => {
    test('should return 400 if name missing', async () => {
      const response = await request(app)
        .post('/api/menubar')
        .send({ href: '/home' });

      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /api/menubar/:id - OK Cases', () => {
    test('should delete menu item', async () => {
      db.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const response = await request(app).delete('/api/menubar/1');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Menu item deleted successfully');
    });
  });
});

describe('Favorites Routes', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('POST /api/favorites - OK Cases', () => {
    test('should add favorite', async () => {
      db.execute.mockResolvedValueOnce([{ insertId: 1 }]);

      const response = await request(app)
        .post('/api/favorites')
        .send({
          user_id: 1,
          manga_id: 1
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id', 1);
    });
  });

  describe('POST /api/favorites - NG Cases', () => {
    test('should return 409 if already favorited', async () => {
      db.execute.mockRejectedValueOnce({ code: 'ER_DUP_ENTRY' });

      const response = await request(app)
        .post('/api/favorites')
        .send({
          user_id: 1,
          manga_id: 1
        });

      expect(response.status).toBe(409);
    });
  });

  describe('GET /api/favorites/user/:user_id - OK Cases', () => {
    test('should get user favorites', async () => {
      db.execute.mockResolvedValueOnce([[
        { manga_id: 1, manga_name: 'Test Manga' }
      ]]);

      const response = await request(app).get('/api/favorites/user/1');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });
});

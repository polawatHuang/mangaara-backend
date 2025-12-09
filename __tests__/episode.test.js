const request = require('supertest');
const express = require('express');
const episodeRouter = require('../routes/episode');
const db = require('../db');

jest.mock('../db');
jest.mock('multer', () => {
  const multer = () => ({
    array: () => (req, res, next) => {
      req.files = [
        { filename: 'page_1.jpg', path: '/test/path/page_1.jpg' },
        { filename: 'page_2.jpg', path: '/test/path/page_2.jpg' }
      ];
      next();
    }
  });
  multer.diskStorage = () => {};
  return multer;
});

const app = express();
app.use(express.json());
app.use('/api/episode', episodeRouter);

describe('Episode Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/episode - OK Cases', () => {
    test('should create episode with images successfully', async () => {
      db.execute
        .mockResolvedValueOnce([[{ manga_id: 1 }]]) // Find manga
        .mockResolvedValueOnce([{ insertId: 10 }]) // Insert manga_episodes
        .mockResolvedValueOnce([{}]) // Insert first episode
        .mockResolvedValueOnce([{}]); // Insert second episode

      const response = await request(app)
        .post('/api/episode')
        .send({
          manga_name: 'test-manga',
          episode_number: 1,
          totalPage: 2
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('episode_id', 10);
      expect(response.body).toHaveProperty('images');
      expect(response.body.images).toHaveLength(2);
    });

    test('should create episode for existing manga', async () => {
      db.execute
        .mockResolvedValueOnce([[{ manga_id: 5 }]])
        .mockResolvedValueOnce([{ insertId: 20 }])
        .mockResolvedValueOnce([{}]);

      const response = await request(app)
        .post('/api/episode')
        .send({
          manga_name: 'existing-manga',
          episode_number: 2,
          totalPage: 1
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('episode_id', 20);
    });
  });

  describe('POST /api/episode - NG Cases', () => {
    test('should return 400 if manga_name is missing', async () => {
      const response = await request(app)
        .post('/api/episode')
        .send({
          episode_number: 1,
          totalPage: 10
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    test('should return 400 if episode_number is missing', async () => {
      const response = await request(app)
        .post('/api/episode')
        .send({
          manga_name: 'test-manga',
          totalPage: 10
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    test('should return 400 if totalPage is missing', async () => {
      const response = await request(app)
        .post('/api/episode')
        .send({
          manga_name: 'test-manga',
          episode_number: 1
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    test('should return 404 if manga not found', async () => {
      db.execute.mockResolvedValueOnce([[]]);

      const response = await request(app)
        .post('/api/episode')
        .send({
          manga_name: 'nonexistent-manga',
          episode_number: 1,
          totalPage: 10
        });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Manga not found');
    });

    test('should return 500 on database error', async () => {
      db.execute.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .post('/api/episode')
        .send({
          manga_name: 'test-manga',
          episode_number: 1,
          totalPage: 10
        });

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });
  });
});

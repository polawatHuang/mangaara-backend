const request = require('supertest');
const express = require('express');
const tagRouter = require('../routes/tag');
const db = require('../db');

jest.mock('../db');

const app = express();
app.use(express.json());
app.use('/api/tag', tagRouter);

describe('Tag Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/tag - OK Cases', () => {
    test('should get all tags with mapped field name', async () => {
      db.execute.mockResolvedValueOnce([[
        { tag_id: 1, tag_name: 'Action' },
        { tag_id: 2, tag_name: 'Comedy' }
      ]]);

      const response = await request(app).get('/api/tag');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body[0]).toHaveProperty('name', 'Action');
      expect(response.body[1]).toHaveProperty('name', 'Comedy');
    });

    test('should return empty array if no tags', async () => {
      db.execute.mockResolvedValueOnce([[]]);

      const response = await request(app).get('/api/tag');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });
  });

  describe('GET /api/tag - NG Cases', () => {
    test('should return 500 on database error', async () => {
      db.execute.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app).get('/api/tag');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/tag/:id - OK Cases', () => {
    test('should get tag by id with mapped field name', async () => {
      db.execute.mockResolvedValueOnce([[
        { tag_id: 1, tag_name: 'Action' }
      ]]);

      const response = await request(app).get('/api/tag/1');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('tag_id', 1);
      expect(response.body).toHaveProperty('name', 'Action');
    });
  });

  describe('GET /api/tag/:id - NG Cases', () => {
    test('should return 404 if tag not found', async () => {
      db.execute.mockResolvedValueOnce([[]]);

      const response = await request(app).get('/api/tag/999');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Tag not found');
    });

    test('should return 500 on database error', async () => {
      db.execute.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app).get('/api/tag/1');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/tag - OK Cases', () => {
    test('should create tag with "name" field', async () => {
      db.execute.mockResolvedValueOnce([{ insertId: 1 }]);

      const response = await request(app)
        .post('/api/tag')
        .send({ name: 'Action' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('tag_id', 1);
      expect(response.body).toHaveProperty('name', 'Action');
    });

    test('should create tag with "tag_name" field', async () => {
      db.execute.mockResolvedValueOnce([{ insertId: 2 }]);

      const response = await request(app)
        .post('/api/tag')
        .send({ tag_name: 'Comedy' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('tag_id', 2);
      expect(response.body).toHaveProperty('name', 'Comedy');
    });
  });

  describe('POST /api/tag - NG Cases', () => {
    test('should return 400 if tag name is missing', async () => {
      const response = await request(app)
        .post('/api/tag')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Tag name is required');
    });

    test('should return 409 if tag already exists', async () => {
      db.execute.mockRejectedValueOnce({ code: 'ER_DUP_ENTRY' });

      const response = await request(app)
        .post('/api/tag')
        .send({ name: 'Existing Tag' });

      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty('error', 'Tag already exists');
    });

    test('should return 500 on database error', async () => {
      db.execute.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .post('/api/tag')
        .send({ name: 'New Tag' });

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('PUT /api/tag/:id - OK Cases', () => {
    test('should update tag successfully', async () => {
      db.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const response = await request(app)
        .put('/api/tag/1')
        .send({ tag_name: 'Updated Action' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Tag updated successfully');
    });
  });

  describe('PUT /api/tag/:id - NG Cases', () => {
    test('should return 400 if tag name is missing', async () => {
      const response = await request(app)
        .put('/api/tag/1')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Tag name is required');
    });

    test('should return 404 if tag not found', async () => {
      db.execute.mockResolvedValueOnce([{ affectedRows: 0 }]);

      const response = await request(app)
        .put('/api/tag/999')
        .send({ tag_name: 'Updated Tag' });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Tag not found');
    });

    test('should return 500 on database error', async () => {
      db.execute.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .put('/api/tag/1')
        .send({ tag_name: 'Updated Tag' });

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('DELETE /api/tag/:id - OK Cases', () => {
    test('should delete tag successfully', async () => {
      db.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const response = await request(app).delete('/api/tag/1');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Tag deleted successfully');
    });
  });

  describe('DELETE /api/tag/:id - NG Cases', () => {
    test('should return 404 if tag not found', async () => {
      db.execute.mockResolvedValueOnce([{ affectedRows: 0 }]);

      const response = await request(app).delete('/api/tag/999');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Tag not found');
    });

    test('should return 500 on database error', async () => {
      db.execute.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app).delete('/api/tag/1');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });
  });
});

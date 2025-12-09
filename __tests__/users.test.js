const request = require('supertest');
const express = require('express');
const usersRouter = require('../routes/users');
const db = require('../db');

jest.mock('../db');

const app = express();
app.use(express.json());
app.use('/api/users', usersRouter);

describe('Users Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/users - OK Cases', () => {
    test('should get all users without passwords', async () => {
      db.execute.mockResolvedValueOnce([[
        { user_id: 1, username: 'user1', email: 'user1@example.com', role: 'user' },
        { user_id: 2, username: 'user2', email: 'user2@example.com', role: 'admin' }
      ]]);

      const response = await request(app).get('/api/users');

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body[0]).not.toHaveProperty('password');
    });

    test('should return empty array if no users', async () => {
      db.execute.mockResolvedValueOnce([[]]);

      const response = await request(app).get('/api/users');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });
  });

  describe('GET /api/users - NG Cases', () => {
    test('should return 500 on database error', async () => {
      db.execute.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app).get('/api/users');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/users/:id - OK Cases', () => {
    test('should get user by id without password', async () => {
      db.execute.mockResolvedValueOnce([[
        { user_id: 1, username: 'testuser', email: 'test@example.com', role: 'user' }
      ]]);

      const response = await request(app).get('/api/users/1');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('user_id', 1);
      expect(response.body).not.toHaveProperty('password');
    });
  });

  describe('GET /api/users/:id - NG Cases', () => {
    test('should return 404 if user not found', async () => {
      db.execute.mockResolvedValueOnce([[]]);

      const response = await request(app).get('/api/users/999');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'User not found');
    });

    test('should return 500 on database error', async () => {
      db.execute.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app).get('/api/users/1');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/users/:id/change-password - OK Cases', () => {
    test('should change password successfully', async () => {
      const bcrypt = require('bcryptjs');
      bcrypt.compare = jest.fn().mockResolvedValue(true);

      db.execute
        .mockResolvedValueOnce([[{ user_id: 1, password: 'oldhash' }]]) // Get user
        .mockResolvedValueOnce([{ affectedRows: 1 }]) // Update password
        .mockResolvedValueOnce([{}]); // Delete sessions

      const response = await request(app)
        .post('/api/users/1/change-password')
        .send({
          old_password: 'oldpass123',
          new_password: 'newpass123'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Password changed successfully');
    });
  });

  describe('POST /api/users/:id/change-password - NG Cases', () => {
    test('should return 400 if old_password missing', async () => {
      const response = await request(app)
        .post('/api/users/1/change-password')
        .send({
          new_password: 'newpass123'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Old and new passwords are required');
    });

    test('should return 400 if new_password missing', async () => {
      const response = await request(app)
        .post('/api/users/1/change-password')
        .send({
          old_password: 'oldpass123'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Old and new passwords are required');
    });

    test('should return 404 if user not found', async () => {
      db.execute.mockResolvedValueOnce([[]]);

      const response = await request(app)
        .post('/api/users/999/change-password')
        .send({
          old_password: 'oldpass123',
          new_password: 'newpass123'
        });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'User not found');
    });

    test('should return 401 if old password is incorrect', async () => {
      const bcrypt = require('bcryptjs');
      bcrypt.compare = jest.fn().mockResolvedValue(false);

      db.execute.mockResolvedValueOnce([[{ user_id: 1, password: 'hash' }]]);

      const response = await request(app)
        .post('/api/users/1/change-password')
        .send({
          old_password: 'wrongpass',
          new_password: 'newpass123'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Old password is incorrect');
    });

    test('should return 500 on database error', async () => {
      db.execute.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .post('/api/users/1/change-password')
        .send({
          old_password: 'oldpass123',
          new_password: 'newpass123'
        });

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('PUT /api/users/:id - OK Cases', () => {
    test('should update user successfully', async () => {
      db.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const response = await request(app)
        .put('/api/users/1')
        .send({
          username: 'updateduser',
          email: 'updated@example.com',
          role: 'admin'
        });

      expect(response.status).toBe(204);
    });

    test('should update partial user data', async () => {
      db.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const response = await request(app)
        .put('/api/users/1')
        .send({
          username: 'updateduser'
        });

      expect(response.status).toBe(204);
    });
  });

  describe('PUT /api/users/:id - NG Cases', () => {
    test('should return 404 if user not found', async () => {
      db.execute.mockResolvedValueOnce([{ affectedRows: 0 }]);

      const response = await request(app)
        .put('/api/users/999')
        .send({
          username: 'updateduser'
        });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'User not found');
    });

    test('should return 500 on database error', async () => {
      db.execute.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .put('/api/users/1')
        .send({
          username: 'updateduser'
        });

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('DELETE /api/users/:id - OK Cases', () => {
    test('should delete user successfully', async () => {
      db.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const response = await request(app).delete('/api/users/1');

      expect(response.status).toBe(204);
    });
  });

  describe('DELETE /api/users/:id - NG Cases', () => {
    test('should return 404 if user not found', async () => {
      db.execute.mockResolvedValueOnce([{ affectedRows: 0 }]);

      const response = await request(app).delete('/api/users/999');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'User not found');
    });

    test('should return 500 on database error', async () => {
      db.execute.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app).delete('/api/users/1');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });
  });
});

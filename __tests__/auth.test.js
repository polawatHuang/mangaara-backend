const request = require('supertest');
const express = require('express');
const authRouter = require('../routes/auth');
const db = require('../db');

// Mock the database
jest.mock('../db');

const app = express();
app.use(express.json());
app.use('/api/auth', authRouter);

describe('Auth Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/register - OK Cases', () => {
    test('should register a new user successfully', async () => {
      db.execute.mockResolvedValueOnce([{ insertId: 1 }]);

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: 'password123',
          role: 'user'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('user_id');
      expect(response.body).toHaveProperty('message', 'User registered successfully');
      expect(db.execute).toHaveBeenCalledTimes(1);
    });

    test('should register user with default role if not specified', async () => {
      db.execute.mockResolvedValueOnce([{ insertId: 2 }]);

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser2',
          email: 'test2@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body.user_id).toBe(2);
    });
  });

  describe('POST /api/auth/register - NG Cases', () => {
    test('should return 400 if username is missing', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Username, email, and password are required');
    });

    test('should return 400 if email is missing', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          password: 'password123'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Username, email, and password are required');
    });

    test('should return 400 if password is missing', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          email: 'test@example.com'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Username, email, and password are required');
    });

    test('should return 409 if user already exists', async () => {
      db.execute.mockRejectedValueOnce({ code: 'ER_DUP_ENTRY' });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'existinguser',
          email: 'existing@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty('error', 'User already exists');
    });

    test('should return 500 for database errors', async () => {
      db.execute.mockRejectedValueOnce(new Error('Database connection failed'));

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: 'password123'
        });

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/auth/login - OK Cases', () => {
    test('should login successfully with valid credentials', async () => {
      const hashedPassword = '$2a$10$abcdefghijklmnopqrstuv'; // Mock hashed password
      db.execute
        .mockResolvedValueOnce([[{ user_id: 1, password: hashedPassword, role: 'user' }]])
        .mockResolvedValueOnce([{ insertId: 100 }]);

      // Mock bcrypt comparison
      const bcrypt = require('bcryptjs');
      bcrypt.compare = jest.fn().mockResolvedValue(true);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'password123'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('token');
      expect(response.body).toHaveProperty('user_id', 1);
      expect(response.body).toHaveProperty('role', 'user');
    });
  });

  describe('POST /api/auth/login - NG Cases', () => {
    test('should return 400 if username is missing', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          password: 'password123'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Username and password are required');
    });

    test('should return 400 if password is missing', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Username and password are required');
    });

    test('should return 401 if user not found', async () => {
      db.execute.mockResolvedValueOnce([[]]);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'nonexistent',
          password: 'password123'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Invalid username or password');
    });

    test('should return 401 if password is incorrect', async () => {
      db.execute.mockResolvedValueOnce([[{ user_id: 1, password: 'hashed', role: 'user' }]]);
      
      const bcrypt = require('bcryptjs');
      bcrypt.compare = jest.fn().mockResolvedValue(false);

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'wrongpassword'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error', 'Invalid username or password');
    });
  });

  describe('POST /api/auth/verify - OK Cases', () => {
    test('should verify valid token', async () => {
      db.execute.mockResolvedValueOnce([[{ 
        user_id: 1, 
        role: 'user',
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        is_active: 1
      }]]);

      const response = await request(app)
        .post('/api/auth/verify')
        .send({
          token: 'validtoken123'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('valid', true);
      expect(response.body).toHaveProperty('user_id', 1);
    });
  });

  describe('POST /api/auth/verify - NG Cases', () => {
    test('should return 400 if token is missing', async () => {
      const response = await request(app)
        .post('/api/auth/verify')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Token is required');
    });

    test('should return 401 if token is invalid', async () => {
      db.execute.mockResolvedValueOnce([[]]);

      const response = await request(app)
        .post('/api/auth/verify')
        .send({
          token: 'invalidtoken'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('valid', false);
    });

    test('should return 401 if token is expired', async () => {
      db.execute.mockResolvedValueOnce([[{ 
        user_id: 1,
        expires_at: new Date(Date.now() - 1000).toISOString(),
        is_active: 1
      }]]);

      const response = await request(app)
        .post('/api/auth/verify')
        .send({
          token: 'expiredtoken'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('valid', false);
    });

    test('should return 401 if session is inactive', async () => {
      db.execute.mockResolvedValueOnce([[{ 
        user_id: 1,
        expires_at: new Date(Date.now() + 86400000).toISOString(),
        is_active: 0
      }]]);

      const response = await request(app)
        .post('/api/auth/verify')
        .send({
          token: 'inactivetoken'
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('valid', false);
    });
  });

  describe('POST /api/auth/logout - OK Cases', () => {
    test('should logout successfully', async () => {
      db.execute.mockResolvedValueOnce([{ affectedRows: 1 }]);

      const response = await request(app)
        .post('/api/auth/logout')
        .send({
          token: 'validtoken123'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message', 'Logged out successfully');
    });
  });

  describe('POST /api/auth/logout - NG Cases', () => {
    test('should return 400 if token is missing', async () => {
      const response = await request(app)
        .post('/api/auth/logout')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Token is required');
    });

    test('should return 404 if token not found', async () => {
      db.execute.mockResolvedValueOnce([{ affectedRows: 0 }]);

      const response = await request(app)
        .post('/api/auth/logout')
        .send({
          token: 'nonexistenttoken'
        });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Session not found');
    });
  });
});

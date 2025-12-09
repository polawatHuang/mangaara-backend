const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// Helper function to generate session token
function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Register a new user
router.post('/register', async (req, res) => {
  const { email, password, display_name } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Check if user already exists
    const [existing] = await db.execute('SELECT user_id FROM users WHERE email = ?', [email]);
    
    if (existing.length > 0) {
      return res.status(409).json({ error: 'Email already exists' });
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // Insert user
    const [result] = await db.execute(
      'INSERT INTO users (email, password_hash, display_name, role, is_active) VALUES (?, ?, ?, ?, ?)',
      [email, password_hash, display_name || null, 'user', true]
    );

    res.status(201).json({ 
      user_id: result.insertId,
      email,
      display_name: display_name || null
    });
  } catch (err) {
    console.error("[Error registering user]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Login user
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Missing email or password' });
  }

  try {
    // Get user
    const [users] = await db.execute(
      'SELECT user_id, email, password_hash, display_name, role, is_active FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = users[0];

    // Check if user is active
    if (!user.is_active) {
      return res.status(403).json({ error: 'Account is deactivated' });
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password_hash);

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate session token
    const token = generateToken();
    const expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Create session
    await db.execute(
      'INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)',
      [user.user_id, token, expires_at]
    );

    // Update last login
    await db.execute(
      'UPDATE users SET last_login = NOW() WHERE user_id = ?',
      [user.user_id]
    );

    res.json({
      token,
      user: {
        user_id: user.user_id,
        email: user.email,
        display_name: user.display_name
      }
    });
  } catch (err) {
    console.error("[Error logging in]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Logout user
router.post('/logout', async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ error: 'Token required' });
  }

  try {
    await db.execute('DELETE FROM sessions WHERE token = ?', [token]);
    res.json({ message: 'Logout successful' });
  } catch (err) {
    console.error("[Error logging out]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Verify session token
router.post('/verify', async (req, res) => {
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ error: 'Token is required' });
  }

  try {
    const [sessions] = await db.execute(
      `SELECT s.session_id, s.expires_at, u.user_id, u.email, u.display_name, u.role, u.is_active
       FROM sessions s
       JOIN users u ON s.user_id = u.user_id
       WHERE s.token = ?`,
      [token]
    );

    if (sessions.length === 0) {
      return res.status(401).json({ valid: false, error: 'Invalid or expired token' });
    }

    const session = sessions[0];

    // Check if token is expired
    if (new Date(session.expires_at) < new Date()) {
      await db.execute('DELETE FROM sessions WHERE token = ?', [token]);
      return res.status(401).json({ valid: false, error: 'Invalid or expired token' });
    }

    // Check if user is active
    if (!session.is_active) {
      return res.status(403).json({ valid: false, error: 'Account is deactivated' });
    }

    res.json({
      valid: true,
      user: {
        user_id: session.user_id,
        email: session.email,
        display_name: session.display_name
      }
    });
  } catch (err) {
    console.error("[Error verifying token]", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

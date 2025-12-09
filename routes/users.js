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
  const { email, password, display_name, role } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    // Check if user already exists
    const [existing] = await db.execute('SELECT user_id FROM users WHERE email = ?', [email]);
    
    if (existing.length > 0) {
      return res.status(409).json({ error: 'User already exists' });
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // Insert user
    const [result] = await db.execute(
      'INSERT INTO users (email, password_hash, display_name, role, is_active) VALUES (?, ?, ?, ?, ?)',
      [email, password_hash, display_name || null, role || 'user', true]
    );

    res.status(201).json({ 
      user_id: result.insertId,
      email,
      display_name,
      role: role || 'user',
      message: 'User registered successfully' 
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
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    // Get user
    const [users] = await db.execute(
      'SELECT user_id, email, password_hash, display_name, role, is_active FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = users[0];

    // Check if user is active
    if (!user.is_active) {
      return res.status(403).json({ error: 'Account is deactivated' });
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password_hash);

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
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
        display_name: user.display_name,
        role: user.role
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
    return res.status(400).json({ error: 'Token is required' });
  }

  try {
    await db.execute('DELETE FROM sessions WHERE token = ?', [token]);
    res.json({ message: 'Logged out successfully' });
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
      return res.status(401).json({ error: 'Invalid token' });
    }

    const session = sessions[0];

    // Check if token is expired
    if (new Date(session.expires_at) < new Date()) {
      await db.execute('DELETE FROM sessions WHERE token = ?', [token]);
      return res.status(401).json({ error: 'Token expired' });
    }

    // Check if user is active
    if (!session.is_active) {
      return res.status(403).json({ error: 'Account is deactivated' });
    }

    res.json({
      valid: true,
      user: {
        user_id: session.user_id,
        email: session.email,
        display_name: session.display_name,
        role: session.role
      }
    });
  } catch (err) {
    console.error("[Error verifying token]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Get all users (admin only)
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT user_id, email, display_name, role, is_active, last_login, created_at FROM users ORDER BY created_at DESC'
    );
    res.json(rows);
  } catch (err) {
    console.error("[Error fetching users]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Get a specific user
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT user_id, email, display_name, role, is_active, last_login, created_at FROM users WHERE user_id = ?',
      [req.params.id]
    );
    
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error("[Error fetching user]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Update user
router.put('/:id', async (req, res) => {
  const { email, display_name, role, is_active } = req.body;

  try {
    const updateFields = [];
    const updateValues = [];

    if (email !== undefined) {
      updateFields.push('email = ?');
      updateValues.push(email);
    }
    if (display_name !== undefined) {
      updateFields.push('display_name = ?');
      updateValues.push(display_name);
    }
    if (role !== undefined) {
      updateFields.push('role = ?');
      updateValues.push(role);
    }
    if (is_active !== undefined) {
      updateFields.push('is_active = ?');
      updateValues.push(is_active);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updateValues.push(req.params.id);

    await db.execute(
      `UPDATE users SET ${updateFields.join(', ')} WHERE user_id = ?`,
      updateValues
    );
    res.sendStatus(204);
  } catch (err) {
    console.error("[Error updating user]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Change password
router.post('/:id/change-password', async (req, res) => {
  const { old_password, new_password } = req.body;

  if (!old_password || !new_password) {
    return res.status(400).json({ error: 'Old and new passwords are required' });
  }

  try {
    // Get current password hash
    const [users] = await db.execute(
      'SELECT password_hash FROM users WHERE user_id = ?',
      [req.params.id]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify old password
    const isValid = await bcrypt.compare(old_password, users[0].password_hash);

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid old password' });
    }

    // Hash new password
    const new_password_hash = await bcrypt.hash(new_password, 10);

    // Update password
    await db.execute(
      'UPDATE users SET password_hash = ? WHERE user_id = ?',
      [new_password_hash, req.params.id]
    );

    // Delete all sessions for this user
    await db.execute('DELETE FROM sessions WHERE user_id = ?', [req.params.id]);

    res.json({ message: 'Password changed successfully. Please login again.' });
  } catch (err) {
    console.error("[Error changing password]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Delete user
router.delete('/:id', async (req, res) => {
  try {
    await db.execute('DELETE FROM users WHERE user_id = ?', [req.params.id]);
    res.sendStatus(204);
  } catch (err) {
    console.error("[Error deleting user]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Clean up expired sessions (can be called periodically)
router.post('/sessions/cleanup', async (req, res) => {
  try {
    const [result] = await db.execute('DELETE FROM sessions WHERE expires_at < NOW()');
    res.json({ message: 'Cleanup completed', deleted: result.affectedRows });
  } catch (err) {
    console.error("[Error cleaning up sessions]", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

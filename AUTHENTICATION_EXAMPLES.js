/**
 * Example: How to protect routes with authentication middleware
 * 
 * This file shows how to use the auth middleware in your routes
 * to require authentication or admin access.
 */

const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAuth, requireAdmin, requireUserOrAdmin } = require('../middleware/auth');

// ============================================
// PUBLIC ROUTES (No authentication required)
// ============================================

// Anyone can view manga
router.get('/public/manga', async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM manga LIMIT 10');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// PROTECTED ROUTES (Authentication required)
// ============================================

// Only authenticated users can add to favorites
router.post('/protected/favorites', requireAuth, async (req, res) => {
  // req.user is available here with user info
  const { manga_id } = req.body;
  const user_id = req.user.user_id; // From authenticated session
  
  try {
    const [result] = await db.execute(
      'INSERT INTO favorite_manga (user_id, manga_id) VALUES (?, ?)',
      [user_id, manga_id]
    );
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// User can only view their own profile
router.get('/protected/profile/:id', requireAuth, requireUserOrAdmin, async (req, res) => {
  // This checks if req.user.user_id === req.params.id OR if user is admin
  try {
    const [rows] = await db.execute(
      'SELECT user_id, email, display_name, role FROM users WHERE user_id = ?',
      [req.params.id]
    );
    
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// ADMIN-ONLY ROUTES
// ============================================

// Only admins can approve comments
router.patch('/admin/comments/:id/approve', requireAdmin, async (req, res) => {
  try {
    await db.execute(
      'UPDATE comment_on_episode SET status = ? WHERE comment_id = ?',
      ['published', req.params.id]
    );
    res.sendStatus(204);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Only admins can delete users
router.delete('/admin/users/:id', requireAdmin, async (req, res) => {
  try {
    await db.execute('DELETE FROM users WHERE user_id = ?', [req.params.id]);
    res.sendStatus(204);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Only admins can view all sessions
router.get('/admin/sessions', requireAdmin, async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT s.session_id, s.token, s.expires_at, s.created_at,
             u.email, u.display_name, u.role
      FROM sessions s
      JOIN users u ON s.user_id = u.user_id
      ORDER BY s.created_at DESC
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

/* ============================================
 * HOW TO USE IN YOUR FRONTEND
 * ============================================
 * 
 * 1. LOGIN
 * --------
 * POST /api/users/login
 * Body: { email: "user@example.com", password: "password123" }
 * 
 * Response: { 
 *   token: "abc123...",
 *   user: { user_id: 1, email: "user@example.com", role: "user" }
 * }
 * 
 * Store the token in localStorage or sessionStorage:
 * localStorage.setItem('authToken', response.token);
 * 
 * 
 * 2. MAKING AUTHENTICATED REQUESTS
 * ---------------------------------
 * Include the token in the Authorization header:
 * 
 * fetch('/api/protected/favorites', {
 *   method: 'POST',
 *   headers: {
 *     'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
 *     'Content-Type': 'application/json'
 *   },
 *   body: JSON.stringify({ manga_id: 1 })
 * });
 * 
 * Or use x-auth-token header:
 * 
 * fetch('/api/protected/favorites', {
 *   method: 'POST',
 *   headers: {
 *     'x-auth-token': localStorage.getItem('authToken'),
 *     'Content-Type': 'application/json'
 *   },
 *   body: JSON.stringify({ manga_id: 1 })
 * });
 * 
 * 
 * 3. VERIFY TOKEN ON PAGE LOAD
 * -----------------------------
 * POST /api/users/verify
 * Body: { token: localStorage.getItem('authToken') }
 * 
 * Response: { 
 *   valid: true, 
 *   user: { user_id: 1, email: "user@example.com", role: "user" }
 * }
 * 
 * 
 * 4. LOGOUT
 * ---------
 * POST /api/users/logout
 * Body: { token: localStorage.getItem('authToken') }
 * 
 * Then remove from storage:
 * localStorage.removeItem('authToken');
 * 
 * 
 * 5. HANDLE EXPIRED TOKENS
 * -------------------------
 * If you get a 401 error, the token is invalid or expired.
 * Redirect user to login page and clear the token:
 * 
 * if (response.status === 401) {
 *   localStorage.removeItem('authToken');
 *   window.location.href = '/login';
 * }
 * 
 * ============================================
 */

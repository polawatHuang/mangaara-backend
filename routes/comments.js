const express = require('express');
const router = express.Router();
const db = require('../db');

// Create a new comment on an episode
router.post('/', async (req, res) => {
  const { manga_id, episode, commenter, comment, status } = req.body;

  if (!manga_id || !episode || !commenter || !comment) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const [result] = await db.execute(
      'INSERT INTO comment_on_episode (manga_id, episode, commenter, comment, status) VALUES (?, ?, ?, ?, ?)',
      [manga_id, episode, commenter, comment, status || 'pending']
    );

    res.status(201).json({ id: result.insertId, message: 'Comment created successfully' });
  } catch (err) {
    console.error("[Error creating comment]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Get all comments for a specific episode
router.get('/manga/:manga_id/episode/:episode', async (req, res) => {
  const status = req.query.status || 'published';
  
  try {
    const [rows] = await db.execute(
      'SELECT * FROM comment_on_episode WHERE manga_id = ? AND episode = ? AND status = ? ORDER BY created_date DESC',
      [req.params.manga_id, req.params.episode, status]
    );
    res.json(rows);
  } catch (err) {
    console.error("[Error fetching comments]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Get all comments (for admin - can filter by status)
router.get('/', async (req, res) => {
  const status = req.query.status;
  
  try {
    let query = 'SELECT * FROM comment_on_episode';
    let params = [];
    
    if (status) {
      query += ' WHERE status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY created_date DESC';
    
    const [rows] = await db.execute(query, params);
    res.json(rows);
  } catch (err) {
    console.error("[Error fetching comments]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Get a specific comment
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT * FROM comment_on_episode WHERE comment_id = ?',
      [req.params.id]
    );
    
    if (rows.length === 0) return res.status(404).json({ error: 'Comment not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error("[Error fetching comment]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Update a comment (mainly for moderation)
router.put('/:id', async (req, res) => {
  const { comment, status } = req.body;

  try {
    const updateFields = [];
    const updateValues = [];

    if (comment !== undefined) {
      updateFields.push('comment = ?');
      updateValues.push(comment);
    }
    if (status !== undefined) {
      updateFields.push('status = ?');
      updateValues.push(status);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updateValues.push(req.params.id);

    await db.execute(
      `UPDATE comment_on_episode SET ${updateFields.join(', ')} WHERE comment_id = ?`,
      updateValues
    );
    res.sendStatus(204);
  } catch (err) {
    console.error("[Error updating comment]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Update comment status (publish/reject)
router.patch('/:id/status', async (req, res) => {
  const { status } = req.body;

  if (!status || !['pending', 'published', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  try {
    await db.execute(
      'UPDATE comment_on_episode SET status = ? WHERE comment_id = ?',
      [status, req.params.id]
    );
    res.sendStatus(204);
  } catch (err) {
    console.error("[Error updating comment status]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Delete a comment
router.delete('/:id', async (req, res) => {
  try {
    await db.execute('DELETE FROM comment_on_episode WHERE comment_id = ?', [req.params.id]);
    res.sendStatus(204);
  } catch (err) {
    console.error("[Error deleting comment]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Get recent comments across all manga
router.get('/recent/all', async (req, res) => {
  const limit = parseInt(req.query.limit) || 20;
  const status = req.query.status || 'published';
  
  try {
    const [rows] = await db.execute(`
      SELECT 
        c.*,
        m.manga_name,
        m.manga_slug
      FROM comment_on_episode c
      LEFT JOIN manga m ON c.manga_id = m.manga_id
      WHERE c.status = ?
      ORDER BY c.created_date DESC
      LIMIT ?
    `, [status, limit]);
    res.json(rows);
  } catch (err) {
    console.error("[Error fetching recent comments]", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

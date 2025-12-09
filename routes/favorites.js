const express = require('express');
const router = express.Router();
const db = require('../db');

// Add a manga to favorites
router.post('/', async (req, res) => {
  const { user_id, manga_id } = req.body;

  if (!user_id || !manga_id) {
    return res.status(400).json({ error: 'user_id and manga_id are required' });
  }

  try {
    const [result] = await db.execute(
      'INSERT INTO favorite_manga (user_id, manga_id) VALUES (?, ?)',
      [user_id, manga_id]
    );

    res.status(201).json({ id: result.insertId, message: 'Manga added to favorites' });
  } catch (err) {
    // Handle duplicate entry error
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Manga already in favorites' });
    }
    console.error("[Error adding to favorites]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Get all favorites for a user
router.get('/user/:user_id', async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT 
        fm.favorite_id,
        fm.created_at,
        m.manga_id,
        m.manga_name,
        m.manga_slug,
        m.manga_bg_img,
        m.view,
        m.tag_id,
        COUNT(me.id) as episode_count
      FROM favorite_manga fm
      JOIN manga m ON fm.manga_id = m.manga_id
      LEFT JOIN manga_episodes me ON m.manga_id = me.manga_id
      WHERE fm.user_id = ?
      GROUP BY m.manga_id, fm.favorite_id
      ORDER BY fm.created_at DESC
    `, [req.params.user_id]);
    
    res.json(rows);
  } catch (err) {
    console.error("[Error fetching favorites]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Check if manga is in user's favorites
router.get('/user/:user_id/manga/:manga_id', async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT * FROM favorite_manga WHERE user_id = ? AND manga_id = ?',
      [req.params.user_id, req.params.manga_id]
    );
    
    res.json({ is_favorite: rows.length > 0 });
  } catch (err) {
    console.error("[Error checking favorite]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Remove a manga from favorites
router.delete('/user/:user_id/manga/:manga_id', async (req, res) => {
  try {
    const [result] = await db.execute(
      'DELETE FROM favorite_manga WHERE user_id = ? AND manga_id = ?',
      [req.params.user_id, req.params.manga_id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Favorite not found' });
    }
    
    res.sendStatus(204);
  } catch (err) {
    console.error("[Error removing from favorites]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Delete a favorite by ID
router.delete('/:id', async (req, res) => {
  try {
    await db.execute('DELETE FROM favorite_manga WHERE favorite_id = ?', [req.params.id]);
    res.sendStatus(204);
  } catch (err) {
    console.error("[Error deleting favorite]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Get favorite count for a manga
router.get('/manga/:manga_id/count', async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT COUNT(*) as favorite_count FROM favorite_manga WHERE manga_id = ?',
      [req.params.manga_id]
    );
    
    res.json({ favorite_count: rows[0].favorite_count });
  } catch (err) {
    console.error("[Error getting favorite count]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Get most favorited manga
router.get('/top', async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  
  try {
    const [rows] = await db.execute(`
      SELECT 
        m.manga_id,
        m.manga_name,
        m.manga_slug,
        m.manga_bg_img,
        m.view,
        m.tag_id,
        COUNT(fm.favorite_id) as favorite_count
      FROM manga m
      JOIN favorite_manga fm ON m.manga_id = fm.manga_id
      GROUP BY m.manga_id
      ORDER BY favorite_count DESC
      LIMIT ?
    `, [limit]);
    
    res.json(rows);
  } catch (err) {
    console.error("[Error fetching top favorites]", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

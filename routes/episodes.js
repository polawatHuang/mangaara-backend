const express = require('express');
const multer = require('multer');
const router = express.Router();
const db = require('../db');
const path = require('path');
const fs = require('fs');

const UPLOAD_BASE_PATH = process.env.UPLOAD_BASE_PATH || '/var/www/vhosts/manga.cipacmeeting.com/httpdocs/images';

// Set up multer to handle file uploads for episodes
const storageForEP = multer.diskStorage({
  destination: function (req, file, cb) {
    const { manga_slug, episode, manga_name, episode_number } = req.body;
    // Support both manga_slug and manga_name (for backward compatibility)
    const slug = manga_slug || manga_name;
    const epNum = episode || episode_number;
    const epDirectory = `${UPLOAD_BASE_PATH}/${slug}/ep${epNum}`;

    fs.mkdirSync(epDirectory, { recursive: true });
    cb(null, epDirectory);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const fileName = `page_${Date.now()}${ext}`;
    cb(null, fileName);
  }
});

const uploadForEP = multer({
  storage: storageForEP,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.jpg' || ext === '.jpeg' || ext === '.png') {
      cb(null, true);
    } else {
      cb(new Error('Only .jpg, .jpeg, .png files are allowed.'));
    }
  }
});

// Create a new manga episode (manga_episodes table)
router.post('/', async (req, res) => {
  const { manga_id, episode, episode_name, total_pages, created_date, updated_date } = req.body;

  try {
    const [result] = await db.execute(
      'INSERT INTO manga_episodes (manga_id, episode, episode_name, total_pages, created_date, updated_date) VALUES (?, ?, ?, ?, ?, ?)',
      [manga_id, episode, episode_name || null, total_pages || 0, created_date || new Date().toISOString().split('T')[0], updated_date || new Date().toISOString().split('T')[0]]
    );

    res.status(201).json({ id: result.insertId, message: 'Episode created successfully' });
  } catch (err) {
    console.error("[Error creating episode]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Get all episodes for a specific manga
router.get('/manga/:manga_id', async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT * FROM manga_episodes WHERE manga_id = ? ORDER BY episode ASC',
      [req.params.manga_id]
    );
    res.json(rows);
  } catch (err) {
    console.error("[Error fetching episodes]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Get a specific episode
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT * FROM manga_episodes WHERE id = ?',
      [req.params.id]
    );
    
    if (rows.length === 0) return res.status(404).json({ error: 'Episode not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error("[Error fetching episode]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Get episode by manga_id and episode number
router.get('/manga/:manga_id/episode/:episode', async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT * FROM manga_episodes WHERE manga_id = ? AND episode = ?',
      [req.params.manga_id, req.params.episode]
    );
    
    if (rows.length === 0) return res.status(404).json({ error: 'Episode not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error("[Error fetching episode]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Update an episode
router.put('/:id', async (req, res) => {
  const { episode_name, total_pages, updated_date } = req.body;

  try {
    const updateFields = [];
    const updateValues = [];

    if (episode_name !== undefined) {
      updateFields.push('episode_name = ?');
      updateValues.push(episode_name);
    }
    if (total_pages !== undefined) {
      updateFields.push('total_pages = ?');
      updateValues.push(total_pages);
    }
    if (updated_date !== undefined) {
      updateFields.push('updated_date = ?');
      updateValues.push(updated_date);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updateValues.push(req.params.id);

    await db.execute(
      `UPDATE manga_episodes SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );
    res.sendStatus(204);
  } catch (err) {
    console.error("[Error updating episode]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Delete an episode
router.delete('/:id', async (req, res) => {
  try {
    await db.execute('DELETE FROM manga_episodes WHERE id = ?', [req.params.id]);
    res.sendStatus(204);
  } catch (err) {
    console.error("[Error deleting episode]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Increment episode view count
router.post('/:id/view', async (req, res) => {
  try {
    await db.execute('UPDATE manga_episodes SET view = view + 1 WHERE id = ?', [req.params.id]);
    res.sendStatus(204);
  } catch (err) {
    console.error("[Error incrementing episode view]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Get latest episodes across all manga
router.get('/latest/all', async (req, res) => {
  const limit = parseInt(req.query.limit) || 20;
  try {
    const [rows] = await db.execute(`
      SELECT 
        me.id,
        me.manga_id,
        me.episode,
        me.episode_name,
        me.created_date,
        me.view,
        m.manga_name,
        m.manga_slug,
        m.manga_bg_img
      FROM manga_episodes me
      JOIN manga m ON me.manga_id = m.manga_id
      ORDER BY me.created_date DESC
      LIMIT ?
    `, [limit]);
    res.json(rows);
  } catch (err) {
    console.error("[Error fetching latest episodes]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ============================================
// EPISODE PAGES (episodes table) - For storing individual page images
// ============================================

// Upload episode pages/images
router.post('/pages/upload', uploadForEP.array('episode_images', 100), async (req, res) => {
  const { manga_id, manga_slug, episode } = req.body;

  if (!manga_id || !manga_slug || !episode || !req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'Invalid request data' });
  }

  try {
    const insertPromises = req.files.map((file, index) => {
      const image_url = `/images/${manga_slug}/ep${episode}/${file.filename}`;
      return db.execute(
        'INSERT INTO episodes (manga_id, manga_slug, episode, page_number, image_url, image_filename) VALUES (?, ?, ?, ?, ?, ?)',
        [manga_id, manga_slug, episode, index + 1, image_url, file.filename]
      );
    });

    await Promise.all(insertPromises);

    // Update total_pages in manga_episodes
    await db.execute(
      'UPDATE manga_episodes SET total_pages = ? WHERE manga_id = ? AND episode = ?',
      [req.files.length, manga_id, episode]
    );

    res.status(201).json({ 
      message: 'Episode pages uploaded successfully', 
      total_pages: req.files.length 
    });
  } catch (err) {
    console.error('[Error uploading episode pages]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Get all pages for a specific episode
router.get('/pages/manga/:manga_id/episode/:episode', async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT * FROM episodes WHERE manga_id = ? AND episode = ? ORDER BY page_number ASC',
      [req.params.manga_id, req.params.episode]
    );
    res.json(rows);
  } catch (err) {
    console.error("[Error fetching episode pages]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Get pages by manga slug and episode
router.get('/pages/slug/:manga_slug/episode/:episode', async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT * FROM episodes WHERE manga_slug = ? AND episode = ? ORDER BY page_number ASC',
      [req.params.manga_slug, req.params.episode]
    );
    res.json(rows);
  } catch (err) {
    console.error("[Error fetching episode pages]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Delete all pages for an episode
router.delete('/pages/manga/:manga_id/episode/:episode', async (req, res) => {
  try {
    await db.execute(
      'DELETE FROM episodes WHERE manga_id = ? AND episode = ?',
      [req.params.manga_id, req.params.episode]
    );
    res.sendStatus(204);
  } catch (err) {
    console.error("[Error deleting episode pages]", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

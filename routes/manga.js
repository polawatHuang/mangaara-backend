// routes/manga.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const { safeJsonArray } = require('../libs/safeJsonArray');

// Create
// Read All
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT 
        manga_id,
        manga_name,
        manga_disc,
        manga_bg_img,
        view,
        created_at,
        updated_at,
        manga_slug,
        tag_id,
        ep
      FROM mangas
      ORDER BY created_at DESC
    `);

    // Post-process `tag_id` and `ep`
    const processed = rows.map((manga) => {
      return {
        ...manga,
        tag_id: safeJsonArray(manga.tag_id),
        ep: safeJsonArray(manga.ep),
      };
    });

    res.json(processed);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Read All
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT 
        manga_id,
        manga_name,
        manga_disc,
        manga_bg_img,
        view,
        created_at,
        updated_at,
        manga_slug,
        tag_id,
        ep
      FROM mangas
      ORDER BY created_at DESC
    `);

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Read One
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM mangas WHERE manga_id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/image', async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT manga_bg_blob FROM mangas WHERE manga_id = ?',
      [req.params.id]
    );

    if (!rows[0] || !rows[0].manga_bg_blob) {
      return res.status(404).json({ error: 'Image not found' });
    }

    const imageBuffer = rows[0].manga_bg_blob;

    res.writeHead(200, {
      'Content-Type': 'image/jpeg', // or 'image/png' depending on your upload
      'Content-Length': imageBuffer.length
    });
    res.end(imageBuffer);
  } catch (err) {
    console.error("[Image Serve Error]", err.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update
router.put('/:id', async (req, res) => {
  const { manga_name, manga_disc, manga_bg_img, tag_id } = req.body;
  try {
    await db.execute(
      'UPDATE mangas SET manga_name=?, manga_disc=?, manga_bg_img=?, tag_id=? WHERE manga_id=?',
      [manga_name, manga_disc, manga_bg_img, tag_id, req.params.id]
    );
    res.sendStatus(204); // No content
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete
router.delete('/:id', async (req, res) => {
  try {
    await db.execute('DELETE FROM mangas WHERE manga_id=?', [req.params.id]);
    res.sendStatus(204);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
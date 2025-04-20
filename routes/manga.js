// routes/manga.js
const express = require('express');
const router = express.Router();
const db = require('../db');

// Create
router.post('/', async (req, res) => {
  const { manga_name, manga_disc, manga_bg_img, manga_bg_blob, manga_slug, tag_id } = req.body;

  try {
    const imageBuffer = manga_bg_blob ? Buffer.from(manga_bg_blob, 'base64') : null;

    const [result] = await db.execute(
      `INSERT INTO mangas 
       (manga_name, manga_disc, manga_bg_img, manga_bg_blob, manga_slug, tag_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        manga_name,
        manga_disc,
        manga_bg_img,
        imageBuffer,
        manga_slug,
        tag_id
      ]
    );

    res.status(201).json({ id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Read All
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM mangas ORDER BY created_at DESC');
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
  const [rows] = await db.execute('SELECT manga_bg_blob FROM mangas WHERE manga_id = ?', [req.params.id]);
  if (!rows[0] || !rows[0].manga_bg_blob) return res.sendStatus(404);

  res.writeHead(200, {
    'Content-Type': 'image/jpeg',
    'Content-Length': rows[0].manga_bg_blob.length
  });
  res.end(rows[0].manga_bg_blob);
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
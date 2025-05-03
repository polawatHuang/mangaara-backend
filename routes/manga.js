const express = require('express');
const multer = require('multer');
const router = express.Router();
const db = require('../db');
const path = require('path');
const fs = require('fs');

// Set up multer to handle file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Sanitize manga_name to avoid special characters and spaces
    const mangaName = req.body.manga_name ? req.body.manga_name.replace(/\s+/g, '_').toLowerCase() : 'default';
    
    // Create directory path dynamically under '/images/manga/{manga_name}/'
    const dirPath = `/var/www/vhosts/mangaara.com/httpdocs/images/manga/${mangaName}`;

    // Create the directory if it does not exist
    fs.mkdirSync(dirPath, { recursive: true });

    // Set the destination for the image
    cb(null, dirPath);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname); // Get file extension
    const fileName = Date.now() + ext; // Add timestamp to filename for uniqueness
    cb(null, fileName); // Set the final filename
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // Limit file size to 10MB
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    // Only allow jpg, jpeg, or png files
    if (ext === '.jpg' || ext === '.jpeg' || ext === '.png') {
      cb(null, true);
    } else {
      cb(new Error('Only .jpg, .jpeg, .png files are allowed.'));
    }
  }
});

// Create Manga (with Image Upload)
router.post('/', upload.single('manga_bg_img'), async (req, res) => {
  const { manga_name, manga_disc, manga_slug, tag_id } = req.body;
  const manga_bg_img = req.file ? `/images/manga/${manga_name.replace(/\s+/g, '_').toLowerCase()}/${req.file.filename}` : null; // Save the image path

  try {
    const [result] = await db.execute(
      'INSERT INTO mangas (manga_name, manga_disc, manga_bg_img, manga_slug, tag_id) VALUES (?, ?, ?, ?, ?)',
      [manga_name, manga_disc, manga_bg_img, manga_slug, tag_id]
    );

    res.status(201).json({ id: result.insertId, manga_bg_img });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Read All Manga (Image is URL)
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

// Read One Manga (Image URL)
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM mangas WHERE manga_id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update Manga (with Image Upload)
router.put('/:id', upload.single('manga_bg_img'), async (req, res) => {
  const { manga_name, manga_disc, manga_slug, tag_id } = req.body;
  const manga_bg_img = req.file ? `/images/manga/${manga_name.replace(/\s+/g, '_').toLowerCase()}/${req.file.filename}` : null;

  try {
    await db.execute(
      'UPDATE mangas SET manga_name=?, manga_disc=?, manga_bg_img=?, manga_slug=?, tag_id=? WHERE manga_id=?',
      [manga_name, manga_disc, manga_bg_img, manga_slug, tag_id, req.params.id]
    );
    res.sendStatus(204); // No content
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete Manga
router.delete('/:id', async (req, res) => {
  try {
    await db.execute('DELETE FROM mangas WHERE manga_id=?', [req.params.id]);
    res.sendStatus(204);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
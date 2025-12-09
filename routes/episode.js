const express = require('express');
const multer = require('multer');
const router = express.Router();
const db = require('../db');
const path = require('path');
const fs = require('fs');

// Set up multer to handle file uploads for episodes
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const { manga_name, episode_number } = req.body;
    // Use manga_name as slug (frontend sends this)
    const epDirectory = `/var/www/vhosts/manga.cipacmeeting.com/httpdocs/images/${manga_name}/ep${episode_number}`;

    fs.mkdirSync(epDirectory, { recursive: true });
    cb(null, epDirectory);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const fileName = `page_${Date.now()}${ext}`;
    cb(null, fileName);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.jpg' || ext === '.jpeg' || ext === '.png' || ext === '.webp') {
      cb(null, true);
    } else {
      cb(new Error('Only .jpg, .jpeg, .png, .webp files are allowed.'));
    }
  }
});

// Create episode with image uploads (matches frontend format)
router.post('/', upload.array('episode_images', 100), async (req, res) => {
  const { manga_name, episode_number, totalPage, view } = req.body;

  if (!manga_name || !episode_number || !totalPage || !req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Get manga_id from manga_slug (manga_name is the slug)
    const [mangaRows] = await db.execute(
      'SELECT manga_id FROM manga WHERE manga_slug = ?',
      [manga_name]
    );

    if (mangaRows.length === 0) {
      return res.status(404).json({ error: 'Manga not found' });
    }

    const manga_id = mangaRows[0].manga_id;

    // Create episode metadata
    const [episodeResult] = await db.execute(
      'INSERT INTO manga_episodes (manga_id, episode, episode_name, view, total_pages, created_date, updated_date) VALUES (?, ?, ?, ?, ?, CURDATE(), CURDATE())',
      [manga_id, episode_number, `Episode ${episode_number}`, view || 0, totalPage]
    );

    // Store image URLs
    const imageUrls = [];
    const insertPromises = req.files.map((file, index) => {
      const image_url = `/images/${manga_name}/ep${episode_number}/${file.filename}`;
      imageUrls.push(image_url);
      return db.execute(
        'INSERT INTO episodes (manga_id, manga_slug, episode, page_number, image_url, image_filename) VALUES (?, ?, ?, ?, ?, ?)',
        [manga_id, manga_name, episode_number, index + 1, image_url, file.filename]
      );
    });

    await Promise.all(insertPromises);

    res.json({
      episode_id: episodeResult.insertId,
      manga_name,
      episode_number: parseInt(episode_number),
      total_pages: parseInt(totalPage),
      images: imageUrls
    });
  } catch (err) {
    console.error('[Error creating episode]', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

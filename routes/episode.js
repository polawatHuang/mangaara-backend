const express = require('express');
const multer = require('multer');
const router = express.Router();
const db = require('../db');
const path = require('path');
const fs = require('fs');

const UPLOAD_BASE_PATH = process.env.UPLOAD_BASE_PATH || '/var/www/vhosts/manga.cipacmeeting.com/httpdocs/images';

// Set up multer to handle file uploads for episodes
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const { manga_name, episode_number } = req.body;
    // Use manga_name as slug (frontend sends this)
    const epDirectory = `${UPLOAD_BASE_PATH}/${manga_name}/ep${episode_number}`;

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

// Helper function to insert episode images
async function insertEpisodeImages(manga_id, manga_slug, episode, files) {
  const imageUrls = files.map((file, idx) => 
    `https://manga.cipacmeeting.com/images/${manga_slug}/ep${episode}/${file.filename}`
  );
  
  const insertPromises = files.map((file, idx) =>
    db.execute(
      'INSERT INTO episodes (manga_id, manga_slug, episode, page_number, image_url, image_filename) VALUES (?, ?, ?, ?, ?, ?)',
      [manga_id, manga_slug, episode, idx + 1, imageUrls[idx], file.filename]
    )
  );
  
  await Promise.all(insertPromises);
  return imageUrls;
}

// Create episode with image uploads (matches frontend format)
router.post('/', upload.array('episode_images', 100), async (req, res) => {
  const { manga_name, episode_number, totalPage, view } = req.body;

  if (!manga_name || !episode_number || !totalPage || !req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Validate episode_number is numeric
  if (isNaN(episode_number) || parseInt(episode_number) < 1) {
    return res.status(400).json({ error: 'Episode number must be a positive number' });
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

    // Insert episode images using helper function
    const imageUrls = await insertEpisodeImages(manga_id, manga_name, episode_number, req.files);

    res.json({
      episode_id: episodeResult.insertId,
      manga_name,
      episode_number: parseInt(episode_number),
      total_pages: parseInt(totalPage),
      images: imageUrls
    });
  } catch (err) {
    console.error('[Error creating episode]', err);
    res.status(500).json({ error: 'Failed to create episode' });
  }
});

// Update episode images (replace all images for an episode)
router.put('/', upload.array('episode_images', 100), async (req, res) => {
  const { manga_name, episode_number } = req.body;

  if (!manga_name || !episode_number || !req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'Missing manga_name, episode_number, or images' });
  }

  // Validate episode_number is numeric
  if (isNaN(episode_number) || parseInt(episode_number) < 1) {
    return res.status(400).json({ error: 'Episode number must be a positive number' });
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

    // Delete old images for this episode
    await db.execute(
      'DELETE FROM episodes WHERE manga_id = ? AND manga_slug = ? AND episode = ?',
      [manga_id, manga_name, episode_number]
    );

    // Insert new images using helper function
    const imageUrls = await insertEpisodeImages(manga_id, manga_name, episode_number, req.files);

    // Update total_pages in manga_episodes
    await db.execute(
      'UPDATE manga_episodes SET total_pages = ? WHERE manga_id = ? AND episode = ?',
      [req.files.length, manga_id, episode_number]
    );

    res.json({
      message: 'Episode images updated successfully',
      episode_number: parseInt(episode_number),
      total_pages: req.files.length,
      images: imageUrls
    });
  } catch (err) {
    console.error('[Error updating episode images]', err);
    res.status(500).json({ error: 'Failed to update episode images' });
  }
});

module.exports = router;

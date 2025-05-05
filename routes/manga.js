const express = require('express');
const multer = require('multer');
const router = express.Router();
const db = require('../db');
const path = require('path');
const fs = require('fs');

// Helper function to safely parse JSON strings into arrays
const safeJsonArray = (input) => {
  try {
    // Parse the input as a JSON array
    return JSON.parse(input);
  } catch (err) {
    // If there's an error (e.g., malformed JSON), return an empty array
    return [];
  }
}

// Set up multer to handle file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const mangaName = req.body.manga_name ? req.body.manga_name.replace(/\s+/g, '_').toLowerCase() : 'default'; // Use manga_name or default
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
  const { manga_name, manga_disc, manga_slug, tag_id, ep } = req.body;

  // Convert tag_id and ep to JSON strings
  const tagArray = Array.isArray(tag_id) ? JSON.stringify(tag_id) : JSON.stringify([]);
  const epArray = Array.isArray(ep) ? JSON.stringify(ep) : JSON.stringify([]);

  const manga_bg_img = req.file ? `/images/manga/${manga_name.replace(/\s+/g, '_').toLowerCase()}/${req.file.filename}` : null; // Save the image path

  try {
    const [result] = await db.execute(
      'INSERT INTO mangas (manga_name, manga_disc, manga_bg_img, manga_slug, tag_id, ep) VALUES (?, ?, ?, ?, ?, ?)',
      [manga_name, manga_disc, manga_bg_img, manga_slug, tagArray, epArray]
    );

    res.status(201).json({ id: result.insertId, manga_bg_img });
  } catch (err) {
    console.error("[Error inserting manga]", err.message);
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

    // Post-process `tag_id` and `ep` to turn stringified arrays into actual arrays
    // const processed = rows.map((manga) => {
    //   return {
    //     ...manga,
    //     tag_id: safeJsonArray(manga.tag_id),  // Parse tag_id JSON string to array
    //     ep: safeJsonArray(manga.ep),  // Parse ep JSON string to array
    //   };
    // });

    res.json(processed);
  } catch (err) {
    console.error("[Error fetching mangas]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Read One Manga (Image URL)
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM mangas WHERE manga_id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Manga not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error("[Error fetching manga]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Update Manga (with Image Upload)
router.put('/:id', upload.single('manga_bg_img'), async (req, res) => {
  const { manga_name, manga_disc, manga_slug, tag_id, ep } = req.body;

  // Convert tag_id and ep to JSON strings
  const tagArray = Array.isArray(tag_id) ? JSON.stringify(tag_id) : JSON.stringify([]);
  const epArray = Array.isArray(ep) ? JSON.stringify(ep) : JSON.stringify([]);

  const manga_bg_img = req.file ? `/images/manga/${manga_name.replace(/\s+/g, '_').toLowerCase()}/${req.file.filename}` : null;

  try {
    await db.execute(
      'UPDATE mangas SET manga_name=?, manga_disc=?, manga_bg_img=?, manga_slug=?, tag_id=?, ep=? WHERE manga_id=?',
      [manga_name, manga_disc, manga_bg_img, manga_slug, tagArray, epArray, req.params.id]
    );
    res.sendStatus(204); // No content
  } catch (err) {
    console.error("[Error updating manga]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Delete Manga
router.delete('/:id', async (req, res) => {
  try {
    await db.execute('DELETE FROM mangas WHERE manga_id=?', [req.params.id]);
    res.sendStatus(204); // No content
  } catch (err) {
    console.error("[Error deleting manga]", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
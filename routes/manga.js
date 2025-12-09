const express = require('express');
const multer = require('multer');
const router = express.Router();
const db = require('../db');
const path = require('path');
const fs = require('fs');

// Helper function to safely parse JSON strings into arrays
// const safeJsonArray = (input) => {
//   try {
//     // Parse the input as a JSON array
//     return JSON.parse(input);
//   } catch (err) {
//     // If there's an error (e.g., malformed JSON), return an empty array
//     return [];
//   }
// }

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
  const { manga_name, manga_disc, manga_slug, tag_id } = req.body;

  // Convert tag_id to JSON string
  const tagArray = Array.isArray(tag_id) ? JSON.stringify(tag_id) : JSON.stringify([]);

  const manga_bg_img = req.file ? `/images/manga/${manga_name.replace(/\s+/g, '_').toLowerCase()}/${req.file.filename}` : null; // Save the image path

  try {
    const [result] = await db.execute(
      'INSERT INTO manga (manga_name, manga_disc, manga_bg_img, manga_slug, tag_id) VALUES (?, ?, ?, ?, ?)',
      [manga_name, manga_disc, manga_bg_img, manga_slug, tagArray]
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
        m.manga_id,
        m.manga_name,
        m.manga_disc,
        m.manga_bg_img,
        m.view,
        m.created_at,
        m.updated_at,
        m.manga_slug,
        m.tag_id,
        COUNT(me.id) as episode_count,
        MAX(me.created_date) as last_episode_date,
        JSON_ARRAYAGG(
          JSON_OBJECT(
            'episode', me.episode,
            'episode_name', me.episode_name,
            'view', me.view,
            'total_pages', me.total_pages,
            'created_date', me.created_date,
            'updated_date', me.updated_date
          )
        ) as ep
      FROM manga m
      LEFT JOIN manga_episodes me ON m.manga_id = me.manga_id
      GROUP BY m.manga_id
      ORDER BY m.created_at DESC
    `);

    // Post-process to handle null episodes
    const processed = rows.map((manga) => {
      return {
        ...manga,
        tag_id: manga.tag_id,
        ep: manga.episode_count > 0 ? manga.ep : [],
      };
    });

    res.json(processed);
  } catch (err) {
    console.error("[Error fetching mangas]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Read One Manga by ID with episodes (Image URL)
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT 
        m.manga_id,
        m.manga_name,
        m.manga_slug,
        m.manga_disc,
        m.manga_bg_img,
        m.tag_id,
        m.view as manga_view,
        m.created_at,
        m.updated_at,
        JSON_ARRAYAGG(
          JSON_OBJECT(
            'episode', me.episode,
            'episode_name', me.episode_name,
            'view', me.view,
            'total_pages', me.total_pages,
            'created_date', me.created_date,
            'updated_date', me.updated_date
          )
        ) as ep
      FROM manga m
      LEFT JOIN manga_episodes me ON m.manga_id = me.manga_id
      WHERE m.manga_id = ?
      GROUP BY m.manga_id
    `, [req.params.id]);
    
    if (rows.length === 0) return res.status(404).json({ error: 'Manga not found' });
    
    // Handle null episodes
    const manga = rows[0];
    manga.ep = manga.ep && manga.ep[0].episode !== null ? manga.ep : [];
    
    res.json(manga);
  } catch (err) {
    console.error("[Error fetching manga]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Update Manga (with Image Upload)
router.put('/:id', upload.single('manga_bg_img'), async (req, res) => {
  const { manga_name, manga_disc, manga_slug, tag_id } = req.body;

  // Convert tag_id to JSON string
  const tagArray = Array.isArray(tag_id) ? JSON.stringify(tag_id) : JSON.stringify([]);

  const manga_bg_img = req.file ? `/images/manga/${manga_name.replace(/\s+/g, '_').toLowerCase()}/${req.file.filename}` : null;

  try {
    const updateFields = [];
    const updateValues = [];

    if (manga_name) {
      updateFields.push('manga_name=?');
      updateValues.push(manga_name);
    }
    if (manga_disc) {
      updateFields.push('manga_disc=?');
      updateValues.push(manga_disc);
    }
    if (manga_bg_img) {
      updateFields.push('manga_bg_img=?');
      updateValues.push(manga_bg_img);
    }
    if (manga_slug) {
      updateFields.push('manga_slug=?');
      updateValues.push(manga_slug);
    }
    if (tag_id) {
      updateFields.push('tag_id=?');
      updateValues.push(tagArray);
    }

    updateValues.push(req.params.id);

    await db.execute(
      `UPDATE manga SET ${updateFields.join(', ')} WHERE manga_id=?`,
      updateValues
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
    await db.execute('DELETE FROM manga WHERE manga_id=?', [req.params.id]);
    res.sendStatus(204); // No content
  } catch (err) {
    console.error("[Error deleting manga]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Get manga by slug
router.get('/slug/:slug', async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT 
        m.manga_id,
        m.manga_name,
        m.manga_slug,
        m.manga_disc,
        m.manga_bg_img,
        m.tag_id,
        m.view as manga_view,
        m.created_at,
        m.updated_at,
        JSON_ARRAYAGG(
          JSON_OBJECT(
            'episode', me.episode,
            'episode_name', me.episode_name,
            'view', me.view,
            'total_pages', me.total_pages,
            'created_date', me.created_date,
            'updated_date', me.updated_date
          )
        ) as ep
      FROM manga m
      LEFT JOIN manga_episodes me ON m.manga_id = me.manga_id
      WHERE m.manga_slug = ?
      GROUP BY m.manga_id
    `, [req.params.slug]);
    
    if (rows.length === 0) return res.status(404).json({ error: 'Manga not found' });
    
    const manga = rows[0];
    manga.ep = manga.ep && manga.ep[0].episode !== null ? manga.ep : [];
    
    res.json(manga);
  } catch (err) {
    console.error("[Error fetching manga by slug]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Increment manga view count
router.post('/:id/view', async (req, res) => {
  try {
    await db.execute('UPDATE manga SET view = view + 1 WHERE manga_id = ?', [req.params.id]);
    res.sendStatus(204);
  } catch (err) {
    console.error("[Error incrementing view]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Get most viewed manga
router.get('/trending/top', async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  try {
    const [rows] = await db.execute(`
      SELECT 
        manga_id,
        manga_name,
        manga_slug,
        manga_bg_img,
        view,
        tag_id
      FROM manga
      ORDER BY view DESC
      LIMIT ?
    `, [limit]);
    res.json(rows);
  } catch (err) {
    console.error("[Error fetching trending manga]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Search manga by name
router.get('/search/:query', async (req, res) => {
  const searchQuery = `%${req.params.query}%`;
  try {
    const [rows] = await db.execute(`
      SELECT 
        manga_id,
        manga_name,
        manga_slug,
        manga_bg_img,
        view,
        tag_id
      FROM manga
      WHERE manga_name LIKE ?
      ORDER BY view DESC
    `, [searchQuery]);
    res.json(rows);
  } catch (err) {
    console.error("[Error searching manga]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Get manga by tag
router.get('/tag/:tagName', async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT 
        manga_id,
        manga_name,
        manga_slug,
        manga_bg_img,
        tag_id,
        view
      FROM manga
      WHERE JSON_CONTAINS(tag_id, ?)
      ORDER BY view DESC
    `, [JSON.stringify(req.params.tagName)]);
    res.json(rows);
  } catch (err) {
    console.error("[Error fetching manga by tag]", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
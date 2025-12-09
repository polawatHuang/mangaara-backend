const express = require('express');
const multer = require('multer');
const router = express.Router();
const db = require('../db');
const path = require('path');
const fs = require('fs');

// Set up multer for background image upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dirPath = `/var/www/vhosts/manga.cipacmeeting.com/httpdocs/images/recommend`;
    fs.mkdirSync(dirPath, { recursive: true });
    cb(null, dirPath);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const fileName = `recommend_${Date.now()}${ext}`;
    cb(null, fileName);
  }
});

const upload = multer({
  storage: storage,
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

// Create a new recommendation
router.post('/', upload.single('background_image'), async (req, res) => {
  const { name, slug, commenter, comment, status } = req.body;

  if (!name || !slug || !commenter || !comment) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const background_image = req.file ? `/images/recommend/${req.file.filename}` : null;

  try {
    const [result] = await db.execute(
      'INSERT INTO recommend (name, slug, commenter, comment, background_image, status) VALUES (?, ?, ?, ?, ?, ?)',
      [name, slug, commenter, comment, background_image, status || 'pending']
    );

    res.status(200).json({ 
      recommend_id: result.insertId, 
      name,
      slug,
      commenter,
      comment,
      background_image,
      status: status || 'pending'
    });
  } catch (err) {
    console.error("[Error creating recommendation]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Get all recommendations (can filter by status)
router.get('/', async (req, res) => {
  const status = req.query.status || 'published';
  
  try {
    let query = 'SELECT * FROM recommend';
    let params = [];
    
    if (status) {
      query += ' WHERE status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const [rows] = await db.execute(query, params);
    res.json(rows);
  } catch (err) {
    console.error("[Error fetching recommendations]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Get published recommendations
router.get('/published', async (req, res) => {
  const limit = parseInt(req.query.limit) || 10;
  
  try {
    const [rows] = await db.execute(
      'SELECT * FROM recommend WHERE status = ? ORDER BY created_at DESC LIMIT ?',
      ['published', limit]
    );
    res.json(rows);
  } catch (err) {
    console.error("[Error fetching published recommendations]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Get recommendations for a specific manga
router.get('/manga/:slug', async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT * FROM recommend WHERE slug = ? AND status = ? ORDER BY created_at DESC',
      [req.params.slug, 'published']
    );
    res.json(rows);
  } catch (err) {
    console.error("[Error fetching manga recommendations]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Get a specific recommendation
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT * FROM recommend WHERE recommend_id = ?',
      [req.params.id]
    );
    
    if (rows.length === 0) return res.status(404).json({ error: 'Recommendation not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error("[Error fetching recommendation]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Update a recommendation
router.put('/:id', upload.single('background_image'), async (req, res) => {
  const { name, slug, commenter, comment, status } = req.body;

  try {
    const updateFields = [];
    const updateValues = [];

    if (name !== undefined) {
      updateFields.push('name = ?');
      updateValues.push(name);
    }
    if (slug !== undefined) {
      updateFields.push('slug = ?');
      updateValues.push(slug);
    }
    if (commenter !== undefined) {
      updateFields.push('commenter = ?');
      updateValues.push(commenter);
    }
    if (comment !== undefined) {
      updateFields.push('comment = ?');
      updateValues.push(comment);
    }
    if (status !== undefined) {
      updateFields.push('status = ?');
      updateValues.push(status);
    }
    if (req.file) {
      updateFields.push('background_image = ?');
      updateValues.push(`/images/recommend/${req.file.filename}`);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updateValues.push(req.params.id);

    const [result] = await db.execute(
      `UPDATE recommend SET ${updateFields.join(', ')} WHERE recommend_id = ?`,
      updateValues
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Recommendation not found' });
    }
    
    res.json({ message: 'Recommendation updated successfully' });
  } catch (err) {
    console.error("[Error updating recommendation]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Update recommendation status
router.patch('/:id/status', async (req, res) => {
  const { status } = req.body;

  if (!status || !['pending', 'published', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  try {
    await db.execute(
      'UPDATE recommend SET status = ? WHERE recommend_id = ?',
      [status, req.params.id]
    );
    res.sendStatus(204);
  } catch (err) {
    console.error("[Error updating recommendation status]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Delete a recommendation
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await db.execute('DELETE FROM recommend WHERE recommend_id = ?', [req.params.id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Recommendation not found' });
    }
    
    res.json({ message: 'Recommendation deleted successfully' });
  } catch (err) {
    console.error("[Error deleting recommendation]", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

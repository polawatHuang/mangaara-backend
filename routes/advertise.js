const express = require('express');
const multer = require('multer');
const router = express.Router();
const db = require('../db');
const path = require('path');
const fs = require('fs');

const UPLOAD_BASE_PATH = process.env.UPLOAD_BASE_PATH || '/var/www/vhosts/manga.cipacmeeting.com/httpdocs/images';

// Set up multer for advertisement image upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dirPath = `${UPLOAD_BASE_PATH}/advertise`;
    fs.mkdirSync(dirPath, { recursive: true });
    cb(null, dirPath);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const fileName = `ad_${Date.now()}${ext}`;
    cb(null, fileName);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.jpg' || ext === '.jpeg' || ext === '.png' || ext === '.gif') {
      cb(null, true);
    } else {
      cb(new Error('Only .jpg, .jpeg, .png, .gif files are allowed.'));
    }
  }
});

// Create a new advertisement
router.post('/', upload.single('image'), async (req, res) => {
  const { name, link_url, is_active, created_date } = req.body;

  if (!name || !req.file) {
    return res.status(400).json({ error: 'Name and image are required' });
  }

  const image = `/images/advertise/${req.file.filename}`;

  try {
    const [result] = await db.execute(
      'INSERT INTO advertise (name, image, link_url, is_active, created_date) VALUES (?, ?, ?, ?, ?)',
      [name, image, link_url || null, is_active !== undefined ? is_active : true, created_date || new Date().toISOString().split('T')[0]]
    );

    res.status(200).json({ 
      ad_id: result.insertId, 
      name,
      image,
      link_url: link_url || null,
      is_active: is_active !== undefined ? is_active : true,
      created_date: created_date || new Date().toISOString().split('T')[0]
    });
  } catch (err) {
    console.error("[Error creating advertisement]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Get all advertisements
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM advertise ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    console.error("[Error fetching advertisements]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Get active advertisements
router.get('/active', async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT * FROM advertise WHERE is_active = ? ORDER BY created_at DESC',
      [true]
    );
    res.json(rows);
  } catch (err) {
    console.error("[Error fetching active advertisements]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Get a specific advertisement
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM advertise WHERE ad_id = ?', [req.params.id]);
    
    if (rows.length === 0) return res.status(404).json({ error: 'Advertisement not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error("[Error fetching advertisement]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Update an advertisement
router.put('/:id', upload.single('image'), async (req, res) => {
  const { name, link_url, is_active } = req.body;

  try {
    const updateFields = [];
    const updateValues = [];

    if (name !== undefined) {
      updateFields.push('name = ?');
      updateValues.push(name);
    }
    if (link_url !== undefined) {
      updateFields.push('link_url = ?');
      updateValues.push(link_url);
    }
    if (is_active !== undefined) {
      updateFields.push('is_active = ?');
      updateValues.push(is_active);
    }
    if (req.file) {
      updateFields.push('image = ?');
      updateValues.push(`/images/advertise/${req.file.filename}`);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updateValues.push(req.params.id);

    const [result] = await db.execute(
      `UPDATE advertise SET ${updateFields.join(', ')} WHERE ad_id = ?`,
      updateValues
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Advertisement not found' });
    }
    
    res.json({ message: 'Advertisement updated successfully' });
  } catch (err) {
    console.error("[Error updating advertisement]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Toggle advertisement active status
router.patch('/:id/toggle', async (req, res) => {
  try {
    const [result] = await db.execute(
      'UPDATE advertise SET is_active = NOT is_active WHERE ad_id = ?',
      [req.params.id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Advertisement not found' });
    }
    
    res.json({ message: 'Advertisement status toggled successfully' });
  } catch (err) {
    console.error("[Error toggling advertisement status]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Delete an advertisement
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await db.execute('DELETE FROM advertise WHERE ad_id = ?', [req.params.id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Advertisement not found' });
    }
    
    res.json({ message: 'Advertisement deleted successfully' });
  } catch (err) {
    console.error("[Error deleting advertisement]", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

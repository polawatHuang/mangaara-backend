const express = require('express');
const multer = require('multer');
const router = express.Router();
const path = require('path');
const fs = require('fs');

// Set up multer for general file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const folder = req.body.folder || 'uploads';
    const dirPath = `/var/www/vhosts/manga.cipacmeeting.com/httpdocs/images/${folder}`;
    fs.mkdirSync(dirPath, { recursive: true });
    cb(null, dirPath);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const fileName = `${Date.now()}${ext}`;
    cb(null, fileName);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext === '.jpg' || ext === '.jpeg' || ext === '.png' || ext === '.gif') {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed.'));
    }
  }
});

// Upload file endpoint
router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const folder = req.body.folder || 'uploads';
    const fileUrl = `/images/${folder}/${req.file.filename}`;

    res.json({
      url: fileUrl,
      filename: req.file.filename,
      size: req.file.size
    });
  } catch (err) {
    console.error('[Error uploading file]', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

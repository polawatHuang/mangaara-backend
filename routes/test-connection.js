const express = require('express');
const router = express.Router();
const db = require('../db');

// Test backend connection
router.get('/', async (req, res) => {
  try {
    // Test database connection
    const [rows] = await db.execute('SELECT NOW() as current_time');
    
    res.json({
      status: 'connected',
      message: 'Backend connection successful',
      timestamp: rows[0].current_time
    });
  } catch (err) {
    console.error('[Connection test error]', err.message);
    res.status(500).json({ 
      error: 'Connection failed',
      details: err.message 
    });
  }
});

module.exports = router;

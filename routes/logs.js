// routes/logs.js
const express = require("express");
const router = express.Router();
const db = require("../db");

// GET all logs
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.execute("SELECT * FROM logs ORDER BY created_at DESC");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
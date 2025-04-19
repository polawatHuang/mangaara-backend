// routes/test.js
const express = require("express");
const router = express.Router();
const db = require("../db");

// Test DB connection route
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT NOW() AS time");
    res.status(200).json({ server_time: rows[0].time });  // ✅ Proper Express syntax
  } catch (err) {
    console.error("[DB ERROR]", err);
    res.status(500).json({ error: err.message });  // ✅ Express error response
  }
});

module.exports = router;
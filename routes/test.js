// routes/test.js
const express = require("express");
const router = express.Router();
const db = require("../db");

// Create
router.post("/", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT NOW() AS time");
    return Response.json({ server_time: rows[0].time });
  } catch (err) {
    console.error("[DB ERROR]", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});

module.exports = router;

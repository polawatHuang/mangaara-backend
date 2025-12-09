// routes/tag.js
const express = require("express");
const router = express.Router();
const db = require("../db");

// Create a new tag
router.post("/", async (req, res) => {
  const { name, tag_name } = req.body;
  const tagName = name || tag_name; // Support both 'name' and 'tag_name'
  
  if (!tagName) {
    return res.status(400).json({ error: "Tag name is required" });
  }
  
  try {
    const [result] = await db.execute(
      "INSERT INTO tags (tag_name) VALUES (?)",
      [tagName]
    );
    res.status(200).json({ 
      tag_id: result.insertId,
      name: tagName
    });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: "Tag already exists" });
    }
    res.status(500).json({ error: err.message });
  }
});

// Read all tags
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.execute("SELECT tag_id, tag_name as name, created_at FROM tags ORDER BY tag_id DESC");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Read one tag
router.get("/:id", async (req, res) => {
  try {
    const [rows] = await db.execute("SELECT * FROM tags WHERE tag_id = ?", [
      req.params.id,
    ]);
    if (rows.length === 0) return res.sendStatus(404);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update tag
router.put("/:id", async (req, res) => {
  const { tag_name } = req.body;
  try {
    await db.execute("UPDATE tags SET tag_name = ? WHERE tag_id = ?", [
      tag_name,
      req.params.id,
    ]);
    res.sendStatus(204); // No content
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete tag
router.delete("/:id", async (req, res) => {
  try {
    const [result] = await db.execute("DELETE FROM tags WHERE tag_id = ?", [req.params.id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "Tag not found" });
    }
    
    res.json({ message: "Tag deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
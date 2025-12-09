const express = require('express');
const router = express.Router();
const db = require('../db');

// Create a new menu item
router.post('/', async (req, res) => {
  const { name, href, id, is_active } = req.body;

  if (!name || !href) {
    return res.status(400).json({ error: 'Name and href are required' });
  }

  try {
    const [result] = await db.execute(
      'INSERT INTO menubar (name, href, id, is_active) VALUES (?, ?, ?, ?)',
      [name, href, id || null, is_active !== undefined ? is_active : true]
    );

    res.status(201).json({ menu_id: result.insertId, message: 'Menu item created successfully' });
  } catch (err) {
    console.error("[Error creating menu item]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Get all menu items
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM menubar ORDER BY id ASC');
    res.json(rows);
  } catch (err) {
    console.error("[Error fetching menu items]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Get active menu items
router.get('/active', async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT * FROM menubar WHERE is_active = ? ORDER BY id ASC',
      [true]
    );
    res.json(rows);
  } catch (err) {
    console.error("[Error fetching active menu items]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Get a specific menu item
router.get('/:menu_id', async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM menubar WHERE menu_id = ?', [req.params.menu_id]);
    
    if (rows.length === 0) return res.status(404).json({ error: 'Menu item not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error("[Error fetching menu item]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Update a menu item
router.put('/:menu_id', async (req, res) => {
  const { name, href, id, is_active } = req.body;

  try {
    const updateFields = [];
    const updateValues = [];

    if (name !== undefined) {
      updateFields.push('name = ?');
      updateValues.push(name);
    }
    if (href !== undefined) {
      updateFields.push('href = ?');
      updateValues.push(href);
    }
    if (id !== undefined) {
      updateFields.push('id = ?');
      updateValues.push(id);
    }
    if (is_active !== undefined) {
      updateFields.push('is_active = ?');
      updateValues.push(is_active);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updateValues.push(req.params.menu_id);

    await db.execute(
      `UPDATE menubar SET ${updateFields.join(', ')} WHERE menu_id = ?`,
      updateValues
    );
    res.sendStatus(204);
  } catch (err) {
    console.error("[Error updating menu item]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Toggle menu item active status
router.patch('/:menu_id/toggle', async (req, res) => {
  try {
    await db.execute(
      'UPDATE menubar SET is_active = NOT is_active WHERE menu_id = ?',
      [req.params.menu_id]
    );
    res.sendStatus(204);
  } catch (err) {
    console.error("[Error toggling menu item status]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Delete a menu item
router.delete('/:menu_id', async (req, res) => {
  try {
    await db.execute('DELETE FROM menubar WHERE menu_id = ?', [req.params.menu_id]);
    res.sendStatus(204);
  } catch (err) {
    console.error("[Error deleting menu item]", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Reorder menu items
router.post('/reorder', async (req, res) => {
  const { items } = req.body; // Expected: [{ menu_id: 1, id: 1 }, { menu_id: 2, id: 2 }, ...]

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Items array is required' });
  }

  try {
    const updatePromises = items.map((item) => {
      return db.execute('UPDATE menubar SET id = ? WHERE menu_id = ?', [item.id, item.menu_id]);
    });

    await Promise.all(updatePromises);
    res.status(200).json({ message: 'Menu items reordered successfully' });
  } catch (err) {
    console.error("[Error reordering menu items]", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

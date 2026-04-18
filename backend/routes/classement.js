const express = require('express');
const db = require('../config/db');

const router = express.Router();

router.get('/', (req, res) => {
  db.query('SELECT username, xp, level FROM users ORDER BY xp DESC LIMIT 10', (err, results) => {
    if (err) return res.status(500).json({ message: 'Erreur classement' });
    res.json(results);
  });
});

module.exports = router;
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_2026_change_moi_pour_production';

// Register
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ message: 'Tous les champs sont obligatoires' });
  }

  try {
    const hashed = await bcrypt.hash(password, 10);
    db.query(
      'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
      [username, email, hashed],
      (err) => {
        if (err && err.code === 'ER_DUP_ENTRY') {
          return res.status(400).json({ message: 'Email ou pseudo déjà utilisé' });
        }
        if (err) return res.status(500).json({ message: 'Erreur serveur' });
        res.status(201).json({ message: 'Compte créé avec succès !' });
      }
    );
  } catch (e) {
    res.status(500).json({ message: 'Erreur lors de la création du compte' });
  }
});

// Login
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
    if (err || results.length === 0) {
      return res.status(401).json({ message: 'Identifiants incorrects' });
    }

    const user = results[0];
    const match = await bcrypt.compare(password, user.password);

    if (!match) return res.status(401).json({ message: 'Identifiants incorrects' });

    const token = jwt.sign(
      { id: user.id, username: user.username, xp: user.xp, level: user.level },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Connexion réussie',
      token,
      user: {
        id: user.id,
        username: user.username,
        xp: user.xp,
        level: user.level
      }
    });
  });
});

module.exports = router;
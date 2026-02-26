const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_2026_change_moi';

// ===================== MIDDLEWARE =====================
app.use(cors({ origin: 'http://localhost:3000', credentials: true }));
app.use(express.json());

// Multer pour upload PDF
const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// Auth JWT
const authenticateToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Token manquant' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Token invalide' });
    req.user = user;
    next();
  });
};

// ===================== DATABASE =====================
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

db.connect(() => console.log('✅ Connecté à MySQL'));

// ===================== ROUTES =====================
app.get('/api/test', (req, res) => res.json({ status: 'Backend OK ✅' }));

// AUTH
app.post('/api/register', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) return res.status(400).json({ message: 'Tous les champs obligatoires' });

  try {
    const hashed = await bcrypt.hash(password, 10);
    db.query('INSERT INTO users (username, email, password) VALUES (?, ?, ?)', [username, email, hashed], err => {
      if (err && err.code === 'ER_DUP_ENTRY') return res.status(400).json({ message: 'Email ou pseudo déjà utilisé' });
      if (err) return res.status(500).json({ message: 'Erreur serveur' });
      res.status(201).json({ message: 'Compte créé avec succès !' });
    });
  } catch (e) {
    res.status(500).json({ message: 'Erreur création' });
  }
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  db.query('SELECT * FROM users WHERE email = ?', [email], async (err, results) => {
    if (err || results.length === 0) return res.status(401).json({ message: 'Identifiants incorrects' });

    const user = results[0];
    if (!await bcrypt.compare(password, user.password)) return res.status(401).json({ message: 'Identifiants incorrects' });

    const token = jwt.sign({ id: user.id, username: user.username, xp: user.xp, level: user.level }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ message: 'Connexion réussie', token, user: { id: user.id, username: user.username, xp: user.xp, level: user.level } });
  });
});

// RÉSUMÉ IA
app.post('/api/summarize', authenticateToken, upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Aucun PDF envoyé' });

    const dataBuffer = fs.readFileSync(req.file.path);
    const pdfData = await pdfParse(dataBuffer);
    const text = pdfData.text;

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const result = await model.generateContent(`Résume ce cours en français, clair et structuré (titres, points clés). Max 800 mots :\n\n${text.substring(0, 35000)}`);
    const summary = result.response.text();

    db.query('INSERT INTO summaries (user_id, title, original_text, summary_text) VALUES (?, ?, ?, ?)', 
      [req.user.id, req.file.originalname || 'Cours', text, summary], 
      (err, result) => {
        fs.unlinkSync(req.file.path);
        res.json({ success: true, summary_id: result.insertId, summary });
      });
  } catch (error) {
    console.error('ERREUR SUMMARIZE:', error.message);
    res.status(500).json({ message: 'Erreur lors du résumé', details: error.message });
  }
});

// GÉNÉRER QUIZZ
app.post('/api/generate-quiz', authenticateToken, async (req, res) => {
  const { summary_id } = req.body;
  try {
    db.query('SELECT summary_text FROM summaries WHERE id = ? AND user_id = ?', [summary_id, req.user.id], async (err, results) => {
      if (err || results.length === 0) return res.status(404).json({ message: 'Résumé non trouvé' });

      const summaryText = results[0].summary_text;

      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

      const prompt = `Tu dois répondre UNIQUEMENT avec un JSON valide. Crée 8 questions QCM en français. Format exact : tableau d'objets JSON :\n[{"question":"...","options":["A. ...","B. ...","C. ...","D. ..."],"correctIndex":0}, ...]\n\nRésumé : ${summaryText}`;

      const result = await model.generateContent(prompt);
      let jsonStr = result.response.text().replace(/```json|```/g, '').trim();
      const questions = JSON.parse(jsonStr);

      res.json({ success: true, summary_id, questions });
    });
  } catch (error) {
    console.error('ERREUR QUIZZ:', error.message);
    res.status(500).json({ message: 'Erreur génération quizz', details: error.message });
  }
});

// SAUVEGARDE SCORE + XP
app.post('/api/save-quiz-result', authenticateToken, (req, res) => {
  const { summary_id, score } = req.body;
  const xpEarned = score * 50;

  db.query(
    'INSERT INTO quiz_results (user_id, summary_id, score, xp_earned) VALUES (?, ?, ?, ?)',
    [req.user.id, summary_id, score, xpEarned],
    err => {
      if (err) return res.status(500).json({ message: 'Erreur sauvegarde' });

      db.query('UPDATE users SET xp = xp + ? WHERE id = ?', [xpEarned, req.user.id], () => {
        res.json({ success: true, xpEarned });
      });
    }
  );
});

// CLASSEMENT
app.get('/api/classement', (req, res) => {
  db.query('SELECT username, xp, level FROM users ORDER BY xp DESC LIMIT 10', (err, results) => {
    if (err) return res.status(500).json({ message: 'Erreur classement' });
    res.json(results);
  });
});

// YOUTUBE SEARCH (corrigé)
app.get('/api/youtube-search', async (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ message: 'Recherche vide' });

  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(q)}&type=video&maxResults=12&key=${process.env.YOUTUBE_API_KEY}`
    );
    const data = await response.json();

    const videos = data.items.map((item) => ({   // ← ici corrigé (sans : any)
      id: item.id.videoId,
      title: item.snippet.title,
      thumbnail: item.snippet.thumbnails.medium.url,
      channel: item.snippet.channelTitle
    }));

    res.json(videos);
  } catch (error) {
    console.error('Erreur YouTube:', error);
    res.status(500).json({ message: 'Erreur recherche YouTube' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Serveur backend démarré sur http://localhost:${PORT}`);
});
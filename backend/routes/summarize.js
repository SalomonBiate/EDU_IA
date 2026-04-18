const express = require('express');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const authenticateToken = require('../middleware/auth');
const db = require('../config/db');

const router = express.Router();

const storage = multer.diskStorage({
  destination: 'uploads/',
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

router.post('/', authenticateToken, upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Aucun PDF envoyé' });

    const dataBuffer = fs.readFileSync(req.file.path);
    const pdfData = await pdfParse(dataBuffer);
    const text = pdfData.text || '';

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const result = await model.generateContent(
      `Résume ce cours en français, de manière claire, structurée avec titres et points clés. Maximum 800 mots :\n\n${text.substring(0, 35000)}`
    );

    const summary = result.response.text();

    db.query(
      'INSERT INTO summaries (user_id, title, original_text, summary_text) VALUES (?, ?, ?, ?)',
      [req.user.id, req.file.originalname || 'Cours', text, summary],
      (err, result) => {
        fs.unlinkSync(req.file.path);
        if (err) return res.status(500).json({ message: 'Erreur sauvegarde résumé' });
        res.json({ success: true, summary_id: result.insertId, summary });
      }
    );
  } catch (error) {
    console.error('ERREUR SUMMARIZE:', error);
    if (req.file) fs.unlinkSync(req.file.path);
    res.status(500).json({ message: 'Erreur lors du résumé', details: error.message });
  }
});

module.exports = router;
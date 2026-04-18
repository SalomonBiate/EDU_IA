const express = require('express');
const authenticateToken = require('../middleware/auth');
const db = require('../config/db');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const router = express.Router();

router.post('/generate-quiz', authenticateToken, async (req, res) => {
  const { summary_id } = req.body;

  try {
    db.query(
      'SELECT summary_text FROM summaries WHERE id = ? AND user_id = ?',
      [summary_id, req.user.id],
      async (err, results) => {
        if (err || results.length === 0) {
          return res.status(404).json({ message: 'Résumé non trouvé' });
        }

        const summaryText = results[0].summary_text;

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `Réponds UNIQUEMENT avec un JSON valide. Crée 8 questions QCM en français à partir du résumé. Format exact : un tableau d'objets comme ceci :\n[{"question":"...","options":["A. ...","B. ...","C. ...","D. ..."],"correctIndex":0}, ...]\n\nRésumé :\n${summaryText}`;

        const result = await model.generateContent(prompt);
        let jsonStr = result.response.text().replace(/```json|```/g, '').trim();
        const questions = JSON.parse(jsonStr);

        res.json({ success: true, summary_id, questions });
      }
    );
  } catch (error) {
    console.error('ERREUR QUIZZ:', error);
    res.status(500).json({ message: 'Erreur génération quizz', details: error.message });
  }
});

router.post('/save-quiz-result', authenticateToken, (req, res) => {
  const { summary_id, score } = req.body;
  const xpEarned = score * 50;

  db.query(
    'INSERT INTO quiz_results (user_id, summary_id, score, xp_earned) VALUES (?, ?, ?, ?)',
    [req.user.id, summary_id, score, xpEarned],
    (err) => {
      if (err) return res.status(500).json({ message: 'Erreur sauvegarde résultat' });

      db.query('UPDATE users SET xp = xp + ? WHERE id = ?', [xpEarned, req.user.id], (err2) => {
        if (err2) console.error('Erreur mise à jour XP:', err2);
        res.json({ success: true, xpEarned });
      });
    }
  );
});

module.exports = router;
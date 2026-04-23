const express = require('express');
const authenticateToken = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const router = express.Router();
const prisma = new PrismaClient();

router.post('/generate-quiz', authenticateToken, async (req, res) => {
  const { summary_id } = req.body;
  try {
    const summary = await prisma.summary.findUnique({
      where: { id: parseInt(summary_id) }
    });

    if (!summary) return res.status(404).json({ message: 'Résumé non trouvé' });

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const prompt = `Réponds UNIQUEMENT avec un JSON valide. Crée 8 questions QCM sur : ${summary.summaryText}. Format: [{"question":"...","options":["A","B","C","D"],"correctIndex":0}]`;
    
    const result = await model.generateContent(prompt);
    const questions = JSON.parse(result.response.text().replace(/```json|```/g, ''));

    res.json({ success: true, summary_id, questions });
  } catch (error) {
    res.status(500).json({ message: 'Erreur génération quizz' });
  }
});

router.post('/save-quiz-result', authenticateToken, async (req, res) => {
  const { summary_id, score } = req.body;
  const xpEarned = score * 50;
  try {
    await prisma.quizResult.create({
      data: {
        userId: req.user.id,
        summaryId: parseInt(summary_id),
        score: score,
        xpEarned: xpEarned
      }
    });

    await prisma.user.update({
      where: { id: req.user.id },
      data: { xp: { increment: xpEarned } }
    });

    res.json({ success: true, xpEarned });
  } catch (err) {
    res.status(500).json({ message: 'Erreur sauvegarde résultat' });
  }
});

module.exports = router;

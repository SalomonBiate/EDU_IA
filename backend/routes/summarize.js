const express = require('express');
const multer = require('multer');
const PdfParser = require('pdf2json');
const axios = require('axios'); 
const fs = require('fs');
const authenticateToken = require('../middleware/auth');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();
const upload = multer({ dest: 'uploads/' });

router.post('/', authenticateToken, upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Aucun PDF envoyé' });

    // 1. Extraction PDF
    const pdfParser = new PdfParser(null, 1);
    const text = await new Promise((resolve, reject) => {
      pdfParser.on("pdfParser_dataError", errData => reject(errData.parserError));
      pdfParser.on("pdfParser_dataReady", () => resolve(pdfParser.getRawTextContent()));
      pdfParser.loadPDF(req.file.path);
    });

    if (!text || text.trim().length < 10) {
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: "Le contenu du PDF est illisible." });
    }

    // 2. APPEL IA - URL NETTOYÉE (SANS ACCOLADES)
    const apiKey = process.env.GEMINI_API_KEY.trim();
    
    // On utilise une concaténation classique pour être sûr à 100% de l'URL
    const url = "https://googleapis.com" + apiKey;

    const aiResponse = await axios.post(url, {
      contents: [{
        parts: [{ text: "Fais un résumé structuré en français de ce cours :\n\n" + text.substring(0, 15000) }]
      }]
    });

    // 3. Extraction du texte (Attention aux index [0])
    const summaryText = aiResponse.data.candidates[0].content.parts[0].text;

    // 4. Sauvegarde Prisma
    const savedSummary = await prisma.summary.create({
      data: {
        userId: req.user.id,
        title: req.file.originalname,
        originalText: text.substring(0, 1000),
        summaryText: summaryText
      }
    });

    if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.json({ success: true, summary_id: savedSummary.id, summary: summaryText });

  } catch (error) {
    // Log précis pour voir la réponse de Google
    if (error.response) {
      console.error('ERREUR GOOGLE API:', JSON.stringify(error.response.data));
    } else {
      console.error('ERREUR BACKEND:', error.message);
    }
    
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ message: 'Erreur lors du résumé', details: error.message });
  }
});

module.exports = router;

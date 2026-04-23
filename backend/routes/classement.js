const express = require('express');
const { PrismaClient } = require('@prisma/client');
const router = express.Router();
const prisma = new PrismaClient();

router.get('/', async (req, res) => {
  try {
    const results = await prisma.user.findMany({
      orderBy: { xp: 'desc' },
      take: 10,
      select: { username: true, xp: true, level: true }
    });
    res.json(results);
  } catch (err) {
    res.status(500).json({ message: 'Erreur classement' });
  }
});

module.exports = router;

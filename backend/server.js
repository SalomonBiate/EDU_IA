const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({ 
  origin: ['http://localhost:3000', process.env.NEXT_PUBLIC_BACKEND_URL || ''],
  credentials: true 
}));
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/summarize', require('./routes/summarize'));
app.use('/api/quiz', require('./routes/quiz'));
app.use('/api/classement', require('./routes/classement'));
app.use('/api/youtube-search', require('./routes/youtube'));

// Test route
app.get('/api/test', (req, res) => {
  res.json({ status: 'Backend OK ✅' });
});

app.listen(PORT, () => {
  console.log(`✅ Serveur backend démarré sur http://localhost:${PORT}`);
});
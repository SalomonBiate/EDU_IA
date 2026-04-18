const express = require('express');

const router = express.Router();

router.get('/', async (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ message: 'Recherche vide' });

  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(q)}&type=video&maxResults=12&key=${process.env.YOUTUBE_API_KEY}`
    );
    const data = await response.json();

    const videos = data.items.map((item) => ({
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

module.exports = router;
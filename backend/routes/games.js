const express = require('express');
const router = express.Router();
const {
  getGames,
  getGame,
  createGame,
  updateGame,
  deleteGame,
  toggleLike,
  rateGame,
  recordPlay,
  getTrending,
  getRecommended
} = require('../controllers/gameController');
const { protect, optionalAuth } = require('../middleware/auth');
const { upload } = require('../config/aws');

// Public routes
router.get('/', optionalAuth, getGames);
router.get('/trending', getTrending);
router.get('/recommended', getRecommended);
router.get('/:id', optionalAuth, getGame);

// Protected routes
router.post('/', protect, createGame);
router.put('/:id', protect, updateGame);
router.delete('/:id', protect, deleteGame);
router.post('/:id/like', protect, toggleLike);
router.post('/:id/rate', protect, rateGame);
router.post('/:id/play', protect, recordPlay);

// File upload route for game assets
router.post('/upload', protect, upload.single('gameFile'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    res.json({
      success: true,
      data: {
        url: req.file.location,
        key: req.file.key,
        size: req.file.size
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Error uploading file' });
  }
});

module.exports = router;

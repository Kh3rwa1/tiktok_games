const express = require('express');
const router = express.Router();
const {
  getQuizzes,
  getQuiz,
  createQuiz,
  updateQuiz,
  deleteQuiz,
  submitQuiz,
  getMyAttempts,
  getTrending,
  getRecommended,
  getStats
} = require('../controllers/quizController');
const { protect, optionalAuth } = require('../middleware/auth');

// Public routes
router.get('/', optionalAuth, getQuizzes);
router.get('/trending', getTrending);
router.get('/recommended', getRecommended);
router.get('/stats', getStats);
router.get('/:id', optionalAuth, getQuiz);

// Protected routes
router.post('/', protect, createQuiz);
router.put('/:id', protect, updateQuiz);
router.delete('/:id', protect, deleteQuiz);
router.post('/:id/submit', protect, submitQuiz);
router.get('/attempts/me', protect, getMyAttempts);

module.exports = router;

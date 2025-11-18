const Game = require('../models/mysql/Game');
const User = require('../models/mysql/User');

// @desc    Get all games with pagination and filters
// @route   GET /api/games
// @access  Public
const getGames = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      category,
      search,
      sortBy = 'createdAt',
      order = 'desc',
      featured
    } = req.query;

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sortBy,
      order,
      isActive: true
    };

    if (category) options.category = category;
    if (featured === 'true') options.featured = true;
    if (search) options.search = search;

    const result = await Game.findAll(options);

    res.json({
      success: true,
      data: result.games,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Get games error:', error);
    res.status(500).json({ message: 'Server error fetching games' });
  }
};

// @desc    Get single game by ID
// @route   GET /api/games/:id
// @access  Public
const getGame = async (req, res) => {
  try {
    const game = await Game.findById(req.params.id);

    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }

    await Game.incrementViews(req.params.id);

    res.json({
      success: true,
      data: game
    });
  } catch (error) {
    console.error('Get game error:', error);
    res.status(500).json({ message: 'Server error fetching game' });
  }
};

// @desc    Create new game
// @route   POST /api/games
// @access  Private
const createGame = async (req, res) => {
  try {
    const {
      title, description, thumbnail, gameUrl, category,
      tags, difficulty, controls, requirements
    } = req.body;

    const game = await Game.create({
      title, description, thumbnail, gameUrl, category,
      tags, difficulty, controls, requirements,
      creatorId: req.user.id
    });

    res.status(201).json({
      success: true,
      data: game
    });
  } catch (error) {
    console.error('Create game error:', error);
    res.status(500).json({ message: 'Server error creating game' });
  }
};

// @desc    Update game
// @route   PUT /api/games/:id
// @access  Private
const updateGame = async (req, res) => {
  try {
    const game = await Game.findById(req.params.id);

    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }

    if (game.creatorId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to update this game' });
    }

    const allowedUpdates = ['title', 'description', 'thumbnail', 'gameUrl', 'category', 'tags', 'difficulty', 'controls', 'requirements'];
    const updates = {};
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    const updatedGame = await Game.update(req.params.id, updates);

    res.json({
      success: true,
      data: updatedGame
    });
  } catch (error) {
    console.error('Update game error:', error);
    res.status(500).json({ message: 'Server error updating game' });
  }
};

// @desc    Delete game
// @route   DELETE /api/games/:id
// @access  Private
const deleteGame = async (req, res) => {
  try {
    const game = await Game.findById(req.params.id);

    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }

    if (game.creatorId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete this game' });
    }

    await Game.delete(req.params.id);

    res.json({
      success: true,
      message: 'Game deleted successfully'
    });
  } catch (error) {
    console.error('Delete game error:', error);
    res.status(500).json({ message: 'Server error deleting game' });
  }
};

// @desc    Like/Unlike game
// @route   POST /api/games/:id/like
// @access  Private
const toggleLike = async (req, res) => {
  try {
    const game = await Game.findById(req.params.id);

    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }

    const wasLiked = await Game.isLikedBy(req.params.id, req.user.id);
    const updatedGame = await Game.toggleLike(req.params.id, req.user.id);

    res.json({
      success: true,
      data: {
        liked: !wasLiked,
        likes: updatedGame.stats.likes
      }
    });
  } catch (error) {
    console.error('Toggle like error:', error);
    res.status(500).json({ message: 'Server error toggling like' });
  }
};

// @desc    Rate game
// @route   POST /api/games/:id/rate
// @access  Private
const rateGame = async (req, res) => {
  try {
    const { rating } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    const game = await Game.findById(req.params.id);

    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }

    const updatedGame = await Game.addRating(req.params.id, req.user.id, rating);

    res.json({
      success: true,
      data: {
        averageRating: updatedGame.averageRating,
        userRating: rating
      }
    });
  } catch (error) {
    console.error('Rate game error:', error);
    res.status(500).json({ message: 'Server error rating game' });
  }
};

// @desc    Record game play
// @route   POST /api/games/:id/play
// @access  Private
const recordPlay = async (req, res) => {
  try {
    const { duration } = req.body;
    const game = await Game.findById(req.params.id);

    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }

    await Game.incrementPlays(req.params.id);
    await User.addPlayHistory(req.user.id, {
      gameId: req.params.id,
      duration: duration || 0
    });

    res.json({
      success: true,
      message: 'Play recorded successfully'
    });
  } catch (error) {
    console.error('Record play error:', error);
    res.status(500).json({ message: 'Server error recording play' });
  }
};

// @desc    Get trending games
// @route   GET /api/games/trending
// @access  Public
const getTrending = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const games = await Game.getTrending(parseInt(limit));

    res.json({
      success: true,
      data: games
    });
  } catch (error) {
    console.error('Get trending error:', error);
    res.status(500).json({ message: 'Server error fetching trending games' });
  }
};

// @desc    Get recommended games
// @route   GET /api/games/recommended
// @access  Public
const getRecommended = async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const games = await Game.getRecommended(parseInt(limit));

    res.json({
      success: true,
      data: games
    });
  } catch (error) {
    console.error('Get recommended error:', error);
    res.status(500).json({ message: 'Server error fetching recommended games' });
  }
};

module.exports = {
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
};

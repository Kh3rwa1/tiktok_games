const Game = require('../models/Game');
const User = require('../models/User');

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

    // Build query
    const query = { isActive: true };

    if (category) {
      query.category = category;
    }

    if (featured === 'true') {
      query.isFeatured = true;
    }

    if (search) {
      query.$text = { $search: search };
    }

    // Build sort object
    const sortOrder = order === 'asc' ? 1 : -1;
    const sortOptions = {};

    switch (sortBy) {
      case 'popular':
        sortOptions['stats.plays'] = sortOrder;
        break;
      case 'likes':
        sortOptions['stats.likes'] = sortOrder;
        break;
      case 'rating':
        sortOptions.averageRating = sortOrder;
        break;
      default:
        sortOptions.createdAt = sortOrder;
    }

    // Execute query with pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const games = await Game.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNum)
      .populate('creator', 'username avatar')
      .lean();

    const total = await Game.countDocuments(query);

    res.json({
      success: true,
      data: games,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
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
    const game = await Game.findById(req.params.id)
      .populate('creator', 'username avatar bio')
      .populate('likedBy', 'username avatar');

    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }

    // Increment view count
    await game.incrementViews();

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
      title,
      description,
      thumbnail,
      gameUrl,
      category,
      tags,
      difficulty,
      controls,
      requirements
    } = req.body;

    const game = await Game.create({
      title,
      description,
      thumbnail,
      gameUrl,
      category,
      tags,
      difficulty,
      controls,
      requirements,
      creator: req.user.id
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
    let game = await Game.findById(req.params.id);

    if (!game) {
      return res.status(404).json({ message: 'Game not found' });
    }

    // Check if user is creator or admin
    if (game.creator.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to update this game' });
    }

    const allowedUpdates = [
      'title',
      'description',
      'thumbnail',
      'gameUrl',
      'category',
      'tags',
      'difficulty',
      'controls',
      'requirements'
    ];

    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        game[field] = req.body[field];
      }
    });

    await game.save();

    res.json({
      success: true,
      data: game
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

    // Check if user is creator or admin
    if (game.creator.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete this game' });
    }

    // Soft delete - just mark as inactive
    game.isActive = false;
    await game.save();

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

    const userIndex = game.likedBy.indexOf(req.user.id);

    if (userIndex > -1) {
      // Unlike
      game.likedBy.splice(userIndex, 1);
      game.stats.likes -= 1;
    } else {
      // Like
      game.likedBy.push(req.user.id);
      game.stats.likes += 1;
    }

    await game.save();

    res.json({
      success: true,
      data: {
        liked: userIndex === -1,
        likes: game.stats.likes
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

    // Check if user already rated
    const existingRatingIndex = game.ratings.findIndex(
      r => r.user.toString() === req.user.id
    );

    if (existingRatingIndex > -1) {
      // Update existing rating
      game.ratings[existingRatingIndex].rating = rating;
    } else {
      // Add new rating
      game.ratings.push({
        user: req.user.id,
        rating
      });
    }

    game.updateAverageRating();
    await game.save();

    res.json({
      success: true,
      data: {
        averageRating: game.averageRating,
        totalRatings: game.ratings.length
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

    // Increment play count
    await game.incrementPlays();

    // Update average play time
    if (duration) {
      const totalPlayTime = game.stats.averagePlayTime * (game.stats.plays - 1) + duration;
      game.stats.averagePlayTime = Math.round(totalPlayTime / game.stats.plays);
      await game.save();
    }

    // Add to user's play history
    const user = await User.findById(req.user.id);
    user.playHistory.push({
      game: game._id,
      duration: duration || 0
    });
    user.stats.totalGamesPlayed += 1;
    user.stats.totalPlayTime += duration || 0;
    await user.save();

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

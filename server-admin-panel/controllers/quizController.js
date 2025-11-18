const Quiz = require('../models/mysql/Quiz');

// @desc    Get all quizzes with pagination and filters
// @route   GET /api/quizzes
// @access  Public
const getQuizzes = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      category,
      search,
      sortBy = 'createdAt',
      order = 'desc',
      featured,
      difficulty
    } = req.query;

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sortBy,
      order,
      isActive: true
    };

    if (category) options.category = category;
    if (difficulty) options.difficulty = difficulty;
    if (featured === 'true') options.featured = true;
    if (search) options.search = search;

    const result = await Quiz.findAll(options);

    res.json({
      success: true,
      data: result.quizzes,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Get quizzes error:', error);
    res.status(500).json({ message: 'Server error fetching quizzes' });
  }
};

// @desc    Get single quiz by ID
// @route   GET /api/quizzes/:id
// @access  Public
const getQuiz = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    res.json({
      success: true,
      data: quiz
    });
  } catch (error) {
    console.error('Get quiz error:', error);
    res.status(500).json({ message: 'Server error fetching quiz' });
  }
};

// @desc    Create new quiz
// @route   POST /api/quizzes
// @access  Private
const createQuiz = async (req, res) => {
  try {
    const {
      title, description, thumbnail, category,
      tags, difficulty, timeLimit, passingScore,
      instructions, questions
    } = req.body;

    // Validate required fields
    if (!title) {
      return res.status(400).json({ message: 'Title is required' });
    }

    if (!questions || questions.length === 0) {
      return res.status(400).json({ message: 'At least one question is required' });
    }

    // Validate questions
    for (const question of questions) {
      if (!question.questionText) {
        return res.status(400).json({ message: 'Question text is required for all questions' });
      }

      if (!question.answers || question.answers.length < 2) {
        return res.status(400).json({ message: 'Each question must have at least 2 answers' });
      }

      const hasCorrectAnswer = question.answers.some(a => a.isCorrect);
      if (!hasCorrectAnswer) {
        return res.status(400).json({ message: 'Each question must have at least one correct answer' });
      }
    }

    const quiz = await Quiz.create({
      title,
      description,
      thumbnail,
      category,
      tags,
      difficulty,
      timeLimit,
      passingScore,
      instructions,
      questions,
      creatorId: req.user.id
    });

    res.status(201).json({
      success: true,
      data: quiz,
      message: 'Quiz created successfully'
    });
  } catch (error) {
    console.error('Create quiz error:', error);
    res.status(500).json({ message: 'Server error creating quiz' });
  }
};

// @desc    Update quiz
// @route   PUT /api/quizzes/:id
// @access  Private
const updateQuiz = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    // Check if user is the creator
    if (quiz.creatorId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to update this quiz' });
    }

    const {
      title, description, thumbnail, category,
      tags, difficulty, timeLimit, passingScore,
      instructions, questions
    } = req.body;

    // Validate questions if provided
    if (questions) {
      for (const question of questions) {
        if (!question.questionText) {
          return res.status(400).json({ message: 'Question text is required for all questions' });
        }

        if (!question.answers || question.answers.length < 2) {
          return res.status(400).json({ message: 'Each question must have at least 2 answers' });
        }

        const hasCorrectAnswer = question.answers.some(a => a.isCorrect);
        if (!hasCorrectAnswer) {
          return res.status(400).json({ message: 'Each question must have at least one correct answer' });
        }
      }
    }

    const updatedQuiz = await Quiz.update(req.params.id, {
      title,
      description,
      thumbnail,
      category,
      tags,
      difficulty,
      timeLimit,
      passingScore,
      instructions,
      questions
    });

    res.json({
      success: true,
      data: updatedQuiz,
      message: 'Quiz updated successfully'
    });
  } catch (error) {
    console.error('Update quiz error:', error);
    res.status(500).json({ message: 'Server error updating quiz' });
  }
};

// @desc    Delete quiz
// @route   DELETE /api/quizzes/:id
// @access  Private
const deleteQuiz = async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id);

    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    // Check if user is the creator
    if (quiz.creatorId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete this quiz' });
    }

    await Quiz.delete(req.params.id);

    res.json({
      success: true,
      message: 'Quiz deleted successfully'
    });
  } catch (error) {
    console.error('Delete quiz error:', error);
    res.status(500).json({ message: 'Server error deleting quiz' });
  }
};

// @desc    Submit quiz attempt
// @route   POST /api/quizzes/:id/submit
// @access  Private
const submitQuiz = async (req, res) => {
  try {
    const { answers } = req.body;

    if (!answers) {
      return res.status(400).json({ message: 'Answers are required' });
    }

    const result = await Quiz.submitAttempt(
      req.params.id,
      req.user.id,
      answers
    );

    res.json({
      success: true,
      data: result,
      message: result.passed ? 'Congratulations! You passed!' : 'Keep trying! You can do better!'
    });
  } catch (error) {
    console.error('Submit quiz error:', error);
    res.status(500).json({ message: error.message || 'Server error submitting quiz' });
  }
};

// @desc    Get user's quiz attempts
// @route   GET /api/quizzes/attempts
// @access  Private
const getMyAttempts = async (req, res) => {
  try {
    const { quizId } = req.query;

    const attempts = await Quiz.getUserAttempts(
      req.user.id,
      quizId ? parseInt(quizId) : null
    );

    res.json({
      success: true,
      data: attempts
    });
  } catch (error) {
    console.error('Get attempts error:', error);
    res.status(500).json({ message: 'Server error fetching attempts' });
  }
};

// @desc    Get trending quizzes
// @route   GET /api/quizzes/trending
// @access  Public
const getTrending = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const quizzes = await Quiz.getTrending(limit);

    res.json({
      success: true,
      data: quizzes
    });
  } catch (error) {
    console.error('Get trending quizzes error:', error);
    res.status(500).json({ message: 'Server error fetching trending quizzes' });
  }
};

// @desc    Get recommended quizzes
// @route   GET /api/quizzes/recommended
// @access  Public
const getRecommended = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const quizzes = await Quiz.getRecommended(limit);

    res.json({
      success: true,
      data: quizzes
    });
  } catch (error) {
    console.error('Get recommended quizzes error:', error);
    res.status(500).json({ message: 'Server error fetching recommended quizzes' });
  }
};

// @desc    Get quiz statistics
// @route   GET /api/quizzes/stats
// @access  Public
const getStats = async (req, res) => {
  try {
    const stats = await Quiz.getStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Get quiz stats error:', error);
    res.status(500).json({ message: 'Server error fetching quiz statistics' });
  }
};

module.exports = {
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
};

/**
 * Quiz Model for MySQL
 */

const { pool } = require('../../config/database');

class QuizModel {
  /**
   * Create a new quiz
   */
  async create(quizData) {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Insert quiz
      const [result] = await connection.execute(
        `INSERT INTO quizzes (title, description, thumbnail, category, tags,
          difficulty, creator_id, time_limit, passing_score, is_featured, instructions)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          quizData.title,
          quizData.description || '',
          quizData.thumbnail || '',
          quizData.category || 'general',
          JSON.stringify(quizData.tags || []),
          quizData.difficulty || 'medium',
          quizData.creatorId,
          quizData.timeLimit || 0, // 0 means no time limit
          quizData.passingScore || 60, // Percentage
          quizData.isFeatured || false,
          quizData.instructions || ''
        ]
      );

      const quizId = result.insertId;

      // Insert questions if provided
      if (quizData.questions && quizData.questions.length > 0) {
        for (let i = 0; i < quizData.questions.length; i++) {
          const question = quizData.questions[i];

          const [questionResult] = await connection.execute(
            `INSERT INTO quiz_questions (quiz_id, question_text, question_type, points, order_index, explanation)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
              quizId,
              question.questionText,
              question.questionType || 'multiple_choice',
              question.points || 1,
              question.orderIndex !== undefined ? question.orderIndex : i,
              question.explanation || ''
            ]
          );

          const questionId = questionResult.insertId;

          // Insert answers for this question
          if (question.answers && question.answers.length > 0) {
            for (const answer of question.answers) {
              await connection.execute(
                `INSERT INTO quiz_answers (question_id, answer_text, is_correct)
                 VALUES (?, ?, ?)`,
                [questionId, answer.answerText, answer.isCorrect || false]
              );
            }
          }
        }
      }

      await connection.commit();
      connection.release();

      return this.findById(quizId);
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  }

  /**
   * Find quiz by ID with questions and answers
   */
  async findById(id) {
    const [rows] = await pool.execute(
      `SELECT q.*, u.username as creator_username, u.avatar as creator_avatar
       FROM quizzes q
       LEFT JOIN users u ON q.creator_id = u.id
       WHERE q.id = ?`,
      [id]
    );

    if (rows.length === 0) return null;

    const quiz = rows[0];

    // Get questions
    const [questions] = await pool.execute(
      `SELECT * FROM quiz_questions WHERE quiz_id = ? ORDER BY order_index ASC`,
      [id]
    );

    // Get answers for each question
    for (const question of questions) {
      const [answers] = await pool.execute(
        `SELECT * FROM quiz_answers WHERE question_id = ?`,
        [question.id]
      );
      question.answers = answers;
    }

    quiz.questions = questions;

    return this.formatQuiz(quiz);
  }

  /**
   * Find all quizzes with pagination and filters
   */
  async findAll(options = {}) {
    const {
      page = 1,
      limit = 10,
      category,
      search,
      sortBy = 'createdAt',
      order = 'desc',
      featured,
      isActive = true,
      difficulty
    } = options;

    const offset = (page - 1) * limit;
    const conditions = [];
    const values = [];

    // Only filter by isActive if explicitly set
    if (isActive !== undefined) {
      conditions.push('q.is_active = ?');
      values.push(isActive);
    }

    if (category) {
      conditions.push('q.category = ?');
      values.push(category);
    }

    if (difficulty) {
      conditions.push('q.difficulty = ?');
      values.push(difficulty);
    }

    if (featured !== undefined) {
      conditions.push('q.is_featured = ?');
      values.push(featured);
    }

    if (search) {
      conditions.push('(q.title LIKE ? OR q.description LIKE ?)');
      values.push(`%${search}%`, `%${search}%`);
    }

    const sortField = this.getSortField(sortBy);
    const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // Build WHERE clause
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get quizzes
    const [quizzes] = await pool.execute(
      `SELECT q.*, u.username as creator_username, u.avatar as creator_avatar,
        (SELECT COUNT(*) FROM quiz_questions WHERE quiz_id = q.id) as question_count
       FROM quizzes q
       LEFT JOIN users u ON q.creator_id = u.id
       ${whereClause}
       ORDER BY ${sortField} ${sortOrder}
       LIMIT ? OFFSET ?`,
      [...values, limit, offset]
    );

    // Get total count
    const [countResult] = await pool.execute(
      `SELECT COUNT(*) as total FROM quizzes q ${whereClause}`,
      values
    );

    const total = countResult[0].total;

    return {
      quizzes: quizzes.map(quiz => this.formatQuiz(quiz, false)), // Don't include questions in list view
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasMore: offset + quizzes.length < total
      }
    };
  }

  /**
   * Update quiz
   */
  async update(id, updates) {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Update quiz basic info
      const allowedFields = [
        'title', 'description', 'thumbnail', 'category',
        'tags', 'difficulty', 'time_limit', 'passing_score',
        'is_active', 'is_featured', 'instructions'
      ];

      const fieldMapping = {
        timeLimit: 'time_limit',
        passingScore: 'passing_score',
        isActive: 'is_active',
        isFeatured: 'is_featured'
      };

      const updateFields = [];
      const values = [];

      for (const [key, value] of Object.entries(updates)) {
        const dbField = fieldMapping[key] || key;
        if (allowedFields.includes(dbField)) {
          updateFields.push(`${dbField} = ?`);
          values.push(key === 'tags' ? JSON.stringify(value) : value);
        }
      }

      if (updateFields.length > 0) {
        values.push(id);
        await connection.execute(
          `UPDATE quizzes SET ${updateFields.join(', ')} WHERE id = ?`,
          values
        );
      }

      // Update questions if provided
      if (updates.questions) {
        // Delete existing questions and answers (cascade will handle answers)
        await connection.execute(
          `DELETE FROM quiz_questions WHERE quiz_id = ?`,
          [id]
        );

        // Insert new questions
        for (let i = 0; i < updates.questions.length; i++) {
          const question = updates.questions[i];

          const [questionResult] = await connection.execute(
            `INSERT INTO quiz_questions (quiz_id, question_text, question_type, points, order_index, explanation)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
              id,
              question.questionText,
              question.questionType || 'multiple_choice',
              question.points || 1,
              question.orderIndex !== undefined ? question.orderIndex : i,
              question.explanation || ''
            ]
          );

          const questionId = questionResult.insertId;

          // Insert answers
          if (question.answers && question.answers.length > 0) {
            for (const answer of question.answers) {
              await connection.execute(
                `INSERT INTO quiz_answers (question_id, answer_text, is_correct)
                 VALUES (?, ?, ?)`,
                [questionId, answer.answerText, answer.isCorrect || false]
              );
            }
          }
        }
      }

      await connection.commit();
      connection.release();

      return this.findById(id);
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  }

  /**
   * Delete quiz (soft delete)
   */
  async delete(id) {
    await pool.execute(
      `UPDATE quizzes SET is_active = FALSE WHERE id = ?`,
      [id]
    );
    return true;
  }

  /**
   * Hard delete quiz (for admin)
   */
  async hardDelete(id) {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Delete answers first
      await connection.execute(
        `DELETE qa FROM quiz_answers qa
         INNER JOIN quiz_questions qq ON qa.question_id = qq.id
         WHERE qq.quiz_id = ?`,
        [id]
      );

      // Delete questions
      await connection.execute(
        `DELETE FROM quiz_questions WHERE quiz_id = ?`,
        [id]
      );

      // Delete quiz attempts
      await connection.execute(
        `DELETE FROM quiz_attempts WHERE quiz_id = ?`,
        [id]
      );

      // Delete quiz
      await connection.execute(
        `DELETE FROM quizzes WHERE id = ?`,
        [id]
      );

      await connection.commit();
      connection.release();

      return true;
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  }

  /**
   * Submit quiz attempt
   */
  async submitAttempt(quizId, userId, answers) {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      // Get quiz with questions and correct answers
      const quiz = await this.findById(quizId);

      if (!quiz) {
        throw new Error('Quiz not found');
      }

      // Calculate score
      let correctAnswers = 0;
      let totalPoints = 0;
      let earnedPoints = 0;

      const answerDetails = [];

      for (const question of quiz.questions) {
        totalPoints += question.points;

        const userAnswer = answers[question.id];
        if (!userAnswer) continue;

        const correctAnswerIds = question.answers
          .filter(a => a.isCorrect)
          .map(a => a.id);

        // Check if answer is correct
        let isCorrect = false;

        if (question.questionType === 'multiple_choice') {
          isCorrect = correctAnswerIds.includes(parseInt(userAnswer));
        } else if (question.questionType === 'true_false') {
          isCorrect = correctAnswerIds.includes(parseInt(userAnswer));
        } else if (question.questionType === 'multiple_select') {
          // For multiple select, all correct answers must be selected
          const userAnswerIds = Array.isArray(userAnswer) ? userAnswer : [userAnswer];
          isCorrect = correctAnswerIds.length === userAnswerIds.length &&
                     correctAnswerIds.every(id => userAnswerIds.includes(id));
        }

        if (isCorrect) {
          correctAnswers++;
          earnedPoints += question.points;
        }

        answerDetails.push({
          questionId: question.id,
          userAnswer,
          isCorrect,
          correctAnswer: correctAnswerIds,
          points: isCorrect ? question.points : 0
        });
      }

      const scorePercentage = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;
      const passed = scorePercentage >= quiz.passingScore;

      // Save attempt
      const [result] = await connection.execute(
        `INSERT INTO quiz_attempts (quiz_id, user_id, score, total_questions,
          correct_answers, passed, answers, time_taken)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          quizId,
          userId,
          scorePercentage,
          quiz.questions.length,
          correctAnswers,
          passed,
          JSON.stringify(answerDetails),
          0 // Time taken - to be implemented
        ]
      );

      // Update quiz stats
      await connection.execute(
        `UPDATE quizzes SET
          attempts = attempts + 1,
          total_score = total_score + ?,
          average_score = (total_score + ?) / (attempts + 1)
         WHERE id = ?`,
        [scorePercentage, scorePercentage, quizId]
      );

      await connection.commit();
      connection.release();

      return {
        attemptId: result.insertId,
        score: scorePercentage,
        passed,
        correctAnswers,
        totalQuestions: quiz.questions.length,
        earnedPoints,
        totalPoints,
        answers: answerDetails
      };
    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }
  }

  /**
   * Get user's quiz attempts
   */
  async getUserAttempts(userId, quizId = null) {
    let query = `
      SELECT qa.*, q.title as quiz_title
      FROM quiz_attempts qa
      INNER JOIN quizzes q ON qa.quiz_id = q.id
      WHERE qa.user_id = ?
    `;

    const params = [userId];

    if (quizId) {
      query += ` AND qa.quiz_id = ?`;
      params.push(quizId);
    }

    query += ` ORDER BY qa.created_at DESC`;

    const [rows] = await pool.execute(query, params);

    return rows.map(attempt => ({
      id: attempt.id,
      quizId: attempt.quiz_id,
      quizTitle: attempt.quiz_title,
      score: attempt.score,
      totalQuestions: attempt.total_questions,
      correctAnswers: attempt.correct_answers,
      passed: attempt.passed,
      answers: typeof attempt.answers === 'string' ? JSON.parse(attempt.answers) : attempt.answers,
      timeTaken: attempt.time_taken,
      createdAt: attempt.created_at
    }));
  }

  /**
   * Get trending quizzes
   */
  async getTrending(limit = 10) {
    const [rows] = await pool.execute(
      `SELECT q.*, u.username as creator_username, u.avatar as creator_avatar,
        (SELECT COUNT(*) FROM quiz_questions WHERE quiz_id = q.id) as question_count
       FROM quizzes q
       LEFT JOIN users u ON q.creator_id = u.id
       WHERE q.is_active = TRUE
       ORDER BY q.attempts DESC, q.average_score DESC
       LIMIT ?`,
      [limit]
    );

    return rows.map(quiz => this.formatQuiz(quiz, false));
  }

  /**
   * Get recommended quizzes
   */
  async getRecommended(limit = 10) {
    const [rows] = await pool.execute(
      `SELECT q.*, u.username as creator_username, u.avatar as creator_avatar,
        (SELECT COUNT(*) FROM quiz_questions WHERE quiz_id = q.id) as question_count
       FROM quizzes q
       LEFT JOIN users u ON q.creator_id = u.id
       WHERE q.is_active = TRUE
       ORDER BY q.average_score DESC, q.attempts DESC
       LIMIT ?`,
      [limit]
    );

    return rows.map(quiz => this.formatQuiz(quiz, false));
  }

  /**
   * Get quiz statistics
   */
  async getStats() {
    const [stats] = await pool.execute(`
      SELECT
        COUNT(*) as total_quizzes,
        SUM(CASE WHEN is_active = TRUE THEN 1 ELSE 0 END) as active_quizzes,
        SUM(CASE WHEN is_featured = TRUE THEN 1 ELSE 0 END) as featured_quizzes,
        SUM(attempts) as total_attempts,
        AVG(average_score) as platform_average_score
      FROM quizzes
    `);

    const [questionStats] = await pool.execute(`
      SELECT COUNT(*) as total_questions
      FROM quiz_questions
    `);

    return {
      totalQuizzes: stats[0].total_quizzes || 0,
      activeQuizzes: stats[0].active_quizzes || 0,
      featuredQuizzes: stats[0].featured_quizzes || 0,
      totalAttempts: stats[0].total_attempts || 0,
      platformAverageScore: parseFloat(stats[0].platform_average_score) || 0,
      totalQuestions: questionStats[0].total_questions || 0
    };
  }

  /**
   * Get sort field for queries
   */
  getSortField(sortBy) {
    const sortFields = {
      'popular': 'q.attempts',
      'score': 'q.average_score',
      'createdAt': 'q.created_at',
      'title': 'q.title'
    };

    return sortFields[sortBy] || 'q.created_at';
  }

  /**
   * Format quiz object
   */
  formatQuiz(quiz, includeQuestions = true) {
    const formatted = {
      id: quiz.id,
      title: quiz.title,
      description: quiz.description,
      thumbnail: quiz.thumbnail,
      category: quiz.category,
      tags: typeof quiz.tags === 'string' ? JSON.parse(quiz.tags || '[]') : (quiz.tags || []),
      difficulty: quiz.difficulty,
      creatorId: quiz.creator_id,
      creator: quiz.creator_username ? {
        id: quiz.creator_id,
        username: quiz.creator_username,
        avatar: quiz.creator_avatar
      } : null,
      timeLimit: quiz.time_limit,
      passingScore: quiz.passing_score,
      instructions: quiz.instructions,
      stats: {
        attempts: quiz.attempts || 0,
        averageScore: parseFloat(quiz.average_score) || 0,
        questionCount: quiz.question_count || (quiz.questions ? quiz.questions.length : 0)
      },
      isActive: quiz.is_active,
      isFeatured: quiz.is_featured,
      createdAt: quiz.created_at,
      updatedAt: quiz.updated_at
    };

    if (includeQuestions && quiz.questions) {
      formatted.questions = quiz.questions.map(q => ({
        id: q.id,
        questionText: q.question_text,
        questionType: q.question_type,
        points: q.points,
        orderIndex: q.order_index,
        explanation: q.explanation,
        answers: q.answers ? q.answers.map(a => ({
          id: a.id,
          answerText: a.answer_text,
          isCorrect: a.is_correct
        })) : []
      }));
    }

    return formatted;
  }
}

module.exports = new QuizModel();

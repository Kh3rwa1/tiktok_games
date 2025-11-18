# Quiz Generator Feature

## Overview

A comprehensive quiz generator has been added to the TikTok Games platform. This feature allows administrators to create, manage, and publish quizzes with multiple question types, automatic scoring, and detailed analytics.

## Features

### Quiz Management
- **Create Quizzes**: Build quizzes with custom titles, descriptions, categories, and difficulty levels
- **Multiple Question Types**: Support for multiple choice, true/false questions
- **Configurable Settings**:
  - Time limits (optional)
  - Passing score thresholds
  - Point values per question
  - Instructions for quiz takers
- **Rich Media**: Add thumbnails to quizzes
- **Categories**: General, Trivia, Education, Entertainment, Sports, Science, History, Geography

### Question Builder
- Dynamic question creation with unlimited questions per quiz
- Each question supports:
  - Question text
  - Question type (multiple choice or true/false)
  - Points (weighted scoring)
  - Explanation for correct answer
  - Multiple answer options
  - Mark correct answers

### Admin Features
- Full CRUD operations for quizzes
- Toggle featured status
- Activate/deactivate quizzes
- Search and filter quizzes
- View quiz statistics:
  - Total attempts
  - Average score
  - Number of questions
- Comprehensive quiz listing with analytics

### User Features (API Available)
- Take quizzes
- Submit answers
- Automatic scoring
- Pass/fail determination
- View detailed results with explanations
- Track quiz history
- View trending and recommended quizzes

## Database Schema

### Tables Created
Run the SQL schema to create the following tables:

1. **quizzes**: Main quiz information
2. **quiz_questions**: Questions for each quiz
3. **quiz_answers**: Answer options for each question
4. **quiz_attempts**: User quiz attempts and results

SQL schema file: `server-admin-panel/schema/quiz_tables.sql`

To set up the database:
```bash
mysql -u your_username -p your_database < server-admin-panel/schema/quiz_tables.sql
```

## API Endpoints

### Public Endpoints
```
GET    /api/quizzes              # List all active quizzes
GET    /api/quizzes/:id          # Get quiz details
GET    /api/quizzes/trending     # Get trending quizzes
GET    /api/quizzes/recommended  # Get recommended quizzes
GET    /api/quizzes/stats        # Get quiz statistics
POST   /api/quizzes/:id/submit   # Submit quiz attempt (auth required)
GET    /api/quizzes/attempts/me  # Get my quiz attempts (auth required)
```

### Admin Endpoints
```
GET    /admin/quizzes            # List all quizzes (including inactive)
GET    /admin/quizzes/:id        # Get quiz details
POST   /admin/quizzes            # Create new quiz
PUT    /admin/quizzes/:id        # Update quiz
DELETE /admin/quizzes/:id        # Delete quiz
PUT    /admin/quizzes/:id/toggle-featured  # Toggle featured status
PUT    /admin/quizzes/:id/toggle-active    # Toggle active status
GET    /admin/quizzes/stats/overview       # Get quiz statistics
```

## Files Added/Modified

### Backend
- `server-admin-panel/models/mysql/Quiz.js` - Quiz database model
- `server-admin-panel/controllers/quizController.js` - Quiz business logic
- `server-admin-panel/routes/quizzes.js` - Public quiz API routes
- `server-admin-panel/routes/admin.js` - Admin quiz routes (added)
- `server-admin-panel/schema/quiz_tables.sql` - Database schema
- `server-admin-panel/server.js` - Registered quiz routes

### Frontend (Admin Panel)
- `server-admin-panel/public/index.html` - Added quiz management UI
  - Quiz listing page
  - Quiz creation modal with question builder
  - Quiz edit functionality
  - Search and filtering
  - Toggle controls for featured/active status

## Usage

### Creating a Quiz (Admin)

1. Navigate to the Admin Panel
2. Log in with admin credentials
3. Click on "Quizzes" in the sidebar
4. Click "Create Quiz" button
5. Fill in quiz details:
   - Title and description
   - Category and difficulty
   - Time limit and passing score
   - Instructions
6. Add questions:
   - Click "Add Question"
   - Enter question text
   - Select question type
   - Set points
   - Add answers and mark correct ones
   - Optionally add explanation
7. Add more questions as needed
8. Click "Create Quiz"

### Taking a Quiz (User)

Make a POST request to `/api/quizzes/:id/submit` with:
```json
{
  "answers": {
    "questionId1": "answerId1",
    "questionId2": "answerId2",
    ...
  }
}
```

Response includes:
- Score percentage
- Pass/fail status
- Correct answers count
- Points earned
- Detailed answer breakdown

## Example Quiz Structure

```javascript
{
  "id": 1,
  "title": "JavaScript Basics Quiz",
  "description": "Test your knowledge of JavaScript fundamentals",
  "category": "education",
  "difficulty": "medium",
  "timeLimit": 600, // 10 minutes
  "passingScore": 70,
  "questions": [
    {
      "id": 1,
      "questionText": "What is the output of typeof null?",
      "questionType": "multiple_choice",
      "points": 1,
      "answers": [
        { "id": 1, "answerText": "object", "isCorrect": true },
        { "id": 2, "answerText": "null", "isCorrect": false },
        { "id": 3, "answerText": "undefined", "isCorrect": false }
      ]
    }
  ]
}
```

## Scoring System

- Each question has a configurable point value
- User's score is calculated as: `(earned points / total points) * 100`
- Pass/fail is determined by comparing score to passing score threshold
- Detailed results show:
  - Which questions were answered correctly
  - What the correct answers were
  - Explanations for correct answers

## Analytics

The system tracks:
- Total quiz attempts
- Average scores across all attempts
- Individual user attempt history
- Trending quizzes (by attempt count)
- Recommended quizzes (by average score)

## Future Enhancements

Potential improvements:
1. Mobile app integration with quiz player UI
2. Quiz categories and tags for better organization
3. Question bank for reusing questions across quizzes
4. Randomize question and answer order
5. Timer functionality in the UI
6. Leaderboards and achievements
7. Export quiz results to CSV
8. Quiz templates
9. Bulk question import
10. Rich text editor for questions and explanations

## Support

For issues or questions about the quiz generator:
1. Check the API documentation
2. Review the database schema
3. Examine example quiz structure
4. Test with the admin panel UI

## License

This feature is part of the TikTok Games platform.

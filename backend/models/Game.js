const mongoose = require('mongoose');

const gameSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Game title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Game description is required'],
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  thumbnail: {
    type: String,
    required: [true, 'Thumbnail URL is required']
  },
  gameUrl: {
    type: String,
    required: [true, 'Game URL is required']
  },
  category: {
    type: String,
    enum: ['action', 'puzzle', 'adventure', 'strategy', 'casual', 'arcade', 'racing', 'sports', 'other'],
    default: 'casual'
  },
  tags: [{
    type: String,
    trim: true
  }],
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'medium'
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  stats: {
    views: {
      type: Number,
      default: 0
    },
    plays: {
      type: Number,
      default: 0
    },
    likes: {
      type: Number,
      default: 0
    },
    shares: {
      type: Number,
      default: 0
    },
    averagePlayTime: {
      type: Number,
      default: 0
    }
  },
  likedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  ratings: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  averageRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  version: {
    type: String,
    default: '1.0.0'
  },
  fileSize: {
    type: Number, // in bytes
    default: 0
  },
  controls: {
    type: String,
    maxlength: [300, 'Controls description cannot exceed 300 characters']
  },
  requirements: {
    type: String,
    maxlength: [200, 'Requirements cannot exceed 200 characters']
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
gameSchema.index({ title: 'text', description: 'text' }); // Text search
gameSchema.index({ category: 1 });
gameSchema.index({ 'stats.plays': -1 }); // Sort by popularity
gameSchema.index({ 'stats.likes': -1 });
gameSchema.index({ averageRating: -1 });
gameSchema.index({ createdAt: -1 });
gameSchema.index({ isFeatured: -1, 'stats.plays': -1 }); // Featured games

// Virtual for total ratings count
gameSchema.virtual('totalRatings').get(function() {
  return this.ratings.length;
});

// Method to update average rating
gameSchema.methods.updateAverageRating = function() {
  if (this.ratings.length === 0) {
    this.averageRating = 0;
    return;
  }

  const sum = this.ratings.reduce((acc, rating) => acc + rating.rating, 0);
  this.averageRating = (sum / this.ratings.length).toFixed(2);
};

// Method to increment view count
gameSchema.methods.incrementViews = async function() {
  this.stats.views += 1;
  await this.save();
};

// Method to increment play count
gameSchema.methods.incrementPlays = async function() {
  this.stats.plays += 1;
  await this.save();
};

// Pre-save hook to ensure averageRating is calculated
gameSchema.pre('save', function(next) {
  if (this.isModified('ratings')) {
    this.updateAverageRating();
  }
  next();
});

// Static method to get trending games
gameSchema.statics.getTrending = function(limit = 10) {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  return this.find({
    isActive: true,
    createdAt: { $gte: oneDayAgo }
  })
  .sort({ 'stats.plays': -1, 'stats.likes': -1 })
  .limit(limit)
  .populate('creator', 'username avatar');
};

// Static method to get recommended games
gameSchema.statics.getRecommended = function(limit = 10) {
  return this.find({ isActive: true })
    .sort({ averageRating: -1, 'stats.plays': -1 })
    .limit(limit)
    .populate('creator', 'username avatar');
};

const Game = mongoose.model('Game', gameSchema);

module.exports = Game;

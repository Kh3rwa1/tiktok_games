/**
 * Seed Script for Adding Sample Games
 *
 * This script adds sample games to your database for testing.
 *
 * Usage:
 *   1. Make sure MongoDB is running
 *   2. Update .env with your configuration
 *   3. Run: node scripts/seedGames.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Game = require('../models/Game');
const User = require('../models/User');

// Sample games data
const sampleGames = [
  {
    title: "Super Clicker",
    description: "The ultimate clicking game! Click to earn points and upgrade your clicking power.",
    thumbnail: "https://via.placeholder.com/300x400/667eea/ffffff?text=Super+Clicker",
    gameUrl: "https://your-s3-bucket.s3.amazonaws.com/games/clicker/index.html",
    category: "casual",
    tags: ["clicker", "idle", "casual"],
    difficulty: "easy",
    controls: "Tap the screen to play",
    requirements: "None"
  },
  {
    title: "Space Shooter",
    description: "Defend Earth from alien invaders! Shoot enemies and collect power-ups.",
    thumbnail: "https://via.placeholder.com/300x400/764ba2/ffffff?text=Space+Shooter",
    gameUrl: "https://example.com/games/space-shooter",
    category: "action",
    tags: ["shooting", "space", "arcade"],
    difficulty: "medium",
    controls: "Swipe to move, tap to shoot",
    requirements: "None"
  },
  {
    title: "Puzzle Master",
    description: "Challenge your brain with hundreds of mind-bending puzzles!",
    thumbnail: "https://via.placeholder.com/300x400/f093fb/ffffff?text=Puzzle+Master",
    gameUrl: "https://example.com/games/puzzle-master",
    category: "puzzle",
    tags: ["puzzle", "brain", "logic"],
    difficulty: "hard",
    controls: "Tap and drag pieces",
    requirements: "None"
  },
  {
    title: "Racing Thunder",
    description: "Feel the speed! Race against time on challenging tracks.",
    thumbnail: "https://via.placeholder.com/300x400/f5576c/ffffff?text=Racing+Thunder",
    gameUrl: "https://example.com/games/racing",
    category: "racing",
    tags: ["racing", "cars", "speed"],
    difficulty: "medium",
    controls: "Tilt to steer, tap to accelerate",
    requirements: "Gyroscope recommended"
  },
  {
    title: "Adventure Quest",
    description: "Embark on an epic journey through magical lands and defeat monsters!",
    thumbnail: "https://via.placeholder.com/300x400/4facfe/ffffff?text=Adventure+Quest",
    gameUrl: "https://example.com/games/adventure",
    category: "adventure",
    tags: ["rpg", "adventure", "fantasy"],
    difficulty: "hard",
    controls: "Swipe to move, tap to interact",
    requirements: "None"
  },
  {
    title: "Card Master",
    description: "Classic card game with modern graphics. Can you master all levels?",
    thumbnail: "https://via.placeholder.com/300x400/00f2fe/ffffff?text=Card+Master",
    gameUrl: "https://example.com/games/cards",
    category: "strategy",
    tags: ["cards", "strategy", "solitaire"],
    difficulty: "easy",
    controls: "Tap and drag cards",
    requirements: "None"
  },
  {
    title: "Bubble Pop",
    description: "Pop colorful bubbles and clear the board! Relaxing and addictive.",
    thumbnail: "https://via.placeholder.com/300x400/43e97b/ffffff?text=Bubble+Pop",
    gameUrl: "https://example.com/games/bubble",
    category: "casual",
    tags: ["bubble", "casual", "match"],
    difficulty: "easy",
    controls: "Tap where you want to shoot",
    requirements: "None"
  },
  {
    title: "Platform Runner",
    description: "Jump, run, and dodge obstacles in this endless platformer!",
    thumbnail: "https://via.placeholder.com/300x400/fa709a/ffffff?text=Platform+Runner",
    gameUrl: "https://example.com/games/platform",
    category: "arcade",
    tags: ["platform", "runner", "endless"],
    difficulty: "medium",
    controls: "Tap to jump",
    requirements: "None"
  },
  {
    title: "Memory Challenge",
    description: "Test your memory with increasingly difficult patterns and sequences.",
    thumbnail: "https://via.placeholder.com/300x400/fee140/000000?text=Memory+Challenge",
    gameUrl: "https://example.com/games/memory",
    category: "puzzle",
    tags: ["memory", "brain", "educational"],
    difficulty: "medium",
    controls: "Tap to select",
    requirements: "None"
  },
  {
    title: "Soccer Star",
    description: "Score goals and become a soccer legend! Realistic physics and controls.",
    thumbnail: "https://via.placeholder.com/300x400/30cfd0/ffffff?text=Soccer+Star",
    gameUrl: "https://example.com/games/soccer",
    category: "sports",
    tags: ["soccer", "sports", "multiplayer"],
    difficulty: "medium",
    controls: "Swipe to kick",
    requirements: "None"
  }
];

async function seedGames() {
  try {
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB');

    // Check if admin user exists, if not create one
    let adminUser = await User.findOne({ email: 'admin@tiktokgames.com' });

    if (!adminUser) {
      console.log('Creating admin user...');
      adminUser = await User.create({
        username: 'admin',
        email: 'admin@tiktokgames.com',
        password: 'admin123',
        role: 'admin'
      });
      console.log('✅ Admin user created');
      console.log('   Email: admin@tiktokgames.com');
      console.log('   Password: admin123');
      console.log('   ⚠️  CHANGE THIS PASSWORD IN PRODUCTION!');
    }

    // Clear existing games (optional - comment out if you want to keep existing games)
    // await Game.deleteMany({});
    // console.log('Cleared existing games');

    // Add sample games
    console.log(`\nAdding ${sampleGames.length} sample games...`);

    const gamesWithCreator = sampleGames.map(game => ({
      ...game,
      creator: adminUser._id,
      isFeatured: Math.random() > 0.5, // Randomly feature some games
      stats: {
        views: Math.floor(Math.random() * 10000),
        plays: Math.floor(Math.random() * 5000),
        likes: Math.floor(Math.random() * 1000)
      }
    }));

    const createdGames = await Game.insertMany(gamesWithCreator);

    console.log(`✅ Successfully added ${createdGames.length} games!`);
    console.log('\nSample games:');
    createdGames.forEach((game, index) => {
      console.log(`${index + 1}. ${game.title} (${game.category})`);
    });

    console.log('\n🎉 Seeding completed successfully!');
    console.log('\nYou can now:');
    console.log('1. Start the backend: npm run dev');
    console.log('2. Open the mobile app');
    console.log('3. Login with: admin@tiktokgames.com / admin123');
    console.log('4. Browse the sample games');

  } catch (error) {
    console.error('❌ Error seeding games:', error);
  } finally {
    // Close connection
    await mongoose.connection.close();
    console.log('\nDatabase connection closed');
  }
}

// Run the seed script
seedGames();

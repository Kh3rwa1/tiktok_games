/**
 * Premium Components Usage Examples
 * This file demonstrates how to use the AAA+ quality components
 */

import React, { useState } from 'react';
import { View, StyleSheet, SafeAreaView, ScrollView } from 'react-native';
import {
  PremiumGameCard,
  LoadingSkeleton,
  PremiumButton,
  ErrorBoundary,
} from './index';
import { Game } from '../types';

// Example: Using PremiumGameCard
export const GameCardExample: React.FC = () => {
  const [isLiked, setIsLiked] = useState(false);

  const exampleGame: Game = {
    id: '1',
    title: 'Space Adventure',
    description: 'An exciting space exploration game',
    thumbnail: 'https://example.com/game-thumbnail.jpg',
    gameUrl: 'https://example.com/game',
    category: 'adventure',
    tags: ['space', 'adventure', 'multiplayer'],
    difficulty: 'medium',
    creatorId: 'creator1',
    creator: {
      username: 'GameDev123',
      avatar: 'https://example.com/avatar.jpg',
    },
    stats: {
      views: 125000,
      plays: 85000,
      likes: 12500,
      shares: 3400,
      averagePlayTime: 1800,
    },
    likedBy: [],
    ratings: [],
    averageRating: 4.7,
    isActive: true,
    isFeatured: true,
    version: '1.0.0',
    fileSize: 25600000,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const handleGamePress = (game: Game) => {
    console.log('Game pressed:', game.title);
    // Navigate to game player
  };

  const handleLike = (gameId: string) => {
    setIsLiked(!isLiked);
    console.log('Like toggled for game:', gameId);
  };

  return (
    <View style={styles.container}>
      <PremiumGameCard
        game={exampleGame}
        onPress={handleGamePress}
        onLike={handleLike}
        isLiked={isLiked}
        showLikeButton={true}
        showStats={true}
      />
    </View>
  );
};

// Example: Using LoadingSkeleton
export const LoadingSkeletonExample: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);

  // Simulate data loading
  React.useEffect(() => {
    setTimeout(() => setIsLoading(false), 3000);
  }, []);

  return (
    <ScrollView style={styles.container}>
      {/* Card Skeleton */}
      <LoadingSkeleton variant="card" count={2} isLoading={isLoading}>
        <View style={styles.content}>
          {/* Your actual content here */}
        </View>
      </LoadingSkeleton>

      {/* List Skeleton */}
      <LoadingSkeleton variant="list" count={3} isLoading={isLoading}>
        <View style={styles.content}>
          {/* Your actual list items here */}
        </View>
      </LoadingSkeleton>

      {/* Profile Skeleton */}
      <LoadingSkeleton variant="profile" isLoading={isLoading}>
        <View style={styles.content}>
          {/* Your actual profile content here */}
        </View>
      </LoadingSkeleton>

      {/* Grid Skeleton */}
      <LoadingSkeleton variant="grid" count={2} isLoading={isLoading}>
        <View style={styles.content}>
          {/* Your actual grid items here */}
        </View>
      </LoadingSkeleton>
    </ScrollView>
  );
};

// Example: Using PremiumButton
export const PremiumButtonExample: React.FC = () => {
  const [loading, setLoading] = useState(false);

  const handlePress = () => {
    console.log('Button pressed!');
    setLoading(true);
    setTimeout(() => setLoading(false), 2000);
  };

  return (
    <View style={styles.container}>
      {/* Primary Button */}
      <PremiumButton
        title="Play Game"
        onPress={handlePress}
        variant="primary"
        size="large"
        icon="play"
        iconPosition="left"
        fullWidth
      />

      {/* Secondary Button */}
      <PremiumButton
        title="Share"
        onPress={() => console.log('Share pressed')}
        variant="secondary"
        size="medium"
        icon="share-social"
        iconPosition="left"
      />

      {/* Outline Button */}
      <PremiumButton
        title="More Info"
        onPress={() => console.log('More info pressed')}
        variant="outline"
        size="medium"
        icon="information-circle"
        iconPosition="right"
      />

      {/* Loading State */}
      <PremiumButton
        title="Loading..."
        onPress={() => {}}
        variant="primary"
        size="medium"
        loading={loading}
      />

      {/* Disabled Button */}
      <PremiumButton
        title="Unavailable"
        onPress={() => {}}
        variant="primary"
        size="medium"
        disabled={true}
      />

      {/* Danger Button */}
      <PremiumButton
        title="Delete"
        onPress={() => console.log('Delete pressed')}
        variant="danger"
        size="small"
        icon="trash"
        iconPosition="left"
      />
    </View>
  );
};

// Example: Using ErrorBoundary
export const ErrorBoundaryExample: React.FC = () => {
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        // Log to error reporting service
        console.error('Error caught:', error, errorInfo);
      }}
      onReset={() => {
        // Reset application state
        console.log('Error boundary reset');
      }}
    >
      <SafeAreaView style={styles.container}>
        <ScrollView>
          {/* Your app components here */}
          {/* If any component throws an error, ErrorBoundary will catch it */}
          <GameCardExample />
          <PremiumButtonExample />
        </ScrollView>
      </SafeAreaView>
    </ErrorBoundary>
  );
};

// Example: Complete App Structure
export const CompleteAppExample: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [games, setGames] = useState<Game[]>([]);

  React.useEffect(() => {
    // Simulate fetching games
    setTimeout(() => {
      setGames([
        // Your games data
      ]);
      setIsLoading(false);
    }, 2000);
  }, []);

  return (
    <ErrorBoundary>
      <SafeAreaView style={styles.container}>
        <LoadingSkeleton variant="card" count={3} isLoading={isLoading}>
          <ScrollView>
            {games.map((game) => (
              <PremiumGameCard
                key={game.id}
                game={game}
                onPress={(game) => console.log('Navigate to:', game.title)}
                onLike={(gameId) => console.log('Like:', gameId)}
                showLikeButton
                showStats
              />
            ))}

            <PremiumButton
              title="Load More"
              onPress={() => console.log('Load more games')}
              variant="primary"
              size="large"
              icon="arrow-down"
              iconPosition="right"
              fullWidth
            />
          </ScrollView>
        </LoadingSkeleton>
      </SafeAreaView>
    </ErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
    padding: 16,
  },
  content: {
    padding: 20,
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    marginVertical: 8,
  },
});

/**
 * HAPTICS USAGE EXAMPLES
 */

// Import haptics
import { triggerLight, triggerMedium, triggerHeavy, triggerSuccess, triggerError } from '../utils/haptics';

// Example: Button press
const handleButtonPress = async () => {
  await triggerMedium();
  // Perform action
};

// Example: Success action
const handleSuccessAction = async () => {
  await triggerSuccess();
  // Show success message
};

// Example: Error action
const handleErrorAction = async () => {
  await triggerError();
  // Show error message
};

// Example: Light interaction
const handleLightInteraction = async () => {
  await triggerLight();
  // Handle light interaction
};

// Example: Heavy impact
const handleHeavyImpact = async () => {
  await triggerHeavy();
  // Handle heavy impact action
};

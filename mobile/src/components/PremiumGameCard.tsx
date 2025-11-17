import React, { useCallback, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolate,
  Extrapolate,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import FastImage from 'react-native-fast-image';
import { Ionicons } from '@expo/vector-icons';
import { Game } from '../types';
import { triggerMedium, triggerSuccessPattern } from '../utils/haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 32;
const CARD_HEIGHT = 240;

export interface PremiumGameCardProps {
  game: Game;
  onPress: (game: Game) => void;
  onLike?: (gameId: string) => void;
  isLiked?: boolean;
  showLikeButton?: boolean;
  showStats?: boolean;
  style?: any;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);
const AnimatedFastImage = Animated.createAnimatedComponent(FastImage);

export const PremiumGameCard: React.FC<PremiumGameCardProps> = ({
  game,
  onPress,
  onLike,
  isLiked = false,
  showLikeButton = true,
  showStats = true,
  style,
}) => {
  // Animation values
  const scale = useSharedValue(1);
  const heartScale = useSharedValue(1);
  const heartOpacity = useSharedValue(isLiked ? 1 : 0.7);
  const imageScale = useSharedValue(1);

  // Animated styles
  const cardAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const heartAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
    opacity: heartOpacity.value,
  }));

  const imageAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: imageScale.value }],
  }));

  // Handlers
  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.97, {
      damping: 15,
      stiffness: 150,
    });
    imageScale.value = withTiming(1.05, { duration: 200 });
    triggerMedium();
  }, []);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, {
      damping: 15,
      stiffness: 150,
    });
    imageScale.value = withTiming(1, { duration: 200 });
  }, []);

  const handlePress = useCallback(() => {
    onPress(game);
  }, [game, onPress]);

  const handleLikePress = useCallback(() => {
    if (!onLike) return;

    // Animate heart
    heartScale.value = withSpring(1.3, {
      damping: 10,
      stiffness: 200,
    }, () => {
      heartScale.value = withSpring(1, {
        damping: 10,
        stiffness: 200,
      });
    });

    // Toggle opacity
    heartOpacity.value = withTiming(isLiked ? 0.7 : 1, { duration: 200 });

    triggerSuccessPattern();
    onLike(game.id);
  }, [game.id, onLike, isLiked]);

  // Format numbers
  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`;
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
  };

  // Get difficulty color
  const getDifficultyColor = useMemo(() => {
    switch (game.difficulty) {
      case 'easy':
        return '#4CAF50';
      case 'medium':
        return '#FF9800';
      case 'hard':
        return '#F44336';
      default:
        return '#999';
    }
  }, [game.difficulty]);

  return (
    <AnimatedTouchable
      activeOpacity={1}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      style={[styles.container, cardAnimatedStyle, style]}
    >
      <View style={styles.card}>
        {/* Image Container with Gradient Overlay */}
        <View style={styles.imageContainer}>
          <AnimatedFastImage
            source={{
              uri: game.thumbnail,
              priority: FastImage.priority.high,
              cache: FastImage.cacheControl.immutable,
            }}
            style={[styles.image, imageAnimatedStyle]}
            resizeMode={FastImage.resizeMode.cover}
          />

          {/* Gradient Overlay */}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.8)']}
            style={styles.gradientOverlay}
          />

          {/* Featured Badge */}
          {game.isFeatured && (
            <View style={styles.featuredBadge}>
              <LinearGradient
                colors={['#FFD700', '#FFA500']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.featuredGradient}
              >
                <Ionicons name="star" size={12} color="#FFF" />
                <Text style={styles.featuredText}>FEATURED</Text>
              </LinearGradient>
            </View>
          )}

          {/* Difficulty Badge */}
          <View style={[styles.difficultyBadge, { backgroundColor: getDifficultyColor }]}>
            <Text style={styles.difficultyText}>
              {game.difficulty.toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Glassmorphism Info Container */}
        <BlurView intensity={80} tint="dark" style={styles.infoContainer}>
          <View style={styles.infoContent}>
            {/* Title and Creator */}
            <View style={styles.titleContainer}>
              <Text style={styles.title} numberOfLines={1}>
                {game.title}
              </Text>
              {game.creator && (
                <Text style={styles.creator} numberOfLines={1}>
                  by {game.creator.username}
                </Text>
              )}
            </View>

            {/* Stats and Actions */}
            <View style={styles.bottomRow}>
              {/* Stats */}
              {showStats && (
                <View style={styles.statsContainer}>
                  {/* Views */}
                  <View style={styles.statItem}>
                    <Ionicons name="eye-outline" size={14} color="#999" />
                    <Text style={styles.statText}>
                      {formatNumber(game.stats.views)}
                    </Text>
                  </View>

                  {/* Likes */}
                  <View style={styles.statItem}>
                    <Ionicons name="heart-outline" size={14} color="#999" />
                    <Text style={styles.statText}>
                      {formatNumber(game.stats.likes)}
                    </Text>
                  </View>

                  {/* Rating */}
                  <View style={styles.statItem}>
                    <Ionicons name="star" size={14} color="#FFD700" />
                    <Text style={styles.statText}>
                      {game.averageRating.toFixed(1)}
                    </Text>
                  </View>
                </View>
              )}

              {/* Like Button */}
              {showLikeButton && (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={handleLikePress}
                  style={styles.likeButton}
                >
                  <Animated.View style={heartAnimatedStyle}>
                    <Ionicons
                      name={isLiked ? 'heart' : 'heart-outline'}
                      size={24}
                      color={isLiked ? '#FF3B5C' : '#FFF'}
                    />
                  </Animated.View>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </BlurView>

        {/* Shadow Overlay for Premium Look */}
        <View style={styles.shadowOverlay} />
      </View>
    </AnimatedTouchable>
  );
};

const styles = StyleSheet.create({
  container: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    marginVertical: 8,
  },
  card: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#1A1A1A',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.44,
        shadowRadius: 10.32,
      },
      android: {
        elevation: 16,
      },
    }),
  },
  imageContainer: {
    flex: 1,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  gradientOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '60%',
  },
  featuredBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  featuredGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 4,
  },
  featuredText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  difficultyBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  difficultyText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  infoContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  infoContent: {
    padding: 16,
  },
  titleContainer: {
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  creator: {
    fontSize: 13,
    color: '#999',
    fontWeight: '500',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 12,
    color: '#999',
    fontWeight: '600',
  },
  likeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  shadowOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
});

export default PremiumGameCard;

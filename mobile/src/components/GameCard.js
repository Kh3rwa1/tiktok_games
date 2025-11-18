/**
 * AAA+ Premium Game Card Component
 * Ultra-smooth animations with physics-based interactions
 * TikTok-style full-screen game card with micro-interactions
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withDelay,
  withRepeat,
  interpolate,
  Extrapolate,
  runOnJS,
  FadeIn,
  FadeInDown,
  FadeInUp,
  FadeInRight,
  ZoomIn,
  SlideInRight,
} from 'react-native-reanimated';

import { triggerLight, triggerMedium, triggerSuccess, doubleTap } from '../utils/haptics';
import { SPRING_CONFIGS } from '../utils/animations';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export default function GameCard({ game, onPlay, onLike, index = 0 }) {
  const [avatarError, setAvatarError] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [showDoubleTapHeart, setShowDoubleTapHeart] = useState(false);

  // Animation values
  const cardScale = useSharedValue(1);
  const likeScale = useSharedValue(1);
  const shareScale = useSharedValue(1);
  const playScale = useSharedValue(1);
  const ratingScale = useSharedValue(1);
  const playButtonScale = useSharedValue(1);
  const heartScale = useSharedValue(0);
  const heartOpacity = useSharedValue(0);
  const glowOpacity = useSharedValue(0);
  const thumbnailScale = useSharedValue(1.05);
  const contentTranslateY = useSharedValue(50);
  const sidebarTranslateX = useSharedValue(50);

  // Entrance animations
  useEffect(() => {
    // Animate content in
    contentTranslateY.value = withDelay(
      index * 100,
      withSpring(0, SPRING_CONFIGS.gentle)
    );
    sidebarTranslateX.value = withDelay(
      index * 100 + 200,
      withSpring(0, SPRING_CONFIGS.gentle)
    );
    // Subtle zoom on thumbnail
    thumbnailScale.value = withDelay(
      100,
      withTiming(1, { duration: 800 })
    );
    // Glow pulse effect
    glowOpacity.value = withDelay(
      500,
      withRepeat(
        withSequence(
          withTiming(0.6, { duration: 1500 }),
          withTiming(0.2, { duration: 1500 })
        ),
        -1,
        true
      )
    );
  }, []);

  const formatNumber = (num) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num?.toString() || '0';
  };

  // Double tap to like
  const lastTap = React.useRef(0);
  const handleDoubleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      // Double tap detected
      doubleTap();
      setIsLiked(true);
      setShowDoubleTapHeart(true);

      // Animate heart
      heartScale.value = 0;
      heartOpacity.value = 1;
      heartScale.value = withSequence(
        withSpring(1.3, SPRING_CONFIGS.bouncy),
        withSpring(1, SPRING_CONFIGS.gentle),
        withDelay(500, withTiming(0, { duration: 300 }))
      );
      heartOpacity.value = withDelay(700, withTiming(0, { duration: 300 }));

      // Like the game
      if (onLike) {
        onLike(game._id || game.id);
      }

      setTimeout(() => setShowDoubleTapHeart(false), 1000);
    }
    lastTap.current = now;
  }, [game, onLike]);

  // Action button press animations
  const animateActionButton = (scaleValue) => {
    scaleValue.value = withSequence(
      withSpring(0.7, SPRING_CONFIGS.stiff),
      withSpring(1.2, SPRING_CONFIGS.bouncy),
      withSpring(1, SPRING_CONFIGS.gentle)
    );
  };

  const handleLike = useCallback(() => {
    triggerMedium();
    animateActionButton(likeScale);
    setIsLiked(!isLiked);
    if (onLike) {
      onLike(game._id || game.id);
    }
  }, [game, onLike, isLiked]);

  const handlePlay = useCallback(() => {
    triggerMedium();
    playButtonScale.value = withSequence(
      withSpring(0.9, SPRING_CONFIGS.stiff),
      withSpring(1.05, SPRING_CONFIGS.bouncy),
      withSpring(1, SPRING_CONFIGS.gentle)
    );
    if (onPlay) {
      onPlay(game);
    }
  }, [game, onPlay]);

  const handleShare = useCallback(() => {
    triggerLight();
    animateActionButton(shareScale);
    // Share logic here
  }, []);

  // Animated styles
  const thumbnailAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: thumbnailScale.value }],
  }));

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: contentTranslateY.value }],
  }));

  const sidebarAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: sidebarTranslateX.value }],
  }));

  const likeButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: likeScale.value }],
  }));

  const shareButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: shareScale.value }],
  }));

  const playButtonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: playButtonScale.value }],
  }));

  const heartAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
    opacity: heartOpacity.value,
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={handleDoubleTap}
      style={styles.container}
    >
      {/* Thumbnail with parallax zoom */}
      <Animated.View style={[styles.thumbnailContainer, thumbnailAnimatedStyle]}>
        <Image
          source={{ uri: game.thumbnail }}
          style={styles.thumbnail}
          resizeMode="cover"
        />
      </Animated.View>

      {/* Gradient overlay */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.85)', 'rgba(0,0,0,0.98)']}
        locations={[0, 0.3, 0.7, 1]}
        style={styles.gradient}
      />

      {/* Glow effect at bottom */}
      <Animated.View style={[styles.glowEffect, glowStyle]}>
        <LinearGradient
          colors={['transparent', 'rgba(255, 0, 80, 0.3)', 'transparent']}
          style={styles.glowGradient}
        />
      </Animated.View>

      {/* Double tap heart */}
      {showDoubleTapHeart && (
        <Animated.View style={[styles.doubleTapHeart, heartAnimatedStyle]}>
          <Ionicons name="heart" size={100} color="#FF0050" />
        </Animated.View>
      )}

      <View style={styles.content}>
        {/* Main Content */}
        <Animated.View style={[styles.mainContent, contentAnimatedStyle]}>
          {/* Title with gradient text effect */}
          <Animated.Text
            style={styles.title}
            entering={FadeInDown.delay(200).springify()}
          >
            {game.title}
          </Animated.Text>

          <Animated.Text
            style={styles.description}
            numberOfLines={2}
            entering={FadeInDown.delay(300).springify()}
          >
            {game.description}
          </Animated.Text>

          {/* Creator info with animated avatar */}
          <Animated.View
            style={styles.creatorContainer}
            entering={FadeInDown.delay(400).springify()}
          >
            {game.creator?.avatar && !avatarError ? (
              <Animated.Image
                source={{ uri: game.creator?.avatar }}
                style={styles.avatar}
                onError={() => setAvatarError(true)}
                entering={ZoomIn.delay(500).springify()}
              />
            ) : (
              <Animated.View
                style={[styles.avatar, styles.avatarFallback]}
                entering={ZoomIn.delay(500).springify()}
              >
                <Ionicons name="person" size={16} color="#FF0050" />
              </Animated.View>
            )}
            <Text style={styles.creatorName}>@{game.creator?.username || 'unknown'}</Text>

            {/* Verified badge */}
            {game.creator?.verified && (
              <Animated.View entering={ZoomIn.delay(600).springify()}>
                <Ionicons name="checkmark-circle" size={16} color="#00D4FF" style={styles.verifiedBadge} />
              </Animated.View>
            )}
          </Animated.View>

          {/* Tags with staggered animation */}
          <Animated.View
            style={styles.tagsContainer}
            entering={FadeInDown.delay(500).springify()}
          >
            <Animated.View
              style={styles.categoryBadge}
              entering={FadeInRight.delay(600).springify()}
            >
              <Text style={styles.categoryText}>{game.category}</Text>
            </Animated.View>
            {game.difficulty && (
              <Animated.View
                style={[styles.difficultyBadge, styles[`difficulty_${game.difficulty}`]]}
                entering={FadeInRight.delay(700).springify()}
              >
                <Text style={styles.difficultyText}>{game.difficulty}</Text>
              </Animated.View>
            )}
          </Animated.View>

          {/* Play button with premium animation */}
          <AnimatedTouchable
            style={[styles.playButton, playButtonStyle]}
            onPress={handlePlay}
            activeOpacity={0.9}
            entering={FadeInUp.delay(600).springify()}
          >
            <LinearGradient
              colors={['#FF0050', '#FF4500', '#FF0050']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.playButtonGradient}
            >
              <Ionicons name="play" size={24} color="#fff" />
              <Text style={styles.playButtonText}>Play Now</Text>
            </LinearGradient>
          </AnimatedTouchable>
        </Animated.View>

        {/* Sidebar actions */}
        <Animated.View style={[styles.sidebar, sidebarAnimatedStyle]}>
          {/* Like button */}
          <AnimatedTouchable
            style={[styles.actionButton, likeButtonStyle]}
            onPress={handleLike}
            activeOpacity={0.8}
          >
            <Animated.View
              style={styles.actionIconContainer}
              entering={FadeIn.delay(700).springify()}
            >
              <Ionicons
                name={isLiked ? "heart" : "heart-outline"}
                size={32}
                color={isLiked ? "#FF0050" : "#fff"}
              />
              {isLiked && (
                <Animated.View
                  style={styles.actionGlow}
                  entering={ZoomIn.springify()}
                >
                  <View style={[styles.glowDot, { backgroundColor: '#FF0050' }]} />
                </Animated.View>
              )}
            </Animated.View>
            <Text style={styles.actionText}>
              {formatNumber(game.stats?.likes || 0)}
            </Text>
          </AnimatedTouchable>

          {/* Play count */}
          <Animated.View
            style={styles.actionButton}
            entering={FadeIn.delay(800).springify()}
          >
            <View style={styles.actionIconContainer}>
              <Ionicons name="play-circle" size={32} color="#fff" />
            </View>
            <Text style={styles.actionText}>
              {formatNumber(game.stats?.plays || 0)}
            </Text>
          </Animated.View>

          {/* Rating */}
          <Animated.View
            style={styles.actionButton}
            entering={FadeIn.delay(900).springify()}
          >
            <View style={styles.actionIconContainer}>
              <Ionicons name="star" size={32} color="#FFD700" />
            </View>
            <Text style={styles.actionText}>
              {game.averageRating?.toFixed(1) || '0.0'}
            </Text>
          </Animated.View>

          {/* Share button */}
          <AnimatedTouchable
            style={[styles.actionButton, shareButtonStyle]}
            onPress={handleShare}
            activeOpacity={0.8}
          >
            <Animated.View
              style={styles.actionIconContainer}
              entering={FadeIn.delay(1000).springify()}
            >
              <Ionicons name="share-social" size={32} color="#fff" />
            </Animated.View>
            <Text style={styles.actionText}>Share</Text>
          </AnimatedTouchable>

          {/* More options */}
          <Animated.View
            style={styles.actionButton}
            entering={FadeIn.delay(1100).springify()}
          >
            <TouchableOpacity
              style={styles.actionIconContainer}
              onPress={() => triggerLight()}
              activeOpacity={0.8}
            >
              <Ionicons name="ellipsis-horizontal" size={24} color="#fff" />
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </View>

      {/* Music/Sound indicator */}
      <Animated.View
        style={styles.soundIndicator}
        entering={FadeIn.delay(1200).springify()}
      >
        <Ionicons name="musical-notes" size={14} color="#fff" />
        <Text style={styles.soundText} numberOfLines={1}>
          Original Sound
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: '#000',
  },
  thumbnailContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '60%',
  },
  glowEffect: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 100,
    height: 200,
  },
  glowGradient: {
    flex: 1,
  },
  doubleTapHeart: {
    position: 'absolute',
    top: '40%',
    left: '50%',
    marginLeft: -50,
    marginTop: -50,
    zIndex: 100,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  mainContent: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 20,
    paddingBottom: 100,
  },
  title: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '800',
    marginBottom: 10,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    letterSpacing: 0.5,
  },
  description: {
    color: '#fff',
    fontSize: 15,
    marginBottom: 14,
    opacity: 0.9,
    lineHeight: 22,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  creatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
    borderWidth: 2,
    borderColor: '#FF0050',
  },
  avatarFallback: {
    backgroundColor: 'rgba(255, 0, 80, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  creatorName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  verifiedBadge: {
    marginLeft: 6,
  },
  tagsContainer: {
    flexDirection: 'row',
    marginBottom: 18,
    gap: 8,
  },
  categoryBadge: {
    backgroundColor: 'rgba(255, 0, 80, 0.25)',
    borderWidth: 1.5,
    borderColor: '#FF0050',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  categoryText: {
    color: '#FF0050',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  difficultyBadge: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  difficulty_easy: {
    backgroundColor: 'rgba(76, 175, 80, 0.25)',
    borderColor: '#4CAF50',
  },
  difficulty_medium: {
    backgroundColor: 'rgba(255, 152, 0, 0.25)',
    borderColor: '#FF9800',
  },
  difficulty_hard: {
    backgroundColor: 'rgba(244, 67, 54, 0.25)',
    borderColor: '#F44336',
  },
  difficultyText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  playButton: {
    alignSelf: 'flex-start',
    shadowColor: '#FF0050',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  playButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 36,
    borderRadius: 30,
    gap: 10,
  },
  playButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  sidebar: {
    justifyContent: 'flex-end',
    paddingRight: 12,
    paddingBottom: 100,
    gap: 20,
  },
  actionButton: {
    alignItems: 'center',
  },
  actionIconContainer: {
    position: 'relative',
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionGlow: {
    position: 'absolute',
    bottom: -4,
  },
  glowDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  actionText: {
    color: '#fff',
    fontSize: 13,
    marginTop: 4,
    fontWeight: '700',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  soundIndicator: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 80,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  soundText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
});

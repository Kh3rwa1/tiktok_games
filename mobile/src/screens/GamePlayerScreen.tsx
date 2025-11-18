/**
 * Premium Game Player Screen
 * AAA+ Quality TypeScript Implementation
 * Features: WebView Player, Controls Overlay, Play Tracking, Share, Animated UI
 */

import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Share,
  Dimensions,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  FadeIn,
  FadeOut,
  SlideInUp,
  SlideOutDown,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { RouteProp } from '@react-navigation/native';

// Stores & Types
import { useGameStore } from '../store/gameStore';
import { useAuthStore } from '../store/authStore';
import { RootStackParamList, Game } from '../types';

// Utils
import {
  triggerMedium,
  triggerSuccess,
  triggerDoubleTap,
} from '../utils/haptics';

const { width, height } = Dimensions.get('window');

type GamePlayerScreenNavigationProp = StackNavigationProp<
  RootStackParamList,
  'GamePlayer'
>;
type GamePlayerScreenRouteProp = RouteProp<RootStackParamList, 'GamePlayer'>;

interface Props {
  navigation: GamePlayerScreenNavigationProp;
  route: GamePlayerScreenRouteProp;
}

export default function GamePlayerScreen({ navigation, route }: Props) {
  const { game } = route.params;
  const { user } = useAuthStore();
  const { toggleLike, rateGame, recordPlay } = useGameStore();

  const [isLoading, setIsLoading] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [currentRating, setCurrentRating] = useState(0);
  const [playStartTime, setPlayStartTime] = useState<number>(Date.now());
  const [showRating, setShowRating] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const webViewRef = useRef<WebView>(null);
  const hideControlsTimeout = useRef<NodeJS.Timeout | null>(null);
  const loadingTimeout = useRef<NodeJS.Timeout | null>(null);

  // Animation values
  const controlsOpacity = useSharedValue(1);
  const likeScale = useSharedValue(1);

  useEffect(() => {
    // Check if user has liked this game
    if (user && game.likedBy) {
      setIsLiked(game.likedBy.includes(user.uid));
    }

    // Get user's rating if exists
    if (user && game.ratings) {
      const userRating = game.ratings.find((r) => r.userId === user.uid);
      if (userRating) {
        setCurrentRating(userRating.rating);
      }
    }

    const startTime = Date.now();
    setPlayStartTime(startTime);

    // Set loading timeout (10 seconds max - reduced from 15 for better UX)
    loadingTimeout.current = setTimeout(() => {
      if (isLoading) {
        setIsLoading(false);
        setLoadError(true);
        Toast.show({
          type: 'error',
          text1: 'Loading Timeout',
          text2: 'Game is taking too long to load. Try refreshing.',
          position: 'top',
          visibilityTime: 4000,
        });
      }
    }, 10000);

    return () => {
      // Clean up timeouts
      if (hideControlsTimeout.current) {
        clearTimeout(hideControlsTimeout.current);
        hideControlsTimeout.current = null;
      }

      if (loadingTimeout.current) {
        clearTimeout(loadingTimeout.current);
        loadingTimeout.current = null;
      }

      // Clear WebView cache and stop loading to free memory
      if (webViewRef.current) {
        webViewRef.current.stopLoading();
        // Inject script to clear game state and free memory
        webViewRef.current.injectJavaScript(`
          (function() {
            // Clear game canvases
            var canvases = document.querySelectorAll('canvas');
            canvases.forEach(function(canvas) {
              var ctx = canvas.getContext('2d');
              if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
            });
            // Clear audio
            var audios = document.querySelectorAll('audio');
            audios.forEach(function(audio) {
              audio.pause();
              audio.src = '';
            });
            // Clear video
            var videos = document.querySelectorAll('video');
            videos.forEach(function(video) {
              video.pause();
              video.src = '';
            });
            // Clear intervals and timeouts
            var highestId = window.setTimeout(function(){}, 0);
            for (var i = 0; i < highestId; i++) {
              window.clearTimeout(i);
              window.clearInterval(i);
            }
            true;
          })();
        `);
      }

      // Record play time when leaving
      const duration = Math.floor((Date.now() - startTime) / 1000);
      if (duration > 5 && user) {
        // Only record if played for more than 5 seconds
        recordPlay(game.id, duration);
      }
    };
  }, [game.id, user]);

  useEffect(() => {
    if (showControls) {
      controlsOpacity.value = withTiming(1, { duration: 300 });
      resetHideControlsTimer();
    } else {
      controlsOpacity.value = withTiming(0, { duration: 300 });
    }
  }, [showControls]);

  const resetHideControlsTimer = () => {
    if (hideControlsTimeout.current) {
      clearTimeout(hideControlsTimeout.current);
    }
    hideControlsTimeout.current = setTimeout(() => {
      setShowControls(false);
    }, 5000);
  };

  const handleScreenPress = () => {
    setShowControls(!showControls);
    if (!showControls) {
      resetHideControlsTimer();
    }
  };

  const handleClose = () => {
    triggerMedium();
    navigation.goBack();
  };

  const handleLike = async () => {
    if (!user) {
      Toast.show({
        type: 'info',
        text1: 'Login Required',
        text2: 'Please login to like games',
        position: 'top',
        visibilityTime: 3000,
      });
      return;
    }

    try {
      triggerDoubleTap();
      likeScale.value = withSequence(
        withSpring(1.3, { damping: 10 }),
        withSpring(1, { damping: 10 })
      );

      await toggleLike(game.id);
      setIsLiked(!isLiked);

      Toast.show({
        type: 'success',
        text1: isLiked ? 'Removed from favorites' : 'Added to favorites',
        position: 'top',
        visibilityTime: 2000,
      });
    } catch (err) {
      console.error('Error toggling like:', err);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to update favorite status',
        position: 'top',
        visibilityTime: 3000,
      });
    }
  };

  const handleRating = async (rating: number) => {
    if (!user) {
      Toast.show({
        type: 'info',
        text1: 'Login Required',
        text2: 'Please login to rate games',
        position: 'top',
        visibilityTime: 3000,
      });
      return;
    }

    try {
      triggerSuccess();
      await rateGame(game.id, rating);
      setCurrentRating(rating);
      setShowRating(false);

      Toast.show({
        type: 'success',
        text1: 'Rating Submitted',
        text2: `You rated this game ${rating} stars`,
        position: 'top',
        visibilityTime: 2000,
      });
    } catch (err) {
      console.error('Error rating game:', err);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to submit rating',
        position: 'top',
        visibilityTime: 3000,
      });
    }
  };

  const handleShare = async () => {
    triggerMedium();
    try {
      await Share.share({
        message: `Check out ${game.title}! Play it on TikTok Games.`,
        title: game.title,
      });
    } catch (err) {
      console.error('Error sharing:', err);
    }
  };

  const handleRefresh = () => {
    triggerMedium();
    setIsLoading(true);
    webViewRef.current?.reload();
  };

  const controlsStyle = useAnimatedStyle(() => ({
    opacity: controlsOpacity.value,
  }));

  const likeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: likeScale.value }],
  }));

  return (
    <View style={styles.container}>
      <StatusBar hidden />

      {/* WebView Game Player */}
      <TouchableOpacity
        activeOpacity={1}
        onPress={handleScreenPress}
        style={styles.webViewContainer}
      >
        <WebView
          ref={webViewRef}
          source={{
            uri: game.gameUrl,
            headers: {
              'Cache-Control': 'max-age=3600', // Cache for 1 hour
            }
          }}
          style={styles.webView}
          onLoadStart={() => {
            setIsLoading(true);
            setLoadError(false);
          }}
          onLoadEnd={() => {
            setIsLoading(false);
            // Clear loading timeout on successful load
            if (loadingTimeout.current) {
              clearTimeout(loadingTimeout.current);
              loadingTimeout.current = null;
            }
          }}
          onLoadProgress={({ nativeEvent }) => {
            // Update progress for better UX
            if (nativeEvent.progress > 0.8) {
              // Almost loaded, clear timeout early
              if (loadingTimeout.current) {
                clearTimeout(loadingTimeout.current);
                loadingTimeout.current = null;
              }
            }
          }}
          javaScriptEnabled
          domStorageEnabled
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          // Enable caching
          cacheEnabled={true}
          cacheMode="LOAD_DEFAULT"
          // Improve performance
          startInLoadingState={true}
          renderLoading={() => <></>}
          // Fullscreen support for HTML5 games
          allowsFullscreenVideo
          allowsBackForwardNavigationGestures={false}
          bounces={false}
          scrollEnabled={false}
          // Scale to fit viewport properly on both platforms
          scalesPageToFit={true}
          // Android specific settings
          mixedContentMode="compatibility"
          overScrollMode="never"
          setSupportMultipleWindows={false}
          // iOS specific settings
          allowsLinkPreview={false}
          // Inject JavaScript to ensure proper viewport and fullscreen handling
          injectedJavaScript={`
            (function() {
              // Set viewport meta tag for proper scaling
              var viewport = document.querySelector('meta[name="viewport"]');
              if (!viewport) {
                viewport = document.createElement('meta');
                viewport.name = 'viewport';
                document.head.appendChild(viewport);
              }
              viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';

              // Prevent default touch behaviors that might interfere with games
              document.addEventListener('touchmove', function(e) {
                if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                  // Allow touch events but prevent page scroll
                }
              }, { passive: true });

              // Handle fullscreen API
              if (document.documentElement.requestFullscreen) {
                document.documentElement.style.width = '100%';
                document.documentElement.style.height = '100%';
                document.body.style.width = '100%';
                document.body.style.height = '100%';
                document.body.style.margin = '0';
                document.body.style.padding = '0';
                document.body.style.overflow = 'hidden';
              }

              true;
            })();
          `}
          onError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.error('WebView error:', nativeEvent);
            Toast.show({
              type: 'error',
              text1: 'Error Loading Game',
              text2: 'Failed to load the game. Please try again.',
              position: 'top',
              visibilityTime: 3000,
            });
          }}
        />

        {/* Loading Indicator */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FF0050" />
            <Text style={styles.loadingText}>Loading {game.title}...</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Controls Overlay */}
      {showControls && (
        <Animated.View
          style={[styles.controlsContainer, controlsStyle]}
          entering={FadeIn}
          exiting={FadeOut}
        >
          {/* Top Bar */}
          <LinearGradient
            colors={['rgba(0,0,0,0.8)', 'transparent']}
            style={styles.topBar}
          >
            <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
              <Ionicons name="close" size={28} color="#fff" />
            </TouchableOpacity>

            <View style={styles.gameInfo}>
              <Text style={styles.gameTitle} numberOfLines={1}>
                {game.title}
              </Text>
              <View style={styles.gameStats}>
                <Ionicons name="eye" size={14} color="#999" />
                <Text style={styles.statText}>{game.stats.views}</Text>
                <Ionicons
                  name="play"
                  size={14}
                  color="#999"
                  style={styles.statIcon}
                />
                <Text style={styles.statText}>{game.stats.plays}</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
              <Ionicons name="refresh" size={24} color="#fff" />
            </TouchableOpacity>
          </LinearGradient>

          {/* Side Actions */}
          <View style={styles.sideActions}>
            {/* Like Button */}
            <Animated.View style={likeStyle}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleLike}
              >
                <LinearGradient
                  colors={
                    isLiked
                      ? ['#FF0050', '#FF4500']
                      : ['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']
                  }
                  style={styles.actionGradient}
                >
                  <Ionicons
                    name={isLiked ? 'heart' : 'heart-outline'}
                    size={28}
                    color="#fff"
                  />
                </LinearGradient>
                <Text style={styles.actionText}>{game.stats.likes}</Text>
              </TouchableOpacity>
            </Animated.View>

            {/* Rating Button */}
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => setShowRating(!showRating)}
            >
              <LinearGradient
                colors={
                  currentRating > 0
                    ? ['#FFD700', '#FFA500']
                    : ['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']
                }
                style={styles.actionGradient}
              >
                <Ionicons
                  name={currentRating > 0 ? 'star' : 'star-outline'}
                  size={28}
                  color="#fff"
                />
              </LinearGradient>
              <Text style={styles.actionText}>
                {game.averageRating.toFixed(1)}
              </Text>
            </TouchableOpacity>

            {/* Share Button */}
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleShare}
            >
              <LinearGradient
                colors={['rgba(255,255,255,0.2)', 'rgba(255,255,255,0.1)']}
                style={styles.actionGradient}
              >
                <Ionicons name="share-social" size={28} color="#fff" />
              </LinearGradient>
              <Text style={styles.actionText}>{game.stats.shares}</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}

      {/* Rating Modal */}
      {showRating && (
        <Animated.View
          style={styles.ratingModal}
          entering={SlideInUp}
          exiting={SlideOutDown}
        >
          <LinearGradient
            colors={['#1a1a1a', '#0a0a0a']}
            style={styles.ratingContent}
          >
            <Text style={styles.ratingTitle}>Rate this game</Text>
            <View style={styles.starsContainer}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => handleRating(star)}
                  style={styles.starButton}
                >
                  <Ionicons
                    name={star <= currentRating ? 'star' : 'star-outline'}
                    size={40}
                    color={star <= currentRating ? '#FFD700' : '#666'}
                  />
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={styles.closeRatingButton}
              onPress={() => setShowRating(false)}
            >
              <Text style={styles.closeRatingText}>Close</Text>
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  webViewContainer: {
    flex: 1,
  },
  webView: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 16,
  },
  controlsContainer: {
    ...StyleSheet.absoluteFillObject,
    pointerEvents: 'box-none',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  closeButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 22,
  },
  gameInfo: {
    flex: 1,
    marginLeft: 16,
  },
  gameTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  gameStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statIcon: {
    marginLeft: 12,
  },
  statText: {
    color: '#999',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  refreshButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 22,
    marginLeft: 8,
  },
  sideActions: {
    position: 'absolute',
    right: 16,
    bottom: 100,
    gap: 16,
  },
  actionButton: {
    alignItems: 'center',
  },
  actionGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  actionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  ratingModal: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  ratingContent: {
    padding: 32,
    alignItems: 'center',
  },
  ratingTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 24,
  },
  starsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  starButton: {
    padding: 4,
  },
  closeRatingButton: {
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  closeRatingText: {
    color: '#999',
    fontSize: 16,
    fontWeight: '600',
  },
});

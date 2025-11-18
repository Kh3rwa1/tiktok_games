/**
 * Premium Home Screen - AAA+ Quality
 * Smooth 60fps Animations with React Native Reanimated
 * Features: TikTok-style Vertical Swiper, Infinite Scroll, Pull to Refresh
 */

import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withDelay,
  interpolate,
  Extrapolate,
  FadeIn,
  FadeInDown,
  FadeInUp,
  SlideInRight,
  ZoomIn,
  runOnJS,
  useAnimatedScrollHandler,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

// Stores & Types
import { useGameStore } from '../store/gameStore';
import { useNotificationStore } from '../store/notificationStore';
import { RootStackParamList, MainTabParamList, Game } from '../types';

// Components
import { PremiumGameCard, LoadingSkeleton } from '../components';

// Utils
import { triggerHeavy, triggerMedium, triggerLight, triggerSelection, triggerSuccess } from '../utils/haptics';

const { width, height } = Dimensions.get('window');
// Dynamic tab bar height based on platform
const TAB_BAR_HEIGHT = Platform.OS === 'ios' ? 80 : 60;
const STATUS_BAR_HEIGHT = StatusBar.currentHeight || 44;

type HomeScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Home'>,
  NativeStackNavigationProp<RootStackParamList>
>;

interface Props {
  navigation: HomeScreenNavigationProp;
}

// Premium animated game item component
const AnimatedGameItem = React.memo(({
  item,
  index,
  onPress,
  scrollY
}: {
  item: Game;
  index: number;
  onPress: (game: Game) => void;
  scrollY: Animated.SharedValue<number>;
}) => {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const inputRange = [
    (index - 1) * ITEM_HEIGHT,
    index * ITEM_HEIGHT,
    (index + 1) * ITEM_HEIGHT,
  ];

  const animatedStyle = useAnimatedStyle(() => {
    const itemScale = interpolate(
      scrollY.value,
      inputRange,
      [0.9, 1, 0.9],
      Extrapolate.CLAMP
    );

    const itemOpacity = interpolate(
      scrollY.value,
      inputRange,
      [0.5, 1, 0.5],
      Extrapolate.CLAMP
    );

    const translateY = interpolate(
      scrollY.value,
      inputRange,
      [30, 0, -30],
      Extrapolate.CLAMP
    );

    return {
      transform: [
        { scale: itemScale * scale.value },
        { translateY },
      ],
      opacity: itemOpacity * opacity.value,
    };
  });

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.98, { damping: 15, stiffness: 300 });
  }, []);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  }, []);

  return (
    <Animated.View
      style={[styles.gameItemContainer, animatedStyle]}
      entering={FadeInDown.delay(index * 100).springify()}
    >
      <TouchableOpacity
        activeOpacity={0.95}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={() => onPress(item)}
        style={styles.gameCardTouchable}
      >
        <PremiumGameCard
          game={item}
          onPress={onPress}
          showLikeButton
          showStats
          fullScreen
          style={styles.gameCard}
        />
      </TouchableOpacity>
    </Animated.View>
  );
});

export default function HomeScreen({ navigation }: Props) {
  const { feed, isLoading, error, fetchFeed, feedType, setFeedType, hasMoreFeed } = useGameStore();
  const { unreadCount, fetchNotifications } = useNotificationStore();
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const insets = useSafeAreaInsets();

  // Calculate ITEM_HEIGHT dynamically based on safe area
  const ITEM_HEIGHT = height - TAB_BAR_HEIGHT - insets.bottom;

  // Use feed instead of games for TikTok-style experience
  const games = feed;

  // Animation values
  const scrollY = useSharedValue(0);
  const headerOpacity = useSharedValue(1);
  const headerTranslateY = useSharedValue(0);
  const fabScale = useSharedValue(1);
  const fabRotation = useSharedValue(0);

  // Scroll handler for smooth animations
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;

      // Header animation
      const headerProgress = interpolate(
        event.contentOffset.y,
        [0, 100],
        [1, 0],
        Extrapolate.CLAMP
      );
      headerOpacity.value = headerProgress;
      headerTranslateY.value = interpolate(
        event.contentOffset.y,
        [0, 100],
        [0, -50],
        Extrapolate.CLAMP
      );
    },
    onMomentumEnd: (event) => {
      const index = Math.round(event.contentOffset.y / ITEM_HEIGHT);
      runOnJS(setCurrentIndex)(index);
      runOnJS(triggerSelection)();
    },
  });

  useEffect(() => {
    loadInitialFeed();
    fetchNotifications();
  }, []);

  const loadInitialFeed = async () => {
    try {
      await fetchFeed(true);
    } catch (err: any) {
      console.error('Error loading feed:', err);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load games. Pull to refresh.',
        position: 'top',
        visibilityTime: 3000,
      });
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    triggerMedium();

    // Animate FAB
    fabRotation.value = withSequence(
      withTiming(360, { duration: 500 }),
      withTiming(0, { duration: 0 })
    );

    try {
      await fetchFeed(true);

      triggerSuccess();
      Toast.show({
        type: 'success',
        text1: 'Refreshed',
        text2: 'Games updated successfully',
        position: 'top',
        visibilityTime: 2000,
      });
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to refresh games',
        position: 'top',
        visibilityTime: 3000,
      });
    } finally {
      setRefreshing(false);
    }
  };

  const loadMoreGames = async () => {
    if (loadingMore || !hasMoreFeed || isLoading) return;

    setLoadingMore(true);

    try {
      await fetchFeed(false);
    } catch (err) {
      console.error('Error loading more games:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleFeedTypeChange = (type: 'foryou' | 'following') => {
    triggerMedium();
    setFeedType(type);
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  };

  const handleGamePress = useCallback((game: Game) => {
    triggerMedium();
    navigation.navigate('GamePlayer', { game });
  }, [navigation]);

  const scrollToTop = useCallback(() => {
    triggerHeavy();
    fabScale.value = withSequence(
      withSpring(0.8, { damping: 10 }),
      withSpring(1, { damping: 15 })
    );
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, []);

  // Animated styles
  const headerStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
    transform: [{ translateY: headerTranslateY.value }],
  }));

  const fabStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: fabScale.value },
      { rotate: `${fabRotation.value}deg` },
    ],
  }));

  const renderGameItem = useCallback(({ item, index }: { item: Game; index: number }) => (
    <AnimatedGameItem
      item={item}
      index={index}
      onPress={handleGamePress}
      scrollY={scrollY}
    />
  ), [handleGamePress, scrollY]);

  const renderFooter = () => {
    if (!loadingMore) return null;

    return (
      <Animated.View
        style={styles.footerLoader}
        entering={FadeIn.duration(300)}
      >
        <ActivityIndicator size="large" color="#FF0050" />
        <Text style={styles.footerText}>Loading more games...</Text>
      </Animated.View>
    );
  };

  const renderEmpty = () => {
    if (isLoading) {
      return (
        <View style={styles.emptyContainer}>
          <LoadingSkeleton variant="game" count={3} />
        </View>
      );
    }

    return (
      <Animated.View
        style={styles.emptyContainer}
        entering={ZoomIn.springify()}
      >
        <Animated.View entering={FadeInDown.delay(100)}>
          <Ionicons name="game-controller-outline" size={80} color="#333" />
        </Animated.View>
        <Animated.Text
          style={styles.emptyTitle}
          entering={FadeInDown.delay(200)}
        >
          No Games Found
        </Animated.Text>
        <Animated.Text
          style={styles.emptySubtitle}
          entering={FadeInDown.delay(300)}
        >
          Pull down to refresh and discover new games
        </Animated.Text>
        <Animated.View entering={FadeInUp.delay(400).springify()}>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={loadInitialFeed}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#FF0050', '#FF4500']}
              style={styles.retryGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="refresh" size={20} color="#fff" />
              <Text style={styles.retryText}>Retry</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    );
  };

  const keyExtractor = useCallback((item: Game, index: number) => `${item.id}-${index}`, []);

  const getItemLayout = useCallback((data: any, index: number) => ({
    length: ITEM_HEIGHT,
    offset: ITEM_HEIGHT * index,
    index,
  }), []);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />

      {/* Premium Header with Blur */}
      <Animated.View style={[styles.header, headerStyle]}>
        <BlurView intensity={80} style={styles.headerBlur}>
          <LinearGradient
            colors={['rgba(0,0,0,0.9)', 'transparent']}
            style={styles.headerGradient}
          >
            <View style={styles.headerContent}>
              {/* Feed Type Tabs - TikTok Style */}
              <View style={styles.feedTabs}>
                <TouchableOpacity
                  style={[styles.feedTab, feedType === 'following' && styles.feedTabActive]}
                  onPress={() => handleFeedTypeChange('following')}
                >
                  <Text style={[styles.feedTabText, feedType === 'following' && styles.feedTabTextActive]}>
                    Following
                  </Text>
                </TouchableOpacity>
                <View style={styles.feedTabDivider} />
                <TouchableOpacity
                  style={[styles.feedTab, feedType === 'foryou' && styles.feedTabActive]}
                  onPress={() => handleFeedTypeChange('foryou')}
                >
                  <Text style={[styles.feedTabText, feedType === 'foryou' && styles.feedTabTextActive]}>
                    For You
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Notification Bell */}
              <TouchableOpacity
                style={styles.notificationButton}
                onPress={() => {
                  triggerLight();
                  navigation.navigate('Notifications');
                }}
              >
                <Ionicons name="notifications-outline" size={24} color="#fff" />
                {unreadCount > 0 && (
                  <View style={styles.notificationBadge}>
                    <Text style={styles.notificationCount}>
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </BlurView>
      </Animated.View>

      {/* Games List with Premium Animations */}
      <Animated.FlatList
        ref={flatListRef}
        data={games}
        renderItem={renderGameItem}
        keyExtractor={keyExtractor}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToAlignment="start"
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        onEndReached={loadMoreGames}
        onEndReachedThreshold={0.5}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#FF0050"
            colors={['#FF0050']}
            progressBackgroundColor="#1a1a1a"
          />
        }
        getItemLayout={getItemLayout}
        removeClippedSubviews={Platform.OS === 'android'}
        maxToRenderPerBatch={3}
        windowSize={5}
        initialNumToRender={2}
        updateCellsBatchingPeriod={50}
      />

      {/* Floating Action Button */}
      {currentIndex > 0 && (
        <Animated.View
          style={[styles.fab, fabStyle]}
          entering={ZoomIn.springify()}
        >
          <TouchableOpacity
            onPress={scrollToTop}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#FF0050', '#FF4500']}
              style={styles.fabGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Ionicons name="arrow-up" size={24} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Current Game Indicator */}
      <View style={styles.pageIndicator}>
        <LinearGradient
          colors={['rgba(0,0,0,0.8)', 'rgba(0,0,0,0.4)']}
          style={styles.indicatorGradient}
        >
          <Text style={styles.indicatorText}>
            {currentIndex + 1} / {games.length || 1}
          </Text>
        </LinearGradient>
      </View>

      {/* Error Display */}
      {error && (
        <Animated.View
          style={styles.errorContainer}
          entering={FadeInUp.springify()}
        >
          <BlurView intensity={90} style={styles.errorBlur}>
            <Text style={styles.errorText}>{error}</Text>
          </BlurView>
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
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  headerBlur: {
    overflow: 'hidden',
  },
  headerGradient: {
    paddingTop: Platform.OS === 'ios' ? 50 : STATUS_BAR_HEIGHT + 10,
    paddingBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  feedTabs: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  feedTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  feedTabActive: {},
  feedTabText: {
    fontSize: 17,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.5)',
  },
  feedTabTextActive: {
    fontWeight: '700',
    color: '#fff',
  },
  feedTabDivider: {
    width: 1,
    height: 16,
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginHorizontal: 4,
  },
  notificationButton: {
    position: 'relative',
    padding: 8,
  },
  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#FF0050',
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notificationCount: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  gameItemContainer: {
    height: ITEM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  gameCardTouchable: {
    width: '100%',
    height: ITEM_HEIGHT - 40,
  },
  gameCard: {
    width: '100%',
    height: '100%',
  },
  footerLoader: {
    paddingVertical: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 12,
  },
  emptyContainer: {
    flex: 1,
    height: ITEM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    marginTop: 20,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  retryButton: {
    borderRadius: 30,
    overflow: 'hidden',
    shadowColor: '#FF0050',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  retryGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 16,
    gap: 8,
  },
  retryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  fab: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    shadowColor: '#FF0050',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 10,
  },
  fabGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageIndicator: {
    position: 'absolute',
    bottom: 100,
    left: 20,
  },
  indicatorGradient: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  indicatorText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  errorContainer: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  errorBlur: {
    padding: 16,
    backgroundColor: 'rgba(255, 0, 80, 0.8)',
  },
  errorText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});

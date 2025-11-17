/**
 * Premium Home Screen
 * AAA+ Quality TypeScript Implementation
 * Features: TikTok-style Vertical Swiper, Infinite Scroll, Pull to Refresh
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeIn,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

// Stores & Types
import { useGameStore } from '../store/gameStore';
import { RootStackParamList, MainTabParamList, Game } from '../types';

// Components
import { PremiumGameCard, LoadingSkeleton } from '../components';

// Utils
import { triggerMedium, triggerSelection } from '../utils/haptics';

const { width, height } = Dimensions.get('window');
const ITEM_HEIGHT = height - 60; // Subtract tab bar height

type HomeScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<MainTabParamList, 'Home'>,
  NativeStackNavigationProp<RootStackParamList>
>;

interface Props {
  navigation: HomeScreenNavigationProp;
}

export default function HomeScreen({ navigation }: Props) {
  const { games, isLoading, error, fetchGames } = useGameStore();
  const [refreshing, setRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // Animation values
  const headerOpacity = useSharedValue(1);

  useEffect(() => {
    loadInitialGames();
  }, []);

  const loadInitialGames = async () => {
    try {
      await fetchGames({
        page: 1,
        limit: 10,
        sortBy: 'popular',
        order: 'desc',
      });
      setCurrentPage(1);
      setHasMore(true);
    } catch (err: any) {
      console.error('Error loading games:', err);
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

    try {
      await fetchGames({
        page: 1,
        limit: 10,
        sortBy: 'popular',
        order: 'desc',
      });
      setCurrentPage(1);
      setHasMore(true);

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
    if (loadingMore || !hasMore || isLoading) return;

    setLoadingMore(true);
    const nextPage = currentPage + 1;

    try {
      await fetchGames({
        page: nextPage,
        limit: 10,
        sortBy: 'popular',
        order: 'desc',
      });

      // If we get less than the limit, we've reached the end
      if (games.length < nextPage * 10) {
        setHasMore(false);
      }

      setCurrentPage(nextPage);
    } catch (err) {
      console.error('Error loading more games:', err);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleGamePress = useCallback((game: Game) => {
    triggerMedium();
    navigation.navigate('GamePlayer', { game });
  }, [navigation]);

  const handleViewableItemsChanged = useRef(({ viewableItems }: any) => {
    // Trigger haptic feedback when scrolling past items
    if (viewableItems.length > 0) {
      triggerSelection();
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const headerStyle = useAnimatedStyle(() => ({
    opacity: headerOpacity.value,
  }));

  const renderGameItem = ({ item, index }: { item: Game; index: number }) => (
    <View style={styles.gameItemContainer}>
      <PremiumGameCard
        game={item}
        onPress={handleGamePress}
        showLikeButton
        showStats
        style={styles.gameCard}
      />
    </View>
  );

  const renderFooter = () => {
    if (!loadingMore) return null;

    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="large" color="#FF0050" />
        <Text style={styles.footerText}>Loading more games...</Text>
      </View>
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
      <View style={styles.emptyContainer}>
        <Ionicons name="game-controller-outline" size={80} color="#333" />
        <Text style={styles.emptyTitle}>No Games Found</Text>
        <Text style={styles.emptySubtitle}>
          Pull down to refresh and discover new games
        </Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={loadInitialGames}
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
      </View>
    );
  };

  const keyExtractor = (item: Game, index: number) => `${item.id}-${index}`;

  return (
    <View style={styles.container}>
      {/* Header */}
      <Animated.View style={[styles.header, headerStyle]} entering={FadeIn}>
        <LinearGradient
          colors={['#000000', 'transparent']}
          style={styles.headerGradient}
        >
          <View style={styles.headerContent}>
            <View style={styles.logoContainer}>
              <LinearGradient
                colors={['#FF0050', '#FF4500']}
                style={styles.logoGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="game-controller" size={24} color="#fff" />
              </LinearGradient>
              <Text style={styles.headerTitle}>TikTok Games</Text>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>

      {/* Games List */}
      <FlatList
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
        onViewableItemsChanged={handleViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#FF0050"
            colors={['#FF0050']}
          />
        }
        getItemLayout={(data, index) => ({
          length: ITEM_HEIGHT,
          offset: ITEM_HEIGHT * index,
          index,
        })}
        removeClippedSubviews
        maxToRenderPerBatch={3}
        windowSize={5}
        initialNumToRender={2}
      />

      {/* Error Toast */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
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
  headerGradient: {
    paddingTop: 50,
    paddingBottom: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
  },
  gameItemContainer: {
    height: ITEM_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gameCard: {
    width: width - 32,
    height: ITEM_HEIGHT - 40,
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
  errorContainer: {
    position: 'absolute',
    bottom: 80,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 0, 80, 0.9)',
    borderRadius: 12,
    padding: 16,
  },
  errorText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});

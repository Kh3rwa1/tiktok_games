import React, { useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Dimensions,
  RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeIn,
  FadeInDown,
  Layout
} from 'react-native-reanimated';
import { useGameStore } from '../store/gameStore';
import { useAuthStore } from '../store/authStore';
import { RootStackParamList, Game } from '../types';
import { PremiumGameCard, LoadingSkeleton } from '../components';
import haptics from '../utils/haptics';

const { width } = Dimensions.get('window');

type NavigationProp = StackNavigationProp<RootStackParamList>;

const SORT_OPTIONS = [
  { label: 'Recent', value: 'recent' },
  { label: 'Popular', value: 'popular' },
  { label: 'Rating', value: 'rating' }
];

export default function FavoritesScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { favorites, isLoading, error, fetchFavorites } = useGameStore();
  const { user } = useAuthStore();

  const [sortBy, setSortBy] = useState<'recent' | 'popular' | 'rating'>('recent');
  const [refreshing, setRefreshing] = useState(false);

  // Load favorites when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (user) {
        loadFavorites();
      }
    }, [user])
  );

  const loadFavorites = async () => {
    haptics.light();
    await fetchFavorites();
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadFavorites();
    setRefreshing(false);
  };

  const handleGamePress = useCallback((game: Game) => {
    haptics.medium();
    navigation.navigate('GamePlayer', { game });
  }, [navigation]);

  const handleSortChange = useCallback((newSort: typeof sortBy) => {
    haptics.selection();
    setSortBy(newSort);
  }, []);

  // Sort favorites based on selected option
  const sortedFavorites = React.useMemo(() => {
    const sorted = [...favorites];

    switch (sortBy) {
      case 'popular':
        return sorted.sort((a, b) => (b.stats?.plays || 0) - (a.stats?.plays || 0));
      case 'rating':
        return sorted.sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0));
      case 'recent':
      default:
        return sorted.sort((a, b) => {
          const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt);
          const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt);
          return dateB.getTime() - dateA.getTime();
        });
    }
  }, [favorites, sortBy]);

  const renderSortChip = ({ item }: { item: typeof SORT_OPTIONS[0] }) => {
    const isSelected = item.value === sortBy;

    return (
      <TouchableOpacity
        onPress={() => handleSortChange(item.value as any)}
        activeOpacity={0.7}
      >
        {isSelected ? (
          <View style={styles.sortChip}>
            <Text style={styles.sortChipTextSelected}>{item.label}</Text>
          </View>
        ) : (
          <View style={styles.sortChipInactive}>
            <Text style={styles.sortChipText}>{item.label}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderGameCard = ({ item, index }: { item: Game; index: number }) => (
    <Animated.View
      entering={FadeInDown.delay(index * 50).springify()}
      layout={Layout.springify()}
      style={styles.gameCardWrapper}
    >
      <PremiumGameCard
        game={item}
        onPress={handleGamePress}
        showLikeButton
        showStats
      />
    </Animated.View>
  );

  const renderEmptyState = () => (
    <Animated.View
      entering={FadeIn.delay(200)}
      style={styles.emptyState}
    >
      <View style={styles.emptyIconContainer}>
        <Ionicons name="heart" size={60} color="#000000" />
      </View>
      <Text style={styles.emptyTitle}>No Favorites Yet</Text>
      <Text style={styles.emptyText}>
        Games you favorite will appear here.{'\n'}
        Start exploring and save your favorites!
      </Text>
      <TouchableOpacity
        onPress={() => navigation.navigate('MainTabs', { screen: 'Home' } as any)}
        style={styles.exploreButton}
        activeOpacity={0.8}
      >
        <View style={styles.exploreButtonGradient}>
          <Ionicons name="compass" size={20} color="#000000" style={{ marginRight: 8 }} />
          <Text style={styles.exploreButtonText}>Explore Games</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );

  const renderError = () => (
    <Animated.View
      entering={FadeIn}
      style={styles.errorContainer}
    >
      <Ionicons name="alert-circle" size={60} color="#FF6B6B" />
      <Text style={styles.errorTitle}>Oops! Something went wrong</Text>
      <Text style={styles.errorText}>{error}</Text>
      <TouchableOpacity
        onPress={loadFavorites}
        style={styles.retryButton}
        activeOpacity={0.8}
      >
        <View style={styles.retryButtonGradient}>
          <Ionicons name="refresh" size={20} color="#000000" style={{ marginRight: 8 }} />
          <Text style={styles.retryButtonText}>Try Again</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <Animated.View
        entering={FadeInDown.springify()}
        style={styles.header}
      >
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Favorites</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{favorites.length}</Text>
          </View>
        </View>

        {/* Sort Options */}
        {favorites.length > 0 && (
          <FlatList
            data={SORT_OPTIONS}
            renderItem={renderSortChip}
            keyExtractor={(item) => item.value}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.sortContainer}
            style={styles.sortList}
          />
        )}
      </Animated.View>

      {/* Favorites Grid */}
      {error ? renderError() : (
        <>
          {isLoading ? (
            <LoadingSkeleton variant="grid" count={6} />
          ) : (
            <FlatList
              data={sortedFavorites}
              renderItem={renderGameCard}
              keyExtractor={(item) => item.id}
              numColumns={2}
              contentContainerStyle={styles.gamesContainer}
              ListEmptyComponent={renderEmptyState}
              showsVerticalScrollIndicator={false}
              columnWrapperStyle={favorites.length > 0 ? styles.columnWrapper : undefined}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  tintColor="#FF6B6B"
                  colors={['#FF6B6B']}
                  progressBackgroundColor="#FFFEF0"
                />
              }
            />
          )}
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFEF0'
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 15
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#000000',
    marginRight: 12
  },
  countBadge: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 0,
    minWidth: 32,
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#000000',
    shadowColor: '#000000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3
  },
  countText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#000000'
  },
  sortList: {
    maxHeight: 45
  },
  sortContainer: {
    gap: 10
  },
  sortChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 0,
    marginRight: 8,
    backgroundColor: '#FF6B6B',
    borderWidth: 3,
    borderColor: '#000000',
    shadowColor: '#000000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3
  },
  sortChipInactive: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 0,
    backgroundColor: '#FFFEF0',
    borderWidth: 3,
    borderColor: '#000000',
    marginRight: 8
  },
  sortChipTextSelected: {
    fontSize: 14,
    fontWeight: '900',
    color: '#000000'
  },
  sortChipText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000000'
  },
  gamesContainer: {
    paddingHorizontal: 10,
    paddingBottom: 20
  },
  columnWrapper: {
    justifyContent: 'space-between',
    paddingHorizontal: 10
  },
  gameCardWrapper: {
    width: (width - 40) / 2,
    marginBottom: 15
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 60
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 0,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    backgroundColor: '#FF6B6B',
    borderWidth: 3,
    borderColor: '#000000',
    shadowColor: '#000000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#000000',
    marginBottom: 10
  },
  emptyText: {
    fontSize: 16,
    color: '#000000',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 30,
    fontWeight: '700'
  },
  exploreButton: {
    borderRadius: 0,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: '#000000',
    shadowColor: '#000000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4
  },
  exploreButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 0,
    backgroundColor: '#4ECDC4'
  },
  exploreButtonText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#000000'
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 50
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#000000',
    marginTop: 20,
    marginBottom: 10
  },
  errorText: {
    fontSize: 16,
    color: '#000000',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
    fontWeight: '700'
  },
  retryButton: {
    borderRadius: 0,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: '#000000',
    shadowColor: '#000000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4
  },
  retryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 0,
    backgroundColor: '#FF6B6B'
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#000000'
  }
});

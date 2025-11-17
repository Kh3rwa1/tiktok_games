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
import { haptics } from '../utils/haptics';

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
          <LinearGradient
            colors={['#FF0050', '#FF4500']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.sortChip}
          >
            <Text style={styles.sortChipTextSelected}>{item.label}</Text>
          </LinearGradient>
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
      <LinearGradient
        colors={['#FF0050', '#FF4500']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.emptyIconContainer}
      >
        <Ionicons name="heart" size={60} color="#fff" />
      </LinearGradient>
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
        <LinearGradient
          colors={['#FF0050', '#FF4500']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.exploreButtonGradient}
        >
          <Ionicons name="compass" size={20} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.exploreButtonText}>Explore Games</Text>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );

  const renderError = () => (
    <Animated.View
      entering={FadeIn}
      style={styles.errorContainer}
    >
      <Ionicons name="alert-circle" size={60} color="#FF0050" />
      <Text style={styles.errorTitle}>Oops! Something went wrong</Text>
      <Text style={styles.errorText}>{error}</Text>
      <TouchableOpacity
        onPress={loadFavorites}
        style={styles.retryButton}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#FF0050', '#FF4500']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.retryButtonGradient}
        >
          <Ionicons name="refresh" size={20} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.retryButtonText}>Try Again</Text>
        </LinearGradient>
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
                  tintColor="#FF0050"
                  colors={['#FF0050', '#FF4500']}
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
    backgroundColor: '#000'
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
    fontWeight: 'bold',
    color: '#fff',
    marginRight: 12
  },
  countBadge: {
    backgroundColor: '#FF0050',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 32,
    alignItems: 'center'
  },
  countText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff'
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
    borderRadius: 16,
    marginRight: 8
  },
  sortChipInactive: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#333',
    marginRight: 8
  },
  sortChipTextSelected: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff'
  },
  sortChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888'
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
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 10
  },
  emptyText: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 30
  },
  exploreButton: {
    borderRadius: 12,
    overflow: 'hidden'
  },
  exploreButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 12
  },
  exploreButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff'
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
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 20,
    marginBottom: 10
  },
  errorText: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22
  },
  retryButton: {
    borderRadius: 12,
    overflow: 'hidden'
  },
  retryButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 12
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff'
  }
});

import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  Dimensions,
  Keyboard,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeIn,
  FadeInDown,
  Layout
} from 'react-native-reanimated';
import { useGameStore } from '../store/gameStore';
import { RootStackParamList, Game, GameCategory } from '../types';
import { PremiumGameCard, LoadingSkeleton } from '../components';
import haptics from '../utils/haptics';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - 40) / 2;
const CARD_HEIGHT = 200; // Approximate height of game card

type NavigationProp = StackNavigationProp<RootStackParamList>;

const CATEGORIES: { label: string; value: GameCategory | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Action', value: 'action' },
  { label: 'Puzzle', value: 'puzzle' },
  { label: 'Adventure', value: 'adventure' },
  { label: 'Strategy', value: 'strategy' },
  { label: 'Casual', value: 'casual' },
  { label: 'Arcade', value: 'arcade' },
  { label: 'Racing', value: 'racing' },
  { label: 'Sports', value: 'sports' }
];

export default function SearchScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { games, isLoading, error, fetchGames } = useGameStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<GameCategory | 'all'>('all');
  const [hasSearched, setHasSearched] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const searchRequestId = useRef<number>(0);

  const handleSearch = useCallback(async () => {
    haptics.light();
    Keyboard.dismiss();

    if (!searchQuery.trim() && selectedCategory === 'all') {
      return;
    }

    setHasSearched(true);

    // Increment request ID to track this specific request
    const currentRequestId = ++searchRequestId.current;

    const params: any = {
      page: 1,
      limit: 20
    };

    if (searchQuery.trim()) {
      params.search = searchQuery.trim();
    }

    if (selectedCategory !== 'all') {
      params.category = selectedCategory;
    }

    await fetchGames(params);

    // Only update if this is still the latest request
    if (currentRequestId !== searchRequestId.current) {
      return; // Stale request, ignore results
    }
  }, [searchQuery, selectedCategory, fetchGames]);

  // Debounced search
  const handleSearchInput = useCallback((text: string) => {
    setSearchQuery(text);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (text.trim().length >= 2) {
      searchTimeoutRef.current = setTimeout(() => {
        handleSearch();
      }, 500);
    }
  }, [handleSearch]);

  const handleCategorySelect = useCallback((category: GameCategory | 'all') => {
    haptics.selection();
    setSelectedCategory(category);

    // Auto-search when category changes
    if (hasSearched) {
      setTimeout(() => handleSearch(), 100);
    }
  }, [hasSearched, handleSearch]);

  const handleGamePress = useCallback((game: Game) => {
    haptics.medium();
    navigation.navigate('GamePlayer', { game });
  }, [navigation]);

  const handleClearSearch = useCallback(() => {
    haptics.light();
    setSearchQuery('');
    setHasSearched(false);
  }, []);

  // Optimized getItemLayout for better scroll performance
  const getItemLayout = useCallback((data: any, index: number) => ({
    length: CARD_HEIGHT + 15, // Card height + margin
    offset: (CARD_HEIGHT + 15) * Math.floor(index / 2),
    index,
  }), []);

  const renderCategoryChip = ({ item }: { item: typeof CATEGORIES[0] }) => {
    const isSelected = item.value === selectedCategory;

    return (
      <TouchableOpacity
        onPress={() => handleCategorySelect(item.value)}
        activeOpacity={0.7}
      >
        {isSelected ? (
          <View style={styles.categoryChip}>
            <Text style={styles.categoryChipTextSelected}>{item.label}</Text>
          </View>
        ) : (
          <View style={styles.categoryChipInactive}>
            <Text style={styles.categoryChipText}>{item.label}</Text>
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

  const renderEmptyState = () => {
    if (isLoading) return null;

    if (!hasSearched) {
      return (
        <Animated.View
          entering={FadeIn.delay(200)}
          style={styles.emptyState}
        >
          <Ionicons name="search" size={80} color="#000000" />
          <Text style={styles.emptyTitle}>Discover Amazing Games</Text>
          <Text style={styles.emptyText}>
            Search for games or browse by category
          </Text>
        </Animated.View>
      );
    }

    if (games.length === 0) {
      return (
        <Animated.View
          entering={FadeIn.delay(200)}
          style={styles.emptyState}
        >
          <Ionicons name="game-controller-outline" size={80} color="#000000" />
          <Text style={styles.emptyTitle}>No Games Found</Text>
          <Text style={styles.emptyText}>
            Try a different search term or category
          </Text>
        </Animated.View>
      );
    }

    return null;
  };

  const renderError = () => (
    <Animated.View
      entering={FadeIn}
      style={styles.errorContainer}
    >
      <Ionicons name="alert-circle" size={60} color="#FF6B6B" />
      <Text style={styles.errorTitle}>Oops! Something went wrong</Text>
      <Text style={styles.errorText}>{error}</Text>
      <TouchableOpacity
        onPress={handleSearch}
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
        <Text style={styles.headerTitle}>Search Games</Text>

        {/* Search Input */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#000000" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search for games..."
            placeholderTextColor="#666"
            value={searchQuery}
            onChangeText={handleSearchInput}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={handleClearSearch} style={styles.clearButton}>
              <Ionicons name="close-circle" size={20} color="#000000" />
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>

      {/* Categories */}
      <Animated.View entering={FadeInDown.delay(100).springify()}>
        <FlatList
          data={CATEGORIES}
          renderItem={renderCategoryChip}
          keyExtractor={(item) => item.value}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContainer}
          style={styles.categoriesList}
        />
      </Animated.View>

      {/* Games Grid */}
      {error ? renderError() : (
        <>
          {isLoading && !hasSearched ? (
            <LoadingSkeleton variant="grid" count={6} />
          ) : (
            <FlatList
              data={games}
              renderItem={renderGameCard}
              keyExtractor={(item) => item.id}
              numColumns={2}
              contentContainerStyle={styles.gamesContainer}
              ListEmptyComponent={renderEmptyState}
              showsVerticalScrollIndicator={false}
              columnWrapperStyle={styles.columnWrapper}
              onScrollBeginDrag={Keyboard.dismiss}
              keyboardShouldPersistTaps="handled"
              // Performance optimizations for smooth scrolling
              maxToRenderPerBatch={6}
              windowSize={10}
              removeClippedSubviews={Platform.OS === 'android'}
              initialNumToRender={6}
              updateCellsBatchingPeriod={50}
              getItemLayout={getItemLayout}
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
  headerTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: '#000000',
    marginBottom: 15
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFEF0',
    borderRadius: 0,
    paddingHorizontal: 15,
    height: 50,
    borderWidth: 3,
    borderColor: '#000000',
    shadowColor: '#000000',
    shadowOffset: { width: 4, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 4
  },
  searchIcon: {
    marginRight: 10
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000000',
    paddingVertical: 0,
    fontWeight: '700'
  },
  clearButton: {
    padding: 5
  },
  categoriesList: {
    maxHeight: 50,
    marginBottom: 15
  },
  categoriesContainer: {
    paddingHorizontal: 15,
    gap: 10
  },
  categoryChip: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 0,
    marginRight: 10,
    backgroundColor: '#FF6B6B',
    borderWidth: 3,
    borderColor: '#000000',
    shadowColor: '#000000',
    shadowOffset: { width: 3, height: 3 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3
  },
  categoryChipInactive: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 0,
    backgroundColor: '#FFFEF0',
    borderWidth: 3,
    borderColor: '#000000',
    marginRight: 10
  },
  categoryChipTextSelected: {
    fontSize: 14,
    fontWeight: '900',
    color: '#000000'
  },
  categoryChipText: {
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
    paddingTop: 100
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#000000',
    marginTop: 20,
    marginBottom: 10
  },
  emptyText: {
    fontSize: 16,
    color: '#000000',
    textAlign: 'center',
    lineHeight: 22,
    fontWeight: '700'
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

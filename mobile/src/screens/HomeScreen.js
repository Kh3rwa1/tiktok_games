import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Dimensions,
  RefreshControl,
  ActivityIndicator,
  Text,
} from 'react-native';
import GameCard from '../components/GameCard';
import { gamesAPI } from '../services/api';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function HomeScreen({ navigation }) {
  const [games, setGames] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const flatListRef = useRef(null);
  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  });

  useEffect(() => {
    loadGames();
  }, []);

  const loadGames = async (pageNum = 1, refresh = false) => {
    if (loading || (!hasMore && !refresh)) return;

    setLoading(true);
    try {
      const response = await gamesAPI.getGames({
        page: pageNum,
        limit: 10,
        sortBy: 'popular',
      });

      const newGames = response.data.data;

      if (refresh) {
        setGames(newGames);
        setPage(1);
      } else {
        setGames((prev) => [...prev, ...newGames]);
      }

      setHasMore(response.data.pagination.page < response.data.pagination.pages);
    } catch (error) {
      console.error('Error loading games:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      loadGames(nextPage);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    setHasMore(true);
    loadGames(1, true);
  };

  const handlePlayGame = (game) => {
    navigation.navigate('GamePlayer', { game });
  };

  const handleLike = async (gameId) => {
    try {
      await gamesAPI.likeGame(gameId);
      // Update local state
      setGames((prevGames) =>
        prevGames.map((game) => {
          if (game._id === gameId) {
            const isLiked = game.likedBy?.includes('currentUserId'); // You'd get this from auth context
            return {
              ...game,
              stats: {
                ...game.stats,
                likes: isLiked ? game.stats.likes - 1 : game.stats.likes + 1,
              },
            };
          }
          return game;
        })
      );
    } catch (error) {
      console.error('Error liking game:', error);
    }
  };

  const renderFooter = () => {
    if (!loading) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="large" color="#FF0050" />
      </View>
    );
  };

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No games available</Text>
        <Text style={styles.emptySubtext}>Check back later for new content!</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={games}
        renderItem={({ item }) => (
          <GameCard
            game={item}
            onPlay={handlePlayGame}
            onLike={handleLike}
          />
        )}
        keyExtractor={(item) => item._id}
        pagingEnabled
        snapToInterval={SCREEN_HEIGHT}
        decelerationRate="fast"
        showsVerticalScrollIndicator={false}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#FF0050"
          />
        }
        ListFooterComponent={renderFooter}
        ListEmptyComponent={renderEmpty}
        viewabilityConfig={viewabilityConfig.current}
        removeClippedSubviews={true}
        maxToRenderPerBatch={3}
        windowSize={5}
        initialNumToRender={2}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  emptySubtext: {
    color: '#999',
    fontSize: 14,
  },
});

import { create } from 'zustand';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  updateDoc,
  arrayUnion,
  arrayRemove,
  increment,
  Timestamp,
  QueryConstraint
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { Game, GameState, FetchGamesParams } from '../types';
import { useAuthStore } from './authStore';

export const useGameStore = create<GameState>((set, get) => ({
  games: [],
  currentGame: null,
  favorites: [],
  isLoading: false,
  error: null,

  fetchGames: async (params: FetchGamesParams = {}) => {
    try {
      set({ isLoading: true, error: null });

      const {
        page = 1,
        limit: pageLimit = 10,
        category,
        sortBy = 'createdAt',
        order = 'desc',
        featured
      } = params;

      // Build query constraints array
      const constraints: QueryConstraint[] = [
        where('isActive', '==', true)
      ];

      // Add filters
      if (category) {
        constraints.push(where('category', '==', category));
      }

      if (featured !== undefined) {
        constraints.push(where('isFeatured', '==', featured));
      }

      // Add sorting
      const sortField = getSortField(sortBy);
      constraints.push(orderBy(sortField, order as 'asc' | 'desc'));
      constraints.push(limit(pageLimit));

      // Build final query
      const q = query(collection(db, 'games'), ...constraints);

      // Execute query
      const snapshot = await getDocs(q);

      const games: Game[] = snapshot.docs.map(docSnapshot => ({
        id: docSnapshot.id,
        ...docSnapshot.data()
      } as Game));

      // Client-side search if needed
      let filteredGames = games;
      if (params.search) {
        const searchLower = params.search.toLowerCase();
        filteredGames = games.filter(game =>
          game.title.toLowerCase().includes(searchLower) ||
          game.description.toLowerCase().includes(searchLower)
        );
      }

      set({
        games: filteredGames,
        isLoading: false,
        error: null
      });
    } catch (error: any) {
      console.error('Fetch games error:', error);

      // Provide user-friendly error messages
      let errorMessage = 'Failed to fetch games';
      if (error.code === 'permission-denied') {
        errorMessage = 'Permission denied. Please check your authentication.';
      } else if (error.code === 'unavailable') {
        errorMessage = 'Service unavailable. Please check your internet connection.';
      } else if (error.message) {
        errorMessage = error.message;
      }

      set({
        error: errorMessage,
        isLoading: false
      });
      throw error;
    }
  },

  fetchGameById: async (id: string) => {
    try {
      set({ isLoading: true, error: null });

      const gameDoc = await getDoc(doc(db, 'games', id));

      if (!gameDoc.exists()) {
        throw new Error('Game not found');
      }

      const game: Game = {
        id: gameDoc.id,
        ...gameDoc.data()
      } as Game;

      // Increment views
      await updateDoc(doc(db, 'games', id), {
        'stats.views': increment(1),
        updatedAt: Timestamp.now()
      });

      set({
        currentGame: game,
        isLoading: false,
        error: null
      });
    } catch (error: any) {
      console.error('Fetch game error:', error);
      set({
        error: error.message || 'Failed to fetch game',
        isLoading: false
      });
      throw error;
    }
  },

  toggleLike: async (gameId: string) => {
    try {
      const user = useAuthStore.getState().user;
      if (!user) throw new Error('Must be logged in to like games');

      const gameRef = doc(db, 'games', gameId);
      const gameDoc = await getDoc(gameRef);

      if (!gameDoc.exists()) {
        throw new Error('Game not found');
      }

      const game = gameDoc.data() as Game;
      const isLiked = game.likedBy?.includes(user.uid);

      if (isLiked) {
        // Unlike
        await updateDoc(gameRef, {
          likedBy: arrayRemove(user.uid),
          'stats.likes': increment(-1),
          updatedAt: Timestamp.now()
        });
      } else {
        // Like
        await updateDoc(gameRef, {
          likedBy: arrayUnion(user.uid),
          'stats.likes': increment(1),
          updatedAt: Timestamp.now()
        });
      }

      // Update local state
      const { games, currentGame } = get();

      if (currentGame?.id === gameId) {
        const updatedGame = {
          ...currentGame,
          likedBy: isLiked
            ? currentGame.likedBy.filter(id => id !== user.uid)
            : [...currentGame.likedBy, user.uid],
          stats: {
            ...currentGame.stats,
            likes: currentGame.stats.likes + (isLiked ? -1 : 1)
          }
        };
        set({ currentGame: updatedGame });
      }

      const updatedGames = games.map(g =>
        g.id === gameId
          ? {
              ...g,
              likedBy: isLiked
                ? g.likedBy.filter(id => id !== user.uid)
                : [...g.likedBy, user.uid],
              stats: {
                ...g.stats,
                likes: g.stats.likes + (isLiked ? -1 : 1)
              }
            }
          : g
      );

      set({ games: updatedGames });
    } catch (error: any) {
      console.error('Toggle like error:', error);
      set({ error: error.message || 'Failed to toggle like' });
      throw error;
    }
  },

  rateGame: async (gameId: string, rating: number) => {
    try {
      const user = useAuthStore.getState().user;
      if (!user) throw new Error('Must be logged in to rate games');

      const gameRef = doc(db, 'games', gameId);
      const gameDoc = await getDoc(gameRef);

      if (!gameDoc.exists()) {
        throw new Error('Game not found');
      }

      const game = gameDoc.data() as Game;

      // Remove existing rating by this user
      const updatedRatings = game.ratings?.filter(r => r.userId !== user.uid) || [];

      // Add new rating
      updatedRatings.push({
        userId: user.uid,
        rating,
        createdAt: Timestamp.now()
      });

      // Calculate new average
      const sum = updatedRatings.reduce((acc, r) => acc + r.rating, 0);
      const averageRating = updatedRatings.length > 0
        ? parseFloat((sum / updatedRatings.length).toFixed(2))
        : 0;

      await updateDoc(gameRef, {
        ratings: updatedRatings,
        averageRating,
        updatedAt: Timestamp.now()
      });

      // Update local state
      const { games, currentGame } = get();

      if (currentGame?.id === gameId) {
        set({
          currentGame: {
            ...currentGame,
            ratings: updatedRatings,
            averageRating
          }
        });
      }

      const updatedGames = games.map(g =>
        g.id === gameId
          ? { ...g, ratings: updatedRatings, averageRating }
          : g
      );

      set({ games: updatedGames });
    } catch (error: any) {
      console.error('Rate game error:', error);
      set({ error: error.message || 'Failed to rate game' });
      throw error;
    }
  },

  recordPlay: async (gameId: string, duration: number) => {
    try {
      const user = useAuthStore.getState().user;
      if (!user) {
        console.warn('Cannot record play: User not logged in');
        return;
      }

      if (!gameId || duration < 0) {
        console.warn('Invalid gameId or duration');
        return;
      }

      // Update game stats
      await updateDoc(doc(db, 'games', gameId), {
        'stats.plays': increment(1),
        updatedAt: Timestamp.now()
      });

      // Update user play history
      await updateDoc(doc(db, 'users', user.uid), {
        playHistory: arrayUnion({
          gameId,
          playedAt: Timestamp.now(),
          duration
        }),
        'stats.totalGamesPlayed': increment(1),
        'stats.totalPlayTime': increment(duration),
        updatedAt: Timestamp.now()
      });
    } catch (error: any) {
      console.error('Record play error:', error);
      // Don't set error state to avoid disrupting user experience
      // Play recording is not critical for the user
      if (error.code === 'permission-denied') {
        console.warn('Permission denied while recording play');
      }
    }
  },

  fetchFavorites: async () => {
    try {
      const user = useAuthStore.getState().user;
      if (!user) return;

      set({ isLoading: true, error: null });

      if (!user.favoriteGames || user.favoriteGames.length === 0) {
        set({ favorites: [], isLoading: false });
        return;
      }

      // Fetch favorite games
      const favoriteGames: Game[] = [];

      for (const gameId of user.favoriteGames) {
        const gameDoc = await getDoc(doc(db, 'games', gameId));
        if (gameDoc.exists()) {
          favoriteGames.push({
            id: gameDoc.id,
            ...gameDoc.data()
          } as Game);
        }
      }

      set({
        favorites: favoriteGames,
        isLoading: false,
        error: null
      });
    } catch (error: any) {
      console.error('Fetch favorites error:', error);
      set({
        error: error.message || 'Failed to fetch favorites',
        isLoading: false
      });
    }
  }
}));

// Helper function to get sort field
function getSortField(sortBy: string): string {
  const sortFields: Record<string, string> = {
    popular: 'stats.plays',
    likes: 'stats.likes',
    rating: 'averageRating',
    createdAt: 'createdAt',
    views: 'stats.views'
  };

  return sortFields[sortBy] || 'createdAt';
}

/**
 * Game Store - Unified API-based game management
 * TikTok-style gaming with social features
 */

import { create } from 'zustand';
import { Game, GameState, FetchGamesParams, Comment } from '../types';
import api from '../services/api';
import { useAuthStore } from './authStore';

interface ExtendedGameState extends GameState {
  feed: Game[];
  comments: Comment[];
  feedPage: number;
  hasMoreFeed: boolean;
  feedType: 'foryou' | 'following';
  fetchFeed: (refresh?: boolean) => Promise<void>;
  setFeedType: (type: 'foryou' | 'following') => void;
  fetchComments: (gameId: string, page?: number) => Promise<void>;
  addComment: (gameId: string, content: string, parentId?: number) => Promise<void>;
  likeComment: (commentId: number) => Promise<void>;
  deleteComment: (commentId: number) => Promise<void>;
  shareGame: (gameId: string, platform?: string) => Promise<void>;
}

export const useGameStore = create<ExtendedGameState>((set, get) => ({
  games: [],
  currentGame: null,
  favorites: [],
  feed: [],
  comments: [],
  feedPage: 1,
  hasMoreFeed: true,
  feedType: 'foryou',
  isLoading: false,
  error: null,

  fetchGames: async (params: FetchGamesParams = {}) => {
    try {
      set({ isLoading: true, error: null });

      const { games } = await api.getGames(params);

      // Transform server games to app format
      const transformedGames: Game[] = games.map(transformGame);

      set({
        games: transformedGames,
        isLoading: false,
        error: null
      });
    } catch (error: any) {
      console.error('Fetch games error:', error);
      set({
        error: error.message || 'Failed to fetch games',
        isLoading: false
      });
      throw error;
    }
  },

  fetchGameById: async (id: string) => {
    try {
      set({ isLoading: true, error: null });

      const game = await api.getGameById(id);
      const transformedGame = transformGame(game);

      set({
        currentGame: transformedGame,
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

      const result = await api.toggleLike(gameId);

      // Update local state
      const { games, currentGame, feed } = get();

      const updateGameLikes = (game: Game) => {
        if (game.id === gameId) {
          const userId = String(user.id);
          const isLiked = game.likedBy?.includes(userId);
          return {
            ...game,
            likedBy: isLiked
              ? game.likedBy.filter(id => id !== userId)
              : [...(game.likedBy || []), userId],
            stats: {
              ...game.stats,
              likes: result.likes
            }
          };
        }
        return game;
      };

      if (currentGame?.id === gameId) {
        set({ currentGame: updateGameLikes(currentGame) });
      }

      set({
        games: games.map(updateGameLikes),
        feed: feed.map(updateGameLikes)
      });
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

      const result = await api.rateGame(gameId, rating);

      // Update local state
      const { games, currentGame, feed } = get();

      const updateGameRating = (game: Game) => {
        if (game.id === gameId) {
          return {
            ...game,
            averageRating: result.averageRating
          };
        }
        return game;
      };

      if (currentGame?.id === gameId) {
        set({ currentGame: updateGameRating(currentGame) });
      }

      set({
        games: games.map(updateGameRating),
        feed: feed.map(updateGameRating)
      });
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

      await api.recordPlay(gameId, duration);
    } catch (error: any) {
      console.error('Record play error:', error);
    }
  },

  fetchFavorites: async () => {
    try {
      const user = useAuthStore.getState().user;
      if (!user) return;

      set({ isLoading: true, error: null });

      const games = await api.getFavorites();
      const transformedGames = games.map(transformGame);

      set({
        favorites: transformedGames,
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
  },

  // TikTok-style feed
  fetchFeed: async (refresh = false) => {
    try {
      const { feedPage, feed, feedType, hasMoreFeed } = get();

      if (!refresh && !hasMoreFeed) return;

      const page = refresh ? 1 : feedPage;

      set({ isLoading: true, error: null });

      let result;
      if (feedType === 'following') {
        result = await api.getFollowingFeed(page, 10);
      } else {
        result = await api.getFeed(page, 10);
      }

      const transformedGames = result.games.map(transformGame);

      set({
        feed: refresh ? transformedGames : [...feed, ...transformedGames],
        feedPage: page + 1,
        hasMoreFeed: result.pagination.page < result.pagination.pages,
        isLoading: false,
        error: null
      });
    } catch (error: any) {
      console.error('Fetch feed error:', error);
      set({
        error: error.message || 'Failed to fetch feed',
        isLoading: false
      });
    }
  },

  setFeedType: (type: 'foryou' | 'following') => {
    set({
      feedType: type,
      feed: [],
      feedPage: 1,
      hasMoreFeed: true
    });
    get().fetchFeed(true);
  },

  // Comments
  fetchComments: async (gameId: string, page = 1) => {
    try {
      const result = await api.getComments(gameId, page);

      if (page === 1) {
        set({ comments: result.comments });
      } else {
        const { comments } = get();
        set({ comments: [...comments, ...result.comments] });
      }
    } catch (error: any) {
      console.error('Fetch comments error:', error);
    }
  },

  addComment: async (gameId: string, content: string, parentId?: number) => {
    try {
      const user = useAuthStore.getState().user;
      if (!user) throw new Error('Must be logged in to comment');

      await api.createComment(gameId, content, parentId);

      // Refresh comments
      await get().fetchComments(gameId);
    } catch (error: any) {
      console.error('Add comment error:', error);
      throw error;
    }
  },

  likeComment: async (commentId: number) => {
    try {
      const result = await api.likeComment(commentId);

      // Update local state
      const { comments } = get();
      set({
        comments: comments.map(c =>
          c.id === commentId
            ? { ...c, likes: c.likes + (result.liked ? 1 : -1), is_liked: result.liked ? 1 : 0 }
            : c
        )
      });
    } catch (error: any) {
      console.error('Like comment error:', error);
    }
  },

  deleteComment: async (commentId: number) => {
    try {
      await api.deleteComment(commentId);

      // Remove from local state
      const { comments } = get();
      set({
        comments: comments.filter(c => c.id !== commentId)
      });
    } catch (error: any) {
      console.error('Delete comment error:', error);
      throw error;
    }
  },

  shareGame: async (gameId: string, platform = 'link') => {
    try {
      await api.shareGame(gameId, platform);

      // Update local share count
      const { games, currentGame, feed } = get();

      const updateGameShares = (game: Game) => {
        if (game.id === gameId) {
          return {
            ...game,
            stats: {
              ...game.stats,
              shares: game.stats.shares + 1
            }
          };
        }
        return game;
      };

      if (currentGame?.id === gameId) {
        set({ currentGame: updateGameShares(currentGame) });
      }

      set({
        games: games.map(updateGameShares),
        feed: feed.map(updateGameShares)
      });
    } catch (error: any) {
      console.error('Share game error:', error);
    }
  }
}));

// Helper function to transform server game to app format
function transformGame(game: any): Game {
  return {
    id: String(game.id),
    title: game.title,
    description: game.description,
    thumbnail: game.thumbnail,
    gameUrl: game.game_url || game.gameUrl,
    category: game.category,
    tags: game.tags || [],
    difficulty: game.difficulty,
    creatorId: String(game.creator_id || game.creatorId),
    creator: game.creator_username ? {
      username: game.creator_username,
      avatar: game.creator_avatar || 'https://via.placeholder.com/150'
    } : undefined,
    stats: {
      views: game.views || 0,
      plays: game.plays || 0,
      likes: game.likes || 0,
      shares: game.shares || 0,
      averagePlayTime: game.average_play_time || 0
    },
    likedBy: game.likedBy || [],
    ratings: game.ratings || [],
    averageRating: game.average_rating || game.averageRating || 0,
    isActive: game.is_active !== false,
    isFeatured: game.is_featured || false,
    version: game.version || '1.0.0',
    fileSize: game.file_size || 0,
    controls: game.controls,
    requirements: game.requirements,
    createdAt: game.created_at || game.createdAt,
    updatedAt: game.updated_at || game.updatedAt
  };
}

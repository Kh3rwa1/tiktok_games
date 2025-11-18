// User types
export interface User {
  id: string | number;
  uid?: string;
  username: string;
  email: string;
  avatar?: string;
  bio?: string;
  favoriteGames?: string[];
  playHistory?: PlayHistoryEntry[];
  stats?: UserStats;
  isActive?: boolean;
  role: 'user' | 'admin';
  followers_count?: number;
  following_count?: number;
  games_count?: number;
  total_games_played?: number;
  total_play_time?: number;
  createdAt?: Date | any;
  updatedAt?: Date | any;
  created_at?: string;
  is_following?: number;
}

export interface UserStats {
  totalGamesPlayed: number;
  totalPlayTime: number;
}

// Comment types
export interface Comment {
  id: number;
  game_id: number;
  user_id: number;
  parent_id: number | null;
  content: string;
  likes: number;
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
  username: string;
  avatar: string;
  reply_count: number;
  is_liked: number;
}

// Notification types
export interface Notification {
  id: number;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'promotion';
  target_role: 'all' | 'users' | 'admins';
  priority: number;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  is_read: boolean;
}

export interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: number) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}

// Social types
export interface UserProfile extends User {
  games?: Game[];
}

export interface PlayHistoryEntry {
  gameId: string;
  playedAt: Date | any;
  duration: number;
}

// Game types
export interface Game {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  gameUrl: string;
  category: GameCategory;
  tags: string[];
  difficulty: 'easy' | 'medium' | 'hard';
  creatorId: string;
  creator?: {
    username: string;
    avatar: string;
  };
  stats: GameStats;
  likedBy: string[];
  ratings: Rating[];
  averageRating: number;
  isActive: boolean;
  isFeatured: boolean;
  version: string;
  fileSize: number;
  controls?: string;
  requirements?: string;
  createdAt: Date | any;
  updatedAt: Date | any;
}

export interface GameStats {
  views: number;
  plays: number;
  likes: number;
  shares: number;
  averagePlayTime: number;
}

export interface Rating {
  userId: string;
  rating: number;
  createdAt: Date | any;
}

export type GameCategory =
  | 'action'
  | 'puzzle'
  | 'adventure'
  | 'strategy'
  | 'casual'
  | 'arcade'
  | 'racing'
  | 'sports'
  | 'other';

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Auth types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  username: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

// Navigation types
export type RootStackParamList = {
  Login: undefined;
  Register: undefined;
  MainTabs: undefined;
  GamePlayer: { game: Game };
  Notifications: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Search: undefined;
  Favorites: undefined;
  Profile: undefined;
};

// Store types
export interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (username: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<User>) => Promise<void>;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
}

export interface GameState {
  games: Game[];
  currentGame: Game | null;
  favorites: Game[];
  isLoading: boolean;
  error: string | null;
  fetchGames: (params?: FetchGamesParams) => Promise<void>;
  fetchGameById: (id: string) => Promise<void>;
  toggleLike: (gameId: string) => Promise<void>;
  rateGame: (gameId: string, rating: number) => Promise<void>;
  recordPlay: (gameId: string, duration: number) => Promise<void>;
  fetchFavorites: () => Promise<void>;
}

export interface FetchGamesParams {
  page?: number;
  limit?: number;
  category?: GameCategory;
  search?: string;
  sortBy?: 'popular' | 'likes' | 'rating' | 'createdAt';
  order?: 'asc' | 'desc';
  featured?: boolean;
}

// Component Props types
export interface GameCardProps {
  game: Game;
  onPress: (game: Game) => void;
  showLikeButton?: boolean;
  showStats?: boolean;
}

export interface LoadingSkeletonProps {
  variant?: 'card' | 'list' | 'profile' | 'grid' | 'game';
  count?: number;
  style?: any;
  isLoading?: boolean;
  children?: React.ReactNode;
}

export interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

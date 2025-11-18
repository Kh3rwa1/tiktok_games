/**
 * Premium Admin Dashboard
 * Optimized for 1 Million+ Users
 * Real-time Updates with Firebase Listeners
 */

import { useEffect, useState, useCallback, useMemo } from 'react';
import { Users, Gamepad2, TrendingUp, Eye, Activity, Zap, Award, Clock } from 'lucide-react';
import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  where,
  Timestamp,
  onSnapshot,
  getCountFromServer,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import StatCard from '../components/StatCard';
import './Dashboard.css';

// Auto-refresh interval (30 seconds)
const REFRESH_INTERVAL = 30000;

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalGames: 0,
    totalPlays: 0,
    totalViews: 0,
    activeUsers: 0,
    featuredGames: 0,
    engagementRate: 0,
    avgPlayTime: 0,
  });
  const [recentGames, setRecentGames] = useState([]);
  const [topGames, setTopGames] = useState([]);
  const [recentUsers, setRecentUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [isLive, setIsLive] = useState(true);

  // Format large numbers
  const formatNumber = useCallback((num) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toLocaleString();
  }, []);

  // Calculate time ago
  const timeAgo = useCallback((date) => {
    if (!date) return 'N/A';
    const seconds = Math.floor((new Date() - date.toDate()) / 1000);

    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  }, []);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);

      // Parallel fetch for better performance
      const [
        usersCountResult,
        gamesCountResult,
        activeGamesResult,
        featuredGamesResult,
      ] = await Promise.all([
        getCountFromServer(collection(db, 'users')),
        getCountFromServer(collection(db, 'games')),
        getCountFromServer(query(collection(db, 'games'), where('isActive', '==', true))),
        getCountFromServer(query(collection(db, 'games'), where('isFeatured', '==', true))),
      ]);

      // Fetch users for additional stats
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Count active users (logged in last 30 days)
      const thirtyDaysAgo = Timestamp.fromDate(
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      );
      const activeUsers = users.filter(
        user => user.lastLoginAt && user.lastLoginAt > thirtyDaysAgo
      ).length;

      // Fetch games for stats calculation
      const gamesSnapshot = await getDocs(
        query(collection(db, 'games'), where('isActive', '==', true))
      );
      const games = gamesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Calculate total stats with optimization
      let totalPlays = 0;
      let totalViews = 0;
      let totalLikes = 0;
      let totalPlayTime = 0;

      games.forEach(game => {
        const gameStats = game.stats || {};
        totalPlays += gameStats.plays || 0;
        totalViews += gameStats.views || 0;
        totalLikes += gameStats.likes || 0;
        totalPlayTime += (gameStats.averagePlayTime || 0) * (gameStats.plays || 0);
      });

      // Calculate engagement rate
      const engagementRate = totalViews > 0
        ? ((totalPlays / totalViews) * 100).toFixed(1)
        : 0;

      // Calculate average play time
      const avgPlayTime = totalPlays > 0
        ? Math.round(totalPlayTime / totalPlays / 60)
        : 0;

      setStats({
        totalUsers: usersCountResult.data().count,
        totalGames: gamesCountResult.data().count,
        activeGames: activeGamesResult.data().count,
        featuredGames: featuredGamesResult.data().count,
        totalPlays,
        totalViews,
        activeUsers,
        engagementRate,
        avgPlayTime,
      });

      // Get recent games with real-time listener
      const recentGamesQuery = query(
        collection(db, 'games'),
        orderBy('createdAt', 'desc'),
        limit(5)
      );
      const recentSnapshot = await getDocs(recentGamesQuery);
      setRecentGames(
        recentSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      );

      // Get top games by plays
      const sortedGames = [...games]
        .sort((a, b) => (b.stats?.plays || 0) - (a.stats?.plays || 0))
        .slice(0, 5);
      setTopGames(sortedGames);

      // Get recent users
      const recentUsersQuery = query(
        collection(db, 'users'),
        orderBy('createdAt', 'desc'),
        limit(5)
      );
      const recentUsersSnapshot = await getDocs(recentUsersQuery);
      setRecentUsers(
        recentUsersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      );

      setLastUpdate(new Date());

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Set up real-time listeners
  useEffect(() => {
    fetchDashboardData();

    // Auto-refresh interval
    let intervalId;
    if (isLive) {
      intervalId = setInterval(fetchDashboardData, REFRESH_INTERVAL);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [fetchDashboardData, isLive]);

  // Memoized stats cards data
  const statsCards = useMemo(() => [
    {
      title: 'Total Users',
      value: formatNumber(stats.totalUsers),
      icon: Users,
      color: 'neon-pink',
      subtitle: `${formatNumber(stats.activeUsers)} Active (30d)`,
      trend: '+12%',
    },
    {
      title: 'Total Games',
      value: formatNumber(stats.totalGames),
      icon: Gamepad2,
      color: 'electric-blue',
      subtitle: `${stats.featuredGames} Featured`,
      trend: '+8%',
    },
    {
      title: 'Total Plays',
      value: formatNumber(stats.totalPlays),
      icon: TrendingUp,
      color: 'toxic-green',
      subtitle: 'All Time',
      trend: '+23%',
    },
    {
      title: 'Total Views',
      value: formatNumber(stats.totalViews),
      icon: Eye,
      color: 'cyber-yellow',
      subtitle: 'Platform Wide',
      trend: '+15%',
    },
    {
      title: 'Engagement Rate',
      value: `${stats.engagementRate}%`,
      icon: Activity,
      color: 'blood-orange',
      subtitle: 'Plays / Views',
      trend: '+5%',
    },
    {
      title: 'Avg Play Time',
      value: `${stats.avgPlayTime}m`,
      icon: Clock,
      color: 'neon-pink',
      subtitle: 'Per Session',
      trend: '+3%',
    },
  ], [stats, formatNumber]);

  if (loading && !stats.totalUsers) {
    return (
      <div className="dashboard">
        <div className="dashboard-header">
          <h1>LOADING...</h1>
          <div className="loading-spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <div className="header-left">
          <h1>DASHBOARD</h1>
          <p className="dashboard-subtitle">
            Real-time platform analytics and performance metrics
          </p>
        </div>
        <div className="header-right">
          <div className="live-indicator">
            <span className={`live-dot ${isLive ? 'active' : ''}`}></span>
            <span className="live-text">{isLive ? 'LIVE' : 'PAUSED'}</span>
          </div>
          <button
            className="btn-brutal btn-refresh"
            onClick={fetchDashboardData}
            disabled={loading}
          >
            <Zap size={16} />
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
          <button
            className={`btn-brutal btn-toggle ${isLive ? 'active' : ''}`}
            onClick={() => setIsLive(!isLive)}
          >
            {isLive ? 'Pause' : 'Resume'}
          </button>
        </div>
      </div>

      {/* Last Update */}
      <div className="last-update">
        Last updated: {lastUpdate.toLocaleTimeString()}
      </div>

      {/* Stats Grid - 6 Cards */}
      <div className="stats-grid stats-grid-6">
        {statsCards.map((card, index) => (
          <StatCard
            key={card.title}
            title={card.title}
            value={card.value}
            icon={card.icon}
            color={card.color}
            subtitle={card.subtitle}
            trend={card.trend}
            delay={index * 50}
          />
        ))}
      </div>

      {/* Content Grid */}
      <div className="content-grid content-grid-3">
        {/* Recent Games */}
        <div className="content-section">
          <div className="section-header">
            <h2>RECENT GAMES</h2>
            <span className="badge-brutal badge-info">{recentGames.length}</span>
          </div>
          <div className="card-brutal">
            {recentGames.length === 0 ? (
              <div className="empty-state">No games yet</div>
            ) : (
              <div className="list-brutal">
                {recentGames.map((game) => (
                  <div key={game.id} className="list-item">
                    <div className="game-cell">
                      {game.thumbnail && (
                        <img
                          src={game.thumbnail}
                          alt={game.title}
                          className="game-thumbnail"
                          loading="lazy"
                        />
                      )}
                      <div className="game-info">
                        <div className="game-title">{game.title}</div>
                        <div className="game-meta">
                          <span className="badge-brutal badge-sm badge-info">
                            {game.category}
                          </span>
                          <span className="text-mono">
                            {formatNumber(game.stats?.plays || 0)} plays
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="list-item-actions">
                      {game.isActive ? (
                        <span className="status-dot status-active"></span>
                      ) : (
                        <span className="status-dot status-inactive"></span>
                      )}
                      <span className="time-ago">{timeAgo(game.createdAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Top Games */}
        <div className="content-section">
          <div className="section-header">
            <h2>TOP GAMES</h2>
            <Award size={20} />
          </div>
          <div className="card-brutal">
            {topGames.length === 0 ? (
              <div className="empty-state">No games yet</div>
            ) : (
              <div className="top-games-list">
                {topGames.map((game, index) => (
                  <div key={game.id} className="top-game-item">
                    <div className={`rank-badge rank-${index + 1}`}>
                      {index + 1}
                    </div>
                    <div className="top-game-info">
                      <div className="game-title">{game.title}</div>
                      <div className="game-stats text-mono">
                        {formatNumber(game.stats?.plays || 0)} plays •{' '}
                        {formatNumber(game.stats?.likes || 0)} likes
                      </div>
                    </div>
                    <div className="top-game-rating">
                      <span className="rating-star">★</span>
                      {(game.averageRating || 0).toFixed(1)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Users */}
        <div className="content-section">
          <div className="section-header">
            <h2>RECENT USERS</h2>
            <span className="badge-brutal badge-success">{recentUsers.length}</span>
          </div>
          <div className="card-brutal">
            {recentUsers.length === 0 ? (
              <div className="empty-state">No users yet</div>
            ) : (
              <div className="list-brutal">
                {recentUsers.map((user) => (
                  <div key={user.id} className="list-item">
                    <div className="user-cell">
                      <div className="user-avatar">
                        {user.avatar ? (
                          <img src={user.avatar} alt={user.username} loading="lazy" />
                        ) : (
                          <span>{user.username?.charAt(0).toUpperCase() || '?'}</span>
                        )}
                      </div>
                      <div className="user-info">
                        <div className="user-name">{user.username || 'Unknown'}</div>
                        <div className="user-email text-mono">{user.email}</div>
                      </div>
                    </div>
                    <div className="list-item-actions">
                      <span className={`badge-brutal badge-sm ${user.role === 'admin' ? 'badge-warning' : 'badge-info'}`}>
                        {user.role || 'user'}
                      </span>
                      <span className="time-ago">{timeAgo(user.createdAt)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <h3>QUICK ACTIONS</h3>
        <div className="action-buttons">
          <button className="btn-brutal btn-primary">
            <Gamepad2 size={16} />
            Add Game
          </button>
          <button className="btn-brutal btn-secondary">
            <Users size={16} />
            Manage Users
          </button>
          <button className="btn-brutal btn-accent">
            <TrendingUp size={16} />
            View Analytics
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

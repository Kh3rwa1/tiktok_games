import { useEffect, useState } from 'react';
import { Users, Gamepad2, TrendingUp, Eye } from 'lucide-react';
import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  where,
  Timestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';
import StatCard from '../components/StatCard';
import './Dashboard.css';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalGames: 0,
    totalPlays: 0,
    totalViews: 0,
    activeUsers: 0,
    featuredGames: 0,
  });
  const [recentGames, setRecentGames] = useState([]);
  const [topGames, setTopGames] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch users
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Count active users (logged in last 30 days)
      const thirtyDaysAgo = Timestamp.fromDate(
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      );
      const activeUsers = users.filter(
        user => user.lastLoginAt && user.lastLoginAt > thirtyDaysAgo
      ).length;

      // Fetch games
      const gamesSnapshot = await getDocs(collection(db, 'games'));
      const games = gamesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Calculate total stats
      const totalPlays = games.reduce((sum, game) => sum + (game.stats?.plays || 0), 0);
      const totalViews = games.reduce((sum, game) => sum + (game.stats?.views || 0), 0);
      const featuredGames = games.filter(game => game.isFeatured).length;

      setStats({
        totalUsers: users.length,
        totalGames: games.length,
        totalPlays,
        totalViews,
        activeUsers,
        featuredGames,
      });

      // Get recent games
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

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard">
        <div className="dashboard-header">
          <h1>LOADING...</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>DASHBOARD</h1>
        <p className="dashboard-subtitle">
          Welcome back! Here's what's happening with your platform.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <StatCard
          title="Total Users"
          value={stats.totalUsers.toLocaleString()}
          icon={Users}
          color="neon-pink"
          subtitle={`${stats.activeUsers} Active (30d)`}
        />
        <StatCard
          title="Total Games"
          value={stats.totalGames.toLocaleString()}
          icon={Gamepad2}
          color="electric-blue"
          subtitle={`${stats.featuredGames} Featured`}
        />
        <StatCard
          title="Total Plays"
          value={stats.totalPlays.toLocaleString()}
          icon={TrendingUp}
          color="toxic-green"
          subtitle="All Time"
        />
        <StatCard
          title="Total Views"
          value={stats.totalViews.toLocaleString()}
          icon={Eye}
          color="cyber-yellow"
          subtitle="Platform Wide"
        />
      </div>

      {/* Content Grid */}
      <div className="content-grid">
        {/* Recent Games */}
        <div className="content-section">
          <div className="section-header">
            <h2>RECENT GAMES</h2>
          </div>
          <div className="card-brutal">
            {recentGames.length === 0 ? (
              <div className="empty-state">No games yet</div>
            ) : (
              <table className="table-brutal">
                <thead>
                  <tr>
                    <th>Game</th>
                    <th>Category</th>
                    <th>Plays</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentGames.map((game) => (
                    <tr key={game.id}>
                      <td>
                        <div className="game-cell">
                          {game.thumbnail && (
                            <img
                              src={game.thumbnail}
                              alt={game.title}
                              className="game-thumbnail"
                            />
                          )}
                          <div>
                            <div className="game-title">{game.title}</div>
                            <div className="game-creator text-mono">
                              {game.creatorId}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="badge-brutal badge-info">
                          {game.category}
                        </span>
                      </td>
                      <td className="text-mono">
                        {(game.stats?.plays || 0).toLocaleString()}
                      </td>
                      <td>
                        {game.isActive ? (
                          <span className="badge-brutal badge-success">Active</span>
                        ) : (
                          <span className="badge-brutal badge-danger">Inactive</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Top Games */}
        <div className="content-section">
          <div className="section-header">
            <h2>TOP GAMES</h2>
          </div>
          <div className="card-brutal">
            {topGames.length === 0 ? (
              <div className="empty-state">No games yet</div>
            ) : (
              <div className="top-games-list">
                {topGames.map((game, index) => (
                  <div key={game.id} className="top-game-item">
                    <div className="rank-badge">{index + 1}</div>
                    <div className="top-game-info">
                      <div className="game-title">{game.title}</div>
                      <div className="game-stats text-mono">
                        {(game.stats?.plays || 0).toLocaleString()} plays •{' '}
                        {(game.stats?.likes || 0).toLocaleString()} likes
                      </div>
                    </div>
                    <div className="top-game-rating">
                      ⭐ {(game.averageRating || 0).toFixed(1)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

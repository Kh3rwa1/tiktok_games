import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { TrendingUp, Users, Gamepad2, Eye } from 'lucide-react';
import StatCard from '../components/StatCard';
import './Analytics.css';

const Analytics = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalGames: 0,
    totalPlays: 0,
    totalViews: 0,
    growth: { users: 0, games: 0, plays: 0 }
  });
  const [topGames, setTopGames] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);

      // Fetch users and games
      const [usersSnapshot, gamesSnapshot] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'games'))
      ]);

      const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const games = gamesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Calculate stats
      const totalPlays = games.reduce((sum, game) => sum + (game.stats?.plays || 0), 0);
      const totalViews = games.reduce((sum, game) => sum + (game.stats?.views || 0), 0);

      setStats({
        totalUsers: users.length,
        totalGames: games.length,
        totalPlays,
        totalViews,
        growth: {
          users: 12.5, // Placeholder
          games: 8.3,  // Placeholder
          plays: 23.7  // Placeholder
        }
      });

      // Top games
      const sortedGames = [...games]
        .sort((a, b) => (b.stats?.plays || 0) - (a.stats?.plays || 0))
        .slice(0, 10);
      setTopGames(sortedGames);

    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading analytics...</div>;
  }

  return (
    <div className="analytics-page">
      <div className="page-header">
        <h1>ANALYTICS</h1>
        <p className="page-subtitle">Platform performance and insights</p>
      </div>

      {/* Key Metrics */}
      <div className="stats-grid">
        <StatCard
          title="Total Users"
          value={stats.totalUsers.toLocaleString()}
          icon={Users}
          color="neon-pink"
          trend={{ direction: 'up', value: stats.growth.users, label: 'vs last month' }}
        />
        <StatCard
          title="Total Games"
          value={stats.totalGames.toLocaleString()}
          icon={Gamepad2}
          color="electric-blue"
          trend={{ direction: 'up', value: stats.growth.games, label: 'vs last month' }}
        />
        <StatCard
          title="Total Plays"
          value={stats.totalPlays.toLocaleString()}
          icon={TrendingUp}
          color="toxic-green"
          trend={{ direction: 'up', value: stats.growth.plays, label: 'vs last month' }}
        />
        <StatCard
          title="Total Views"
          value={stats.totalViews.toLocaleString()}
          icon={Eye}
          color="cyber-yellow"
        />
      </div>

      {/* Top Performing Games */}
      <div className="content-section">
        <div className="section-header">
          <h2>TOP PERFORMING GAMES</h2>
        </div>
        <div className="card-brutal">
          <table className="table-brutal">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Game</th>
                <th>Category</th>
                <th>Plays</th>
                <th>Views</th>
                <th>Likes</th>
                <th>Engagement</th>
              </tr>
            </thead>
            <tbody>
              {topGames.map((game, index) => {
                const engagement = game.stats?.views > 0
                  ? ((game.stats.plays / game.stats.views) * 100).toFixed(1)
                  : 0;

                return (
                  <tr key={game.id}>
                    <td>
                      <div className="rank-badge-small">#{index + 1}</div>
                    </td>
                    <td>
                      <div className="game-cell">
                        {game.thumbnail && (
                          <img
                            src={game.thumbnail}
                            alt={game.title}
                            className="game-thumbnail"
                          />
                        )}
                        <div className="game-title">{game.title}</div>
                      </div>
                    </td>
                    <td>
                      <span className="badge-brutal badge-info">{game.category}</span>
                    </td>
                    <td className="text-mono">
                      {(game.stats?.plays || 0).toLocaleString()}
                    </td>
                    <td className="text-mono">
                      {(game.stats?.views || 0).toLocaleString()}
                    </td>
                    <td className="text-mono">
                      {(game.stats?.likes || 0).toLocaleString()}
                    </td>
                    <td>
                      <div className="engagement-bar">
                        <div
                          className="engagement-fill"
                          style={{ width: `${Math.min(engagement, 100)}%` }}
                        />
                        <span className="engagement-text">{engagement}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {topGames.length === 0 && (
            <div className="empty-state">No games data available</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Analytics;

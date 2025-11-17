import { useEffect, useState } from 'react';
import {
  collection,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../config/firebase';
import { Plus, Edit2, Trash2, Search, Upload } from 'lucide-react';
import toast from 'react-hot-toast';
import './Games.css';

const Games = () => {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingGame, setEditingGame] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'action',
    difficulty: 'medium',
    gameUrl: '',
    thumbnail: '',
    tags: '',
    isFeatured: false,
    isActive: true
  });
  const [uploading, setUploading] = useState(false);

  const categories = ['all', 'action', 'puzzle', 'adventure', 'strategy', 'casual', 'arcade', 'racing', 'sports'];

  useEffect(() => {
    fetchGames();
  }, []);

  const fetchGames = async () => {
    try {
      setLoading(true);
      const gamesSnapshot = await getDocs(collection(db, 'games'));
      const gamesData = gamesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setGames(gamesData);
    } catch (error) {
      console.error('Error fetching games:', error);
      toast.error('Failed to fetch games');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this game?')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'games', id));
      setGames(games.filter(game => game.id !== id));
      toast.success('Game deleted successfully!');
    } catch (error) {
      console.error('Error deleting game:', error);
      toast.error('Failed to delete game');
    }
  };

  const handleEdit = (game) => {
    setEditingGame(game);
    setFormData({
      title: game.title,
      description: game.description,
      category: game.category,
      difficulty: game.difficulty,
      gameUrl: game.gameUrl,
      thumbnail: game.thumbnail,
      tags: game.tags?.join(', ') || '',
      isFeatured: game.isFeatured,
      isActive: game.isActive
    });
    setShowModal(true);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setUploading(true);
      const storageRef = ref(storage, `thumbnails/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      setFormData({ ...formData, thumbnail: url });
      toast.success('Image uploaded!');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const gameData = {
        ...formData,
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean),
        updatedAt: serverTimestamp()
      };

      if (editingGame) {
        // Update existing game
        await updateDoc(doc(db, 'games', editingGame.id), gameData);
        setGames(games.map(g => g.id === editingGame.id ? { ...g, ...gameData } : g));
        toast.success('Game updated successfully!');
      } else {
        // Create new game
        const newGameData = {
          ...gameData,
          createdAt: serverTimestamp(),
          stats: {
            views: 0,
            plays: 0,
            likes: 0,
            shares: 0
          },
          averageRating: 0,
          ratings: [],
          likedBy: []
        };
        const docRef = await addDoc(collection(db, 'games'), newGameData);
        setGames([...games, { id: docRef.id, ...newGameData }]);
        toast.success('Game created successfully!');
      }

      setShowModal(false);
      setEditingGame(null);
      resetForm();
    } catch (error) {
      console.error('Error saving game:', error);
      toast.error('Failed to save game');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      category: 'action',
      difficulty: 'medium',
      gameUrl: '',
      thumbnail: '',
      tags: '',
      isFeatured: false,
      isActive: true
    });
  };

  const filteredGames = games.filter(game => {
    const matchesSearch = game.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || game.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="games-page">
      <div className="page-header">
        <div>
          <h1>GAMES MANAGEMENT</h1>
          <p className="page-subtitle">Manage all games on your platform</p>
        </div>
        <button
          className="btn-brutal btn-primary"
          onClick={() => {
            setEditingGame(null);
            resetForm();
            setShowModal(true);
          }}
        >
          <Plus size={20} />
          Add Game
        </button>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="search-box">
          <Search size={20} />
          <input
            type="text"
            className="input-brutal"
            placeholder="Search games..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="category-filters">
          {categories.map(cat => (
            <button
              key={cat}
              className={`btn-brutal ${filterCategory === cat ? 'btn-primary' : ''}`}
              onClick={() => setFilterCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Games Table */}
      {loading ? (
        <div className="loading">Loading games...</div>
      ) : (
        <div className="card-brutal">
          <table className="table-brutal">
            <thead>
              <tr>
                <th>Game</th>
                <th>Category</th>
                <th>Difficulty</th>
                <th>Stats</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredGames.map(game => (
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
                        <div className="game-description">{game.description?.slice(0, 50)}...</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="badge-brutal badge-info">{game.category}</span>
                  </td>
                  <td>
                    <span className="badge-brutal badge-warning">{game.difficulty}</span>
                  </td>
                  <td className="text-mono">
                    <div>{(game.stats?.plays || 0).toLocaleString()} plays</div>
                    <div>{(game.stats?.likes || 0).toLocaleString()} likes</div>
                  </td>
                  <td>
                    {game.isFeatured && (
                      <span className="badge-brutal badge-warning">Featured</span>
                    )}
                    {game.isActive ? (
                      <span className="badge-brutal badge-success">Active</span>
                    ) : (
                      <span className="badge-brutal badge-danger">Inactive</span>
                    )}
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="btn-brutal btn-sm btn-secondary"
                        onClick={() => handleEdit(game)}
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        className="btn-brutal btn-sm btn-danger"
                        onClick={() => handleDelete(game.id)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredGames.length === 0 && (
            <div className="empty-state">No games found</div>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingGame ? 'Edit Game' : 'Add New Game'}</h2>
              <button className="btn-brutal btn-sm" onClick={() => setShowModal(false)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="game-form">
              <div className="form-group">
                <label>Game Title *</label>
                <input
                  type="text"
                  className="input-brutal"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Description *</label>
                <textarea
                  className="input-brutal"
                  rows="3"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Category *</label>
                  <select
                    className="input-brutal"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
                    {categories.filter(c => c !== 'all').map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Difficulty *</label>
                  <select
                    className="input-brutal"
                    value={formData.difficulty}
                    onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Game URL *</label>
                <input
                  type="url"
                  className="input-brutal"
                  value={formData.gameUrl}
                  onChange={(e) => setFormData({ ...formData, gameUrl: e.target.value })}
                  required
                  placeholder="https://example.com/game.html"
                />
              </div>

              <div className="form-group">
                <label>Thumbnail Image</label>
                <div className="upload-section">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    disabled={uploading}
                    id="thumbnail-upload"
                    style={{ display: 'none' }}
                  />
                  <label htmlFor="thumbnail-upload" className="btn-brutal btn-secondary">
                    <Upload size={20} />
                    {uploading ? 'Uploading...' : 'Upload Image'}
                  </label>
                  {formData.thumbnail && (
                    <img src={formData.thumbnail} alt="Preview" className="thumbnail-preview" />
                  )}
                </div>
              </div>

              <div className="form-group">
                <label>Tags (comma separated)</label>
                <input
                  type="text"
                  className="input-brutal"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="multiplayer, 3d, shooter"
                />
              </div>

              <div className="form-checkboxes">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.isFeatured}
                    onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
                  />
                  <span>Featured Game</span>
                </label>

                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  />
                  <span>Active</span>
                </label>
              </div>

              <div className="form-actions">
                <button type="button" className="btn-brutal" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-brutal btn-primary">
                  {editingGame ? 'Update Game' : 'Create Game'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Games;

import { useEffect, useState } from 'react';
import { collection, getDocs, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Search, Edit2, Trash2, Shield, User } from 'lucide-react';
import toast from 'react-hot-toast';
import './Users.css';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const usersData = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsers(usersData);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this user?')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'users', id));
      setUsers(users.filter(user => user.id !== id));
      toast.success('User deleted successfully!');
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Failed to delete user');
    }
  };

  const toggleRole = async (user) => {
    try {
      const newRole = user.role === 'admin' ? 'user' : 'admin';
      await updateDoc(doc(db, 'users', user.id), { role: newRole });
      setUsers(users.map(u => u.id === user.id ? { ...u, role: newRole } : u));
      toast.success(`User role updated to ${newRole}!`);
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('Failed to update role');
    }
  };

  const toggleActive = async (user) => {
    try {
      const newStatus = !user.isActive;
      await updateDoc(doc(db, 'users', user.id), { isActive: newStatus });
      setUsers(users.map(u => u.id === user.id ? { ...u, isActive: newStatus } : u));
      toast.success(`User ${newStatus ? 'activated' : 'deactivated'}!`);
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch =
      user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="users-page">
      <div className="page-header">
        <div>
          <h1>USERS MANAGEMENT</h1>
          <p className="page-subtitle">Manage all users on your platform</p>
        </div>
        <div className="stats-summary">
          <div className="stat-item">
            <User size={24} />
            <div>
              <div className="stat-value">{users.filter(u => u.role === 'user').length}</div>
              <div className="stat-label">Users</div>
            </div>
          </div>
          <div className="stat-item">
            <Shield size={24} />
            <div>
              <div className="stat-value">{users.filter(u => u.role === 'admin').length}</div>
              <div className="stat-label">Admins</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="search-box">
          <Search size={20} />
          <input
            type="text"
            className="input-brutal"
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="role-filters">
          <button
            className={`btn-brutal ${filterRole === 'all' ? 'btn-primary' : ''}`}
            onClick={() => setFilterRole('all')}
          >
            All
          </button>
          <button
            className={`btn-brutal ${filterRole === 'user' ? 'btn-primary' : ''}`}
            onClick={() => setFilterRole('user')}
          >
            Users
          </button>
          <button
            className={`btn-brutal ${filterRole === 'admin' ? 'btn-primary' : ''}`}
            onClick={() => setFilterRole('admin')}
          >
            Admins
          </button>
        </div>
      </div>

      {/* Users Table */}
      {loading ? (
        <div className="loading">Loading users...</div>
      ) : (
        <div className="card-brutal">
          <table className="table-brutal">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Role</th>
                <th>Stats</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map(user => (
                <tr key={user.id}>
                  <td>
                    <div className="user-cell">
                      <div className="user-avatar">
                        {user.username?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
                      </div>
                      <div>
                        <div className="user-name">{user.username || 'Unknown'}</div>
                        <div className="user-id text-mono">{user.uid?.slice(0, 8)}...</div>
                      </div>
                    </div>
                  </td>
                  <td className="text-mono">{user.email}</td>
                  <td>
                    {user.role === 'admin' ? (
                      <span className="badge-brutal badge-danger">
                        <Shield size={12} /> Admin
                      </span>
                    ) : (
                      <span className="badge-brutal badge-info">
                        <User size={12} /> User
                      </span>
                    )}
                  </td>
                  <td className="text-mono">
                    <div>{user.stats?.totalGamesPlayed || 0} games played</div>
                    <div>{user.favoriteGames?.length || 0} favorites</div>
                  </td>
                  <td>
                    {user.isActive !== false ? (
                      <span className="badge-brutal badge-success">Active</span>
                    ) : (
                      <span className="badge-brutal badge-danger">Inactive</span>
                    )}
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="btn-brutal btn-sm btn-secondary"
                        onClick={() => toggleRole(user)}
                        title={`Make ${user.role === 'admin' ? 'User' : 'Admin'}`}
                      >
                        <Shield size={16} />
                      </button>
                      <button
                        className="btn-brutal btn-sm btn-warning"
                        onClick={() => toggleActive(user)}
                        title={user.isActive ? 'Deactivate' : 'Activate'}
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        className="btn-brutal btn-sm btn-danger"
                        onClick={() => handleDelete(user.id)}
                        title="Delete User"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredUsers.length === 0 && (
            <div className="empty-state">No users found</div>
          )}
        </div>
      )}
    </div>
  );
};

export default Users;

import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Gamepad2,
  Users,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X
} from 'lucide-react';
import useAuthStore from '../store/authStore';
import './Layout.css';

const Navigation = ({ isMobile, onClose }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, user } = useAuthStore();

  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/games', icon: Gamepad2, label: 'Games' },
    { path: '/users', icon: Users, label: 'Users' },
    { path: '/analytics', icon: BarChart3, label: 'Analytics' },
    { path: '/settings', icon: Settings, label: 'Settings' },
  ];

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <nav className={`sidebar ${isMobile ? 'sidebar-mobile' : ''}`}>
      <div className="sidebar-header">
        <h1 className="sidebar-title">
          <Gamepad2 size={32} />
          <span>ADMIN</span>
        </h1>
        {isMobile && (
          <button className="btn-brutal btn-sm" onClick={onClose}>
            <X size={20} />
          </button>
        )}
      </div>

      <div className="sidebar-user">
        <div className="user-avatar">
          {user?.username?.[0]?.toUpperCase() || 'A'}
        </div>
        <div className="user-info">
          <div className="user-name">{user?.username || 'Admin'}</div>
          <div className="user-role">SUPER ADMIN</div>
        </div>
      </div>

      <ul className="nav-list">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;

          return (
            <li key={item.path}>
              <Link
                to={item.path}
                className={`nav-link ${isActive ? 'nav-link-active' : ''}`}
                onClick={isMobile ? onClose : undefined}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>

      <button className="btn-brutal btn-danger logout-btn" onClick={handleSignOut}>
        <LogOut size={20} />
        <span>Sign Out</span>
      </button>
    </nav>
  );
};

const Layout = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="layout">
      <Navigation isMobile={false} />

      {/* Mobile Menu Button */}
      <button
        className="mobile-menu-btn btn-brutal"
        onClick={() => setSidebarOpen(true)}
      >
        <Menu size={24} />
      </button>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <>
          <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
          <Navigation isMobile={true} onClose={() => setSidebarOpen(false)} />
        </>
      )}

      <main className="main-content">
        {children}
      </main>
    </div>
  );
};

export default Layout;

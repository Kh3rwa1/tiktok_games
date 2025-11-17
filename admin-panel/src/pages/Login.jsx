import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gamepad2, Lock, Mail } from 'lucide-react';
import useAuthStore from '../store/authStore';
import toast from 'react-hot-toast';
import './Login.css';

const Login = () => {
  const navigate = useNavigate();
  const { signIn, loading, error, clearError } = useAuthStore();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();

    try {
      await signIn(formData.email, formData.password);
      toast.success('Welcome back, admin!');
      navigate('/');
    } catch (error) {
      toast.error(error.message || 'Login failed');
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <div className="login-logo">
            <Gamepad2 size={64} />
          </div>
          <h1>ADMIN PANEL</h1>
          <p>TikTok Games Platform</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div className="error-message">
              ⚠️ {error}
            </div>
          )}

          <div className="form-group">
            <label>
              <Mail size={20} />
              Email Address
            </label>
            <input
              type="email"
              className="input-brutal"
              placeholder="admin@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label>
              <Lock size={20} />
              Password
            </label>
            <input
              type="password"
              className="input-brutal"
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            className="btn-brutal btn-primary w-full"
            disabled={loading}
          >
            {loading ? 'SIGNING IN...' : 'SIGN IN'}
          </button>
        </form>

        <div className="login-footer">
          <p>Admin access only • Unauthorized access will be logged</p>
        </div>
      </div>

      <div className="login-background">
        <div className="bg-shape bg-shape-1"></div>
        <div className="bg-shape bg-shape-2"></div>
        <div className="bg-shape bg-shape-3"></div>
      </div>
    </div>
  );
};

export default Login;

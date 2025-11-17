import { useState } from 'react';
import { Shield, Bell, Palette, Database } from 'lucide-react';
import toast from 'react-hot-toast';
import './Settings.css';

const Settings = () => {
  const [settings, setSettings] = useState({
    siteName: 'TikTok Games',
    maintenanceMode: false,
    allowRegistration: true,
    emailNotifications: true,
    pushNotifications: false,
    maxFileSize: 10,
    cacheEnabled: true,
  });

  const handleSave = (e) => {
    e.preventDefault();
    // TODO: Implement settings save to backend
    toast.success('Settings saved successfully!');
  };

  return (
    <div className="settings-page">
      <div className="page-header">
        <h1>SETTINGS</h1>
        <p className="page-subtitle">Configure your platform settings</p>
      </div>

      <div className="settings-grid">
        {/* General Settings */}
        <div className="card-brutal settings-card">
          <div className="settings-header">
            <Shield size={24} />
            <h3>GENERAL</h3>
          </div>

          <div className="settings-body">
            <div className="form-group">
              <label>Site Name</label>
              <input
                type="text"
                className="input-brutal"
                value={settings.siteName}
                onChange={(e) => setSettings({ ...settings, siteName: e.target.value })}
              />
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <div className="setting-title">Maintenance Mode</div>
                <div className="setting-description">Temporarily disable the platform</div>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.maintenanceMode}
                  onChange={(e) => setSettings({ ...settings, maintenanceMode: e.target.checked })}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <div className="setting-title">Allow Registration</div>
                <div className="setting-description">Enable new user signups</div>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.allowRegistration}
                  onChange={(e) => setSettings({ ...settings, allowRegistration: e.target.checked })}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div className="card-brutal settings-card">
          <div className="settings-header">
            <Bell size={24} />
            <h3>NOTIFICATIONS</h3>
          </div>

          <div className="settings-body">
            <div className="setting-item">
              <div className="setting-info">
                <div className="setting-title">Email Notifications</div>
                <div className="setting-description">Send email updates to admins</div>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.emailNotifications}
                  onChange={(e) => setSettings({ ...settings, emailNotifications: e.target.checked })}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <div className="setting-title">Push Notifications</div>
                <div className="setting-description">Enable browser push notifications</div>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.pushNotifications}
                  onChange={(e) => setSettings({ ...settings, pushNotifications: e.target.checked })}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>
        </div>

        {/* Performance */}
        <div className="card-brutal settings-card">
          <div className="settings-header">
            <Database size={24} />
            <h3>PERFORMANCE</h3>
          </div>

          <div className="settings-body">
            <div className="form-group">
              <label>Max Upload Size (MB)</label>
              <input
                type="number"
                className="input-brutal"
                value={settings.maxFileSize}
                onChange={(e) => setSettings({ ...settings, maxFileSize: parseInt(e.target.value) })}
                min="1"
                max="100"
              />
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <div className="setting-title">Cache Enabled</div>
                <div className="setting-description">Enable caching for better performance</div>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={settings.cacheEnabled}
                  onChange={(e) => setSettings({ ...settings, cacheEnabled: e.target.checked })}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <div className="settings-actions">
        <button className="btn-brutal btn-primary" onClick={handleSave}>
          Save Settings
        </button>
      </div>
    </div>
  );
};

export default Settings;

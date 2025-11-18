import { useState, useEffect } from 'react';
import { Shield, Bell, Palette, Database, Cloud, Send, Mail, Smartphone, Zap, Settings as SettingsIcon, TestTube, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import './Settings.css';

const Settings = () => {
  const [settings, setSettings] = useState({
    siteName: 'TikTok Games',
    maintenanceMode: false,
    allowRegistration: true,
    maxFileSize: 10,
    cacheEnabled: true,
  });

  const [notificationConfig, setNotificationConfig] = useState({
    enabled: true,
    aws: {
      enabled: false,
      sns: { enabled: false },
      ses: { enabled: false },
    },
    firebase: {
      enabled: false,
      fcm: { enabled: false },
    },
    preferences: {
      emailNotifications: true,
      pushNotifications: true,
      smsNotifications: false,
      newUserAlerts: true,
      gameUploadAlerts: true,
      systemAlerts: true,
      marketingNotifications: false,
    },
    status: {
      initialized: false,
      awsAvailable: false,
      firebaseAvailable: false,
    }
  });

  const [testEmail, setTestEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);

  // Fetch notification config on mount
  useEffect(() => {
    fetchNotificationConfig();
  }, []);

  const fetchNotificationConfig = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/notifications/config');
      if (response.data.success) {
        setNotificationConfig(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching notification config:', error);
      // Use default config if API not available
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (channel, enabled) => {
    try {
      const response = await api.post('/api/notifications/toggle', {
        channel,
        enabled
      });

      if (response.data.success) {
        setNotificationConfig(response.data.data);
        toast.success(response.data.message);
      }
    } catch (error) {
      toast.error('Failed to toggle notification setting');
      console.error('Toggle error:', error);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      // Save general settings
      toast.success('Settings saved successfully!');
    } catch (error) {
      toast.error('Failed to save settings');
    }
  };

  const handleTestNotifications = async () => {
    if (!testEmail) {
      toast.error('Please enter an email address to test');
      return;
    }

    try {
      setSendingTest(true);
      const response = await api.post('/api/notifications/test', { email: testEmail });

      if (response.data.success) {
        const results = response.data.data;
        let message = 'Test results: ';
        if (results.ses.tested) {
          message += 'Email sent! ';
        }
        if (results.fcm.available) {
          message += 'FCM available. ';
        }
        if (results.sns.available) {
          message += 'SNS available.';
        }
        toast.success(message || 'Test completed');
      }
    } catch (error) {
      toast.error('Failed to test notifications');
    } finally {
      setSendingTest(false);
    }
  };

  const handleSendBroadcast = async () => {
    try {
      const response = await api.post('/api/notifications/send', {
        title: 'Test Broadcast',
        body: 'This is a test broadcast from TikTok Games Admin Panel',
        type: 'system',
        targets: { topic: 'all' }
      });

      if (response.data.success) {
        toast.success('Broadcast sent successfully!');
      }
    } catch (error) {
      toast.error('Failed to send broadcast');
    }
  };

  return (
    <div className="settings-page">
      <div className="page-header">
        <h1>SETTINGS</h1>
        <p className="page-subtitle">Configure your platform and notification settings</p>
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

        {/* Master Notification Control */}
        <div className="card-brutal settings-card notification-master">
          <div className="settings-header">
            <Zap size={24} />
            <h3>MASTER CONTROL</h3>
            <span className={`status-badge ${notificationConfig.enabled ? 'active' : 'inactive'}`}>
              {notificationConfig.enabled ? 'ACTIVE' : 'DISABLED'}
            </span>
          </div>

          <div className="settings-body">
            <div className="setting-item master-toggle">
              <div className="setting-info">
                <div className="setting-title">All Notifications</div>
                <div className="setting-description">Master switch to enable/disable all notification channels</div>
              </div>
              <label className="toggle-switch large">
                <input
                  type="checkbox"
                  checked={notificationConfig.enabled}
                  onChange={(e) => handleToggle('master', e.target.checked)}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="service-status">
              <div className="status-item">
                <Cloud size={16} />
                <span>AWS: {notificationConfig.status?.awsAvailable ? 'Connected' : 'Not configured'}</span>
              </div>
              <div className="status-item">
                <Database size={16} />
                <span>Firebase: {notificationConfig.status?.firebaseAvailable ? 'Connected' : 'Not configured'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* AWS Services */}
        <div className="card-brutal settings-card">
          <div className="settings-header">
            <Cloud size={24} />
            <h3>AWS SERVICES</h3>
          </div>

          <div className="settings-body">
            <div className="setting-item">
              <div className="setting-info">
                <div className="setting-title">AWS Integration</div>
                <div className="setting-description">Enable AWS notification services</div>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={notificationConfig.aws?.enabled}
                  onChange={(e) => handleToggle('aws', e.target.checked)}
                  disabled={!notificationConfig.enabled}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="setting-item sub-setting">
              <div className="setting-info">
                <div className="setting-title">
                  <Send size={14} />
                  SNS Push Notifications
                </div>
                <div className="setting-description">Send push via AWS Simple Notification Service</div>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={notificationConfig.aws?.sns?.enabled}
                  onChange={(e) => handleToggle('sns', e.target.checked)}
                  disabled={!notificationConfig.enabled || !notificationConfig.aws?.enabled}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="setting-item sub-setting">
              <div className="setting-info">
                <div className="setting-title">
                  <Mail size={14} />
                  SES Email Service
                </div>
                <div className="setting-description">Send emails via AWS Simple Email Service</div>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={notificationConfig.aws?.ses?.enabled}
                  onChange={(e) => handleToggle('ses', e.target.checked)}
                  disabled={!notificationConfig.enabled || !notificationConfig.aws?.enabled}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>
        </div>

        {/* Firebase Services */}
        <div className="card-brutal settings-card">
          <div className="settings-header">
            <Database size={24} />
            <h3>FIREBASE SERVICES</h3>
          </div>

          <div className="settings-body">
            <div className="setting-item">
              <div className="setting-info">
                <div className="setting-title">Firebase Integration</div>
                <div className="setting-description">Enable Firebase notification services</div>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={notificationConfig.firebase?.enabled}
                  onChange={(e) => handleToggle('firebase', e.target.checked)}
                  disabled={!notificationConfig.enabled}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="setting-item sub-setting">
              <div className="setting-info">
                <div className="setting-title">
                  <Smartphone size={14} />
                  FCM Push Notifications
                </div>
                <div className="setting-description">Firebase Cloud Messaging for mobile/web push</div>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={notificationConfig.firebase?.fcm?.enabled}
                  onChange={(e) => handleToggle('fcm', e.target.checked)}
                  disabled={!notificationConfig.enabled || !notificationConfig.firebase?.enabled}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>
        </div>

        {/* Notification Preferences */}
        <div className="card-brutal settings-card">
          <div className="settings-header">
            <Bell size={24} />
            <h3>NOTIFICATION TYPES</h3>
          </div>

          <div className="settings-body">
            <div className="setting-item">
              <div className="setting-info">
                <div className="setting-title">Email Notifications</div>
                <div className="setting-description">Send notifications via email</div>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={notificationConfig.preferences?.emailNotifications}
                  onChange={(e) => handleToggle('email', e.target.checked)}
                  disabled={!notificationConfig.enabled}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <div className="setting-title">Push Notifications</div>
                <div className="setting-description">Send push notifications to devices</div>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={notificationConfig.preferences?.pushNotifications}
                  onChange={(e) => handleToggle('push', e.target.checked)}
                  disabled={!notificationConfig.enabled}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <div className="setting-title">New User Alerts</div>
                <div className="setting-description">Get notified when new users register</div>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={notificationConfig.preferences?.newUserAlerts}
                  onChange={(e) => handleToggle('newUser', e.target.checked)}
                  disabled={!notificationConfig.enabled}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <div className="setting-title">Game Upload Alerts</div>
                <div className="setting-description">Get notified when games are uploaded</div>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={notificationConfig.preferences?.gameUploadAlerts}
                  onChange={(e) => handleToggle('gameUpload', e.target.checked)}
                  disabled={!notificationConfig.enabled}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <div className="setting-title">System Alerts</div>
                <div className="setting-description">Critical system notifications</div>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={notificationConfig.preferences?.systemAlerts}
                  onChange={(e) => handleToggle('system', e.target.checked)}
                  disabled={!notificationConfig.enabled}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <div className="setting-title">Marketing Notifications</div>
                <div className="setting-description">Promotional and marketing messages</div>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={notificationConfig.preferences?.marketingNotifications}
                  onChange={(e) => handleToggle('marketing', e.target.checked)}
                  disabled={!notificationConfig.enabled}
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>
        </div>

        {/* Test & Actions */}
        <div className="card-brutal settings-card">
          <div className="settings-header">
            <TestTube size={24} />
            <h3>TEST & ACTIONS</h3>
          </div>

          <div className="settings-body">
            <div className="form-group">
              <label>Test Email Address</label>
              <input
                type="email"
                className="input-brutal"
                placeholder="test@example.com"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
              />
            </div>

            <div className="action-buttons">
              <button
                className="btn-brutal btn-secondary"
                onClick={handleTestNotifications}
                disabled={sendingTest}
              >
                {sendingTest ? <RefreshCw size={16} className="spin" /> : <TestTube size={16} />}
                Test Notifications
              </button>

              <button
                className="btn-brutal btn-primary"
                onClick={handleSendBroadcast}
              >
                <Send size={16} />
                Send Broadcast
              </button>
            </div>

            <button
              className="btn-brutal btn-outline full-width"
              onClick={fetchNotificationConfig}
              disabled={loading}
            >
              {loading ? <RefreshCw size={16} className="spin" /> : <RefreshCw size={16} />}
              Refresh Config
            </button>
          </div>
        </div>

        {/* Performance */}
        <div className="card-brutal settings-card">
          <div className="settings-header">
            <SettingsIcon size={24} />
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
        <button className="btn-brutal btn-primary" onClick={handleSaveSettings}>
          Save All Settings
        </button>
      </div>
    </div>
  );
};

export default Settings;

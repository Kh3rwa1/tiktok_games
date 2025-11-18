# TikTok Games - Server + Admin Panel Deployment Guide

This is a unified deployment package that includes both the backend API server and the admin panel in a single deployable folder.

## Quick Start

### 1. Build the Admin Panel

First, build the React admin panel:

```bash
# From the project root
cd admin-panel
npm install
npm run build

# Copy built files to server public folder
cp -r dist/* ../server-admin-panel/public/
```

Or use the build script:
```bash
cd server-admin-panel
npm run build:admin
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your configuration
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Start the Server

```bash
npm start
```

The server will serve both the API and the admin panel on the same port (default: 5000).

---

## Deployment Options

### Option A: cPanel / Shared Hosting (Hostinger, Bluehost, etc.)

#### Using Node.js Selector

1. **Upload Files**
   - Upload the entire `server-admin-panel` folder to your hosting
   - Recommended location: `/home/yourusername/server-admin-panel`

2. **Setup Node.js in cPanel**
   - Go to cPanel → Software → Setup Node.js App
   - Click "Create Application"
   - Select Node.js version: 18.x or higher
   - Application root: `/home/yourusername/server-admin-panel`
   - Application URL: your domain
   - Application startup file: `server.js`

3. **Environment Variables**
   - In the Node.js app settings, add your environment variables
   - Or create `.env` file in the application root

4. **Install Dependencies**
   - Click "Run NPM Install" in the Node.js app settings

5. **Start Application**
   - Click "Start App"
   - Your app will be available at your domain

#### Reverse Proxy with Apache (.htaccess)

If using Apache, create `.htaccess` in your public_html:

```apache
RewriteEngine On
RewriteRule ^(.*)$ http://localhost:5000/$1 [P,L]
```

### Option B: VPS Deployment (Contabo, DigitalOcean, etc.)

#### Using PM2 (Recommended)

1. **Connect to your VPS**
   ```bash
   ssh root@your-server-ip
   ```

2. **Install Node.js**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

3. **Install PM2**
   ```bash
   npm install -g pm2
   ```

4. **Upload and Setup**
   ```bash
   # Upload files (using scp, sftp, or git)
   cd /var/www/server-admin-panel
   npm install
   cp .env.example .env
   # Edit .env with your settings
   nano .env
   ```

5. **Start with PM2**
   ```bash
   pm2 start server.js --name "tiktok-games"
   pm2 save
   pm2 startup
   ```

6. **Setup Nginx Reverse Proxy**
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com;

       location / {
           proxy_pass http://localhost:5000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       }
   }
   ```

7. **Enable and restart Nginx**
   ```bash
   sudo ln -s /etc/nginx/sites-available/tiktok-games /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

### Option C: Docker Deployment

1. **Build Docker Image**
   ```bash
   docker build -t tiktok-games .
   ```

2. **Run Container**
   ```bash
   docker run -d \
     --name tiktok-games \
     -p 5000:5000 \
     --env-file .env \
     tiktok-games
   ```

---

## Notification Setup

### AWS Services Setup

#### AWS SES (Email)

1. Go to AWS Console → SES
2. Verify your email/domain
3. Create SMTP credentials or use API
4. Add to `.env`:
   ```
   AWS_SES_FROM_EMAIL=noreply@yourdomain.com
   AWS_SES_REGION=us-east-1
   ```

#### AWS SNS (Push Notifications)

1. Go to AWS Console → SNS
2. Create a new topic
3. Copy the Topic ARN
4. Add to `.env`:
   ```
   AWS_SNS_TOPIC_ARN=arn:aws:sns:us-east-1:123456789:your-topic
   ```

### Firebase FCM Setup

1. Go to Firebase Console → Project Settings → Cloud Messaging
2. Generate a server key
3. Enable FCM in your Firebase Admin SDK
4. FCM will work automatically with the Firebase Admin SDK

### Admin Panel Notification Controls

Access the notification controls at:
- `https://yourdomain.com/settings`

Features:
- **Master Toggle**: Enable/disable all notifications at once
- **AWS SNS**: Toggle push notifications via AWS
- **AWS SES**: Toggle email notifications via AWS
- **Firebase FCM**: Toggle push notifications via Firebase
- **Notification Types**: Control which events trigger notifications

---

## SSL/HTTPS Setup

### Using Let's Encrypt (Recommended)

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d yourdomain.com

# Auto-renewal
sudo certbot renew --dry-run
```

### Using cPanel
- Go to cPanel → Security → SSL/TLS Status
- Click "Run AutoSSL"

---

## Troubleshooting

### Common Issues

1. **Port already in use**
   ```bash
   # Find process using port
   lsof -i :5000
   # Kill process
   kill -9 <PID>
   ```

2. **Permission denied**
   ```bash
   sudo chown -R $USER:$USER /var/www/server-admin-panel
   ```

3. **Node modules issues**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

4. **Firebase credentials error**
   - Ensure FIREBASE_SERVICE_ACCOUNT is valid JSON
   - Or place `firebase-service-account.json` in the root folder

### Checking Logs

```bash
# PM2 logs
pm2 logs tiktok-games

# System logs
tail -f /var/log/nginx/error.log
```

---

## Folder Structure

```
server-admin-panel/
├── server.js              # Main server file
├── package.json           # Dependencies
├── .env.example           # Environment template
├── config/                # Configuration files
├── controllers/           # Route controllers
├── middleware/            # Express middleware
├── models/                # Database models
├── routes/                # API routes
├── services/              # Business logic
│   └── notificationService.js  # Unified notifications
├── public/                # Built admin panel (static files)
│   ├── index.html
│   └── assets/
└── DEPLOYMENT.md          # This file
```

---

## Support

For issues and feature requests:
- GitHub: [Create an issue](https://github.com/your-repo/issues)
- Documentation: Check the main README.md

---

## Security Checklist

Before going to production:

- [ ] Change JWT_SECRET to a strong random value
- [ ] Configure ALLOWED_ORIGINS for your domain only
- [ ] Enable HTTPS/SSL
- [ ] Set NODE_ENV=production
- [ ] Review rate limiting settings
- [ ] Backup your Firebase service account key
- [ ] Set up monitoring (PM2, CloudWatch, etc.)
- [ ] Configure firewall rules
- [ ] Enable Redis password if using Redis

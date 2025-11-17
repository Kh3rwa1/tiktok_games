# Firebase Setup Guide

This guide will walk you through setting up Firebase for the TikTok Games app.

## Prerequisites

- Google account
- Node.js (v16+) installed
- Project repository cloned

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or "Create a project"
3. Enter project name (e.g., `tiktok-games`)
4. Disable Google Analytics (optional, can be enabled later)
5. Click "Create project"

## Step 2: Enable Firebase Authentication

1. In Firebase Console, go to **Build** > **Authentication**
2. Click "Get started"
3. Go to **Sign-in method** tab
4. Enable **Email/Password** provider
5. Click "Save"

## Step 3: Create Firestore Database

1. In Firebase Console, go to **Build** > **Firestore Database**
2. Click "Create database"
3. Select **Start in production mode** (we'll add rules later)
4. Choose a Cloud Firestore location (select closest to your users)
5. Click "Enable"

### Add Security Rules

Go to **Rules** tab and paste:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection
    match /users/{userId} {
      // Users can read their own document
      allow read: if request.auth != null && request.auth.uid == userId;
      // Users can create their own document during signup
      allow create: if request.auth != null && request.auth.uid == userId;
      // Users can update their own document
      allow update: if request.auth != null && request.auth.uid == userId;
      // Only admins can delete users
      allow delete: if request.auth != null &&
                      get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    // Games collection
    match /games/{gameId} {
      // Anyone can read games
      allow read: if true;
      // Authenticated users can create games
      allow create: if request.auth != null;
      // Only game creator or admin can update
      allow update: if request.auth != null && (
        resource.data.creatorId == request.auth.uid ||
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin'
      );
      // Only game creator or admin can delete
      allow delete: if request.auth != null && (
        resource.data.creatorId == request.auth.uid ||
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin'
      );
    }
  }
}
```

Click "Publish"

## Step 4: Enable Firebase Storage

1. In Firebase Console, go to **Build** > **Storage**
2. Click "Get started"
3. Select **Start in production mode**
4. Choose storage location (same as Firestore)
5. Click "Done"

### Add Storage Rules

Go to **Rules** tab and paste:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Games folder - anyone can read, authenticated users can write
    match /games/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }

    // Thumbnails folder - anyone can read, authenticated users can write
    match /thumbnails/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }

    // User avatars - anyone can read, only owner can write
    match /avatars/{userId}/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

Click "Publish"

## Step 5: Get Firebase Configuration for Mobile App

1. In Firebase Console, go to **Project Settings** (gear icon)
2. Scroll down to "Your apps"
3. Click on the **Web** icon (`</>`)
4. Register app with nickname (e.g., "TikTok Games Web")
5. Copy the configuration object

Create `mobile/.env` file:

```env
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key_here
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
```

## Step 6: Get Firebase Admin SDK for Backend

1. In Firebase Console, go to **Project Settings** > **Service Accounts**
2. Click "Generate new private key"
3. Click "Generate key" - a JSON file will download
4. Rename the file to `firebase-service-account.json`
5. Move it to the `backend/` directory
6. **IMPORTANT**: Add `firebase-service-account.json` to `.gitignore`

Create `backend/.env` file:

```env
NODE_ENV=development
PORT=5000
FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:19006
```

## Step 7: Create Firestore Indexes (Optional but Recommended)

For better query performance, create composite indexes:

1. Go to **Firestore Database** > **Indexes** tab
2. Click "Add index"
3. Create these indexes:

### Games Collection Indexes

| Collection | Fields | Query scope |
|------------|--------|-------------|
| games | isActive (Ascending), stats.plays (Descending) | Collection |
| games | isActive (Ascending), averageRating (Descending) | Collection |
| games | isActive (Ascending), createdAt (Descending) | Collection |
| games | category (Ascending), stats.plays (Descending) | Collection |
| games | isFeatured (Descending), stats.plays (Descending) | Collection |

These indexes will be automatically created when you run queries that need them.

## Step 8: Initialize Collections (Optional)

You can manually create the first documents or let the app create them:

### Create an Admin User

1. Register a normal user through the app
2. Go to Firestore Database
3. Find the user document in `users` collection
4. Edit the document and change `role` field from `"user"` to `"admin"`

## Security Checklist

Before going to production:

- [ ] Enable Firebase Authentication Email/Password
- [ ] Set up Firestore security rules
- [ ] Set up Storage security rules
- [ ] Add `firebase-service-account.json` to `.gitignore`
- [ ] Never commit Firebase credentials to git
- [ ] Use environment variables for all sensitive data
- [ ] Enable Firebase App Check (optional but recommended)
- [ ] Set up billing alerts in Google Cloud Console
- [ ] Review Firebase usage limits

## Troubleshooting

### "Permission denied" errors in Firestore

- Check security rules are published
- Verify user is authenticated
- Check user permissions match rules

### "Storage object not found"

- Verify storage rules allow read access
- Check file was uploaded successfully
- Ensure correct bucket name in config

### Backend can't connect to Firebase

- Verify `firebase-service-account.json` exists and is valid
- Check `FIREBASE_STORAGE_BUCKET` in `.env`
- Ensure service account has proper permissions

### Mobile app can't authenticate

- Verify Firebase config in `.env` is correct
- Check Firebase Auth is enabled
- Ensure Email/Password provider is enabled

## Cost Optimization

Firebase has generous free tier:

- **Authentication**: 10k verifications/month free
- **Firestore**: 50k reads, 20k writes, 20k deletes per day free
- **Storage**: 5GB total, 1GB download/day free

For production:

- Enable caching to reduce Firestore reads
- Use Cloud Functions for batch operations
- Optimize images before upload
- Set up lifecycle policies for old storage files
- Monitor usage in Firebase Console

## Next Steps

1. Test authentication (register/login)
2. Upload a test game
3. Verify Firestore data is being created
4. Test Storage uploads
5. Check security rules are working

For any issues, check the Firebase Console logs and enable debug mode in the app.

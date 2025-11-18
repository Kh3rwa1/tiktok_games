const admin = require('firebase-admin');
const { Storage } = require('@google-cloud/storage');
const multer = require('multer');
const path = require('path');

// Initialize Firebase Admin SDK
let serviceAccount;
try {
  // Try to load from environment variable or file
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  } else {
    serviceAccount = require(path.join(__dirname, '../firebase-service-account.json'));
  }
} catch (error) {
  console.error('Firebase service account not found. Please configure it.');
}

// Initialize Firebase Admin
if (serviceAccount) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET
  });
}

// Get Firestore instance
const db = admin.firestore();

// Configure Firestore settings
db.settings({
  timestampsInSnapshots: true,
  ignoreUndefinedProperties: true
});

// Get Firebase Storage instance
const bucket = admin.storage().bucket();

// Configure multer for memory storage (files will be uploaded to Firebase)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB max file size
  },
  fileFilter: (req, file, cb) => {
    // Accept game files (HTML, JS, CSS, ZIP, images, etc.)
    const allowedTypes = /html|htm|js|css|zip|png|jpg|jpeg|gif|svg|json|webp|mp4|webm/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());

    if (extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only game-related files are allowed.'));
    }
  }
});

/**
 * Upload file to Firebase Storage
 * @param {Buffer} fileBuffer - File buffer
 * @param {String} fileName - Original file name
 * @param {String} folder - Storage folder (e.g., 'games', 'thumbnails')
 * @returns {Promise<String>} - Public URL of uploaded file
 */
const uploadToFirebase = async (fileBuffer, fileName, folder = 'games') => {
  try {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(fileName);
    const baseName = path.basename(fileName, extension);
    const storagePath = `${folder}/${baseName}-${uniqueSuffix}${extension}`;

    const file = bucket.file(storagePath);

    // Upload file
    await file.save(fileBuffer, {
      metadata: {
        contentType: getContentType(extension),
        metadata: {
          firebaseStorageDownloadTokens: uniqueSuffix
        }
      },
      public: true,
      validation: 'md5'
    });

    // Make file publicly accessible
    await file.makePublic();

    // Get public URL
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;

    return publicUrl;
  } catch (error) {
    console.error('Error uploading to Firebase Storage:', error);
    throw error;
  }
};

/**
 * Delete file from Firebase Storage
 * @param {String} fileUrl - Public URL of the file
 * @returns {Promise<Boolean>} - Success status
 */
const deleteFromFirebase = async (fileUrl) => {
  try {
    // Extract file path from URL
    const bucketName = bucket.name;
    const urlPattern = new RegExp(`https://storage\\.googleapis\\.com/${bucketName}/(.+)`);
    const match = fileUrl.match(urlPattern);

    if (!match) {
      console.error('Invalid Firebase Storage URL');
      return false;
    }

    const filePath = decodeURIComponent(match[1]);
    const file = bucket.file(filePath);

    await file.delete();
    return true;
  } catch (error) {
    console.error('Error deleting from Firebase Storage:', error);
    return false;
  }
};

/**
 * Get signed URL for temporary access to private files
 * @param {String} filePath - Storage path of the file
 * @param {Number} expiresIn - Expiration time in seconds (default: 1 hour)
 * @returns {Promise<String>} - Signed URL
 */
const getSignedUrl = async (filePath, expiresIn = 3600) => {
  try {
    const file = bucket.file(filePath);

    const [url] = await file.getSignedUrl({
      version: 'v4',
      action: 'read',
      expires: Date.now() + expiresIn * 1000
    });

    return url;
  } catch (error) {
    console.error('Error generating signed URL:', error);
    throw error;
  }
};

/**
 * Get content type based on file extension
 * @param {String} extension - File extension
 * @returns {String} - Content type
 */
const getContentType = (extension) => {
  const contentTypes = {
    '.html': 'text/html',
    '.htm': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
    '.zip': 'application/zip',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm'
  };

  return contentTypes[extension.toLowerCase()] || 'application/octet-stream';
};

module.exports = {
  admin,
  db,
  bucket,
  upload,
  uploadToFirebase,
  deleteFromFirebase,
  getSignedUrl
};

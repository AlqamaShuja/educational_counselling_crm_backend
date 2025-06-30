const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const AppError = require('../utils/appError');

// Ensure upload directory exists
const uploadDir = path.join(__dirname, '../uploads/messages');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Create date-based subdirectory
    const dateDir = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const fullPath = path.join(uploadDir, dateDir);

    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }

    cb(null, fullPath);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with original extension
    const uniqueId = uuidv4();
    const ext = path.extname(file.originalname);
    const filename = `${uniqueId}${ext}`;
    cb(null, filename);
  },
});

// File filter function
const fileFilter = (req, file, cb) => {
  // Define allowed file types
  const allowedTypes = {
    'image/jpeg': true,
    'image/jpg': true,
    'image/png': true,
    'image/gif': true,
    'image/webp': true,
    'video/mp4': true,
    'video/mpeg': true,
    'video/quicktime': true,
    'video/webm': true,
    'application/pdf': true,
    'application/msword': true,
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': true,
    'application/vnd.ms-excel': true,
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': true,
    'application/vnd.ms-powerpoint': true,
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': true,
    'text/plain': true,
    'text/csv': true,
    'application/zip': true,
    'application/x-rar-compressed': true,
    'application/x-7z-compressed': true,
  };

  if (allowedTypes[file.mimetype]) {
    cb(null, true);
  } else {
    cb(
      new AppError(
        'Invalid file type. Only images, videos, documents, and archives are allowed.',
        400
      ),
      false
    );
  }
};

// Configure multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
    files: 10, // Maximum 10 files per request
  },
});

// Error handling middleware for multer
const handleMulterError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return next(new AppError('File too large. Maximum size is 50MB.', 400));
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return next(
        new AppError('Too many files. Maximum 10 files allowed.', 400)
      );
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return next(new AppError('Unexpected file field.', 400));
    }
  }
  next(error);
};

// Middleware to validate file upload for messages
const validateMessageFile = (req, res, next) => {
  if (!req.file) {
    return next(new AppError('No file provided', 400));
  }

  // Determine message type based on file mime type
  const mimeType = req.file.mimetype;
  let messageType = 'file';

  if (mimeType.startsWith('image/')) {
    messageType = 'image';
  } else if (mimeType.startsWith('video/')) {
    messageType = 'video';
  }

  // Add message type to request
  req.messageType = messageType;

  // Add file URL (this would be actual URL in production with cloud storage)
  req.fileUrl = `/uploads/messages/${path.basename(path.dirname(req.file.path))}/${req.file.filename}`;

  next();
};

// Cloud storage configuration (AWS S3, CloudFront, etc.)
const cloudUpload = {
  // AWS S3 configuration
  s3: {
    bucket: process.env.AWS_S3_BUCKET || 'your-messages-bucket',
    region: process.env.AWS_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },

  // CloudFront CDN configuration
  cloudfront: {
    domainName: process.env.CLOUDFRONT_DOMAIN || 'cdn.yourapp.com',
  },
};

// Function to upload file to cloud storage (implement based on your needs)
const uploadToCloud = async (file) => {
  // This is a placeholder - implement actual cloud upload logic
  // For AWS S3:
  /*
  const AWS = require('aws-sdk');
  const s3 = new AWS.S3(cloudUpload.s3);
  
  const uploadParams = {
    Bucket: cloudUpload.s3.bucket,
    Key: `messages/${Date.now()}-${file.originalname}`,
    Body: fs.createReadStream(file.path),
    ContentType: file.mimetype,
    ACL: 'public-read',
  };
  
  const result = await s3.upload(uploadParams).promise();
  return result.Location;
  */

  // For now, return local file path
  return `/uploads/messages/${path.basename(path.dirname(file.path))}/${file.filename}`;
};

// Cleanup local files after cloud upload
const cleanupLocalFile = (filePath) => {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
};

// Middleware to get file metadata
const getFileMetadata = (file) => {
  return {
    originalName: file.originalname,
    filename: file.filename,
    mimetype: file.mimetype,
    size: file.size,
    path: file.path,
  };
};

// File type detection helper
const getMessageTypeFromMime = (mimeType) => {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  return 'file';
};

// File size formatter
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

module.exports = {
  upload,
  handleMulterError,
  validateMessageFile,
  uploadToCloud,
  cleanupLocalFile,
  getFileMetadata,
  getMessageTypeFromMime,
  formatFileSize,
  cloudUpload,
};

const express = require('express');
const router = express.Router();
const fileController = require("../controllers/fileController");
const { upload } = require('../middleware/multer');
const { protect } = require('../middleware/authMiddleware');

router.get(
  '/documents/:documentId',
  fileController.getDocumentFile
);


router.post('/upload', protect, upload.single('file'), fileController.uploadFileController);

module.exports = router;
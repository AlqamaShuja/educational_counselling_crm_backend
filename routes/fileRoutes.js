const express = require('express');
const router = express.Router();
const fileController = require("../controllers/fileController");

router.get(
  '/documents/:documentId',
  fileController.getDocumentFile
);


module.exports = router;
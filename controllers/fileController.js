const path = require('path');
const { Document } = require('../models');
const fs = require('fs');
const AppError = require('../utils/appError');

const getDocumentFile = async (req, res, next) => {
  try {
    const document = await Document.findOne({
      where: { id: req.params.documentId },
    });
    if (!document) {
      throw new AppError('Document not found', 404);
    }
    // const filePath = path.resolve(document.filePath);
    const filePath = path.join(__dirname, '../', document.filePath);
    if (!fs.existsSync(filePath)) {
      //   throw new AppError('File not found on server', 404);
      return res.status(404).send({ error: 'File not found on server' });
    }
    res.sendFile(filePath);
  } catch (error) {
    next(error);
  }
};

const uploadFileController = (req, res) => {
  try {
    const { file } = req;
    if (!file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    res.status(200).json({
      fileUrl: `/uploads/leads/${file.filename}`,
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = {
  getDocumentFile,
  uploadFileController,
};

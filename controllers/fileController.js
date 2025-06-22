const path = require("path");
const { Document, } = require("../models");
const fs = require("fs");
const AppError = require("../utils/appError");

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
    return res.status(404).send({ error: "File not found on server" });
    }
    res.sendFile(filePath);
  } catch (error) {
    next(error);
  }
};


module.exports = {
    getDocumentFile,
}
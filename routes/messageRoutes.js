const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const { protect } = require('../middleware/authMiddleware');
const { upload } = require('../middleware/uploadMiddleware');
const {
  validateMessage,
  validateMessageEdit,
} = require('../middleware/messageValidation');

// Protect all routes
router.use(protect);

/**
 * @swagger
 * /api/v1/messages:
 *   post:
 *     summary: Send a message
 *     tags: [Messages]
 *     description: Send a message to a conversation
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - conversationId
 *               - content
 *             properties:
 *               conversationId:
 *                 type: string
 *                 format: uuid
 *               content:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [text, image, video, file, system]
 *                 default: text
 *               replyToId:
 *                 type: string
 *                 format: uuid
 *               metadata:
 *                 type: object
 *     responses:
 *       201:
 *         description: Message sent successfully
 *       400:
 *         description: Invalid input
 *       403:
 *         description: No permission to send message
 *       404:
 *         description: Conversation not found
 */
router.post('/', validateMessage, messageController.sendMessage);

/**
 * @swagger
 * /api/v1/messages/upload:
 *   post:
 *     summary: Send a message with file
 *     tags: [Messages]
 *     description: Send a message with file attachment
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - conversationId
 *               - file
 *             properties:
 *               conversationId:
 *                 type: string
 *                 format: uuid
 *               content:
 *                 type: string
 *               file:
 *                 type: string
 *                 format: binary
 *               replyToId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       201:
 *         description: Message with file sent successfully
 *       400:
 *         description: Invalid file or input
 *       403:
 *         description: No permission to send files
 */
router.post(
  '/upload',
  upload.single('file'),
  messageController.sendMessageWithFile
);

/**
 * @swagger
 * /api/v1/messages/{id}:
 *   put:
 *     summary: Edit a message
 *     tags: [Messages]
 *     description: Edit an existing message (only sender can edit)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *             properties:
 *               content:
 *                 type: string
 *     responses:
 *       200:
 *         description: Message updated successfully
 *       403:
 *         description: Not allowed to edit this message
 *       404:
 *         description: Message not found
 */
router.put('/:id', validateMessageEdit, messageController.editMessage);

/**
 * @swagger
 * /api/v1/messages/{id}:
 *   delete:
 *     summary: Delete a message
 *     tags: [Messages]
 *     description: Delete a message (soft delete)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Message deleted successfully
 *       403:
 *         description: Not allowed to delete this message
 *       404:
 *         description: Message not found
 */
router.delete('/:id', messageController.deleteMessage);

/**
 * @swagger
 * /api/v1/messages/{id}/read:
 *   patch:
 *     summary: Mark message as read
 *     tags: [Messages]
 *     description: Mark a specific message as read
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Message marked as read
 *       404:
 *         description: Message not found
 */
router.patch('/:id/read', messageController.markMessageAsRead);

/**
 * @swagger
 * /api/v1/messages/search:
 *   get:
 *     summary: Search messages
 *     tags: [Messages]
 *     description: Search messages across conversations
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query
 *       - in: query
 *         name: conversationId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Limit search to specific conversation
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [text, image, video, file, system]
 *         description: Filter by message type
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Search messages from this date
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Search messages until this date
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *     responses:
 *       200:
 *         description: Search results
 *       400:
 *         description: Invalid search parameters
 */
router.get('/search', messageController.searchMessages);

/**
 * @swagger
 * /api/v1/messages/{id}/replies:
 *   get:
 *     summary: Get message replies
 *     tags: [Messages]
 *     description: Get all replies to a specific message
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Message replies
 *       404:
 *         description: Message not found
 */
router.get('/:id/replies', messageController.getMessageReplies);

/**
 * @swagger
 * /api/v1/messages/bulk/read:
 *   patch:
 *     summary: Mark multiple messages as read
 *     tags: [Messages]
 *     description: Mark multiple messages as read
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - messageIds
 *             properties:
 *               messageIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *     responses:
 *       200:
 *         description: Messages marked as read
 *       400:
 *         description: Invalid message IDs
 */
router.patch('/bulk/read', messageController.markMultipleMessagesAsRead);

module.exports = router;

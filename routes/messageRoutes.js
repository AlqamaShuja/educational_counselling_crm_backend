'use strict';

const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/authMiddleware');
const messageController = require('../controllers/messageController');

/**
 * @swagger
 * tags:
 *   name: Messages
 *   description: Message management for communication between users
 */

/**
 * @swagger
 * /api/v1/messages:
 *   post:
 *     summary: Send a new message
 *     tags: [Messages]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - recipientId
 *               - content
 *             properties:
 *               recipientId:
 *                 type: string
 *                 format: uuid
 *                 example: 123e4567-e89b-12d3-a456-426614174000
 *               content:
 *                 type: string
 *                 example: Hello, I have a question about my application
 *               type:
 *                 type: string
 *                 enum: [text, image, video, file, system]
 *                 example: text
 *               fileUrl:
 *                 type: string
 *                 example: https://example.com/file.jpg
 *               fileName:
 *                 type: string
 *                 example: document.jpg
 *               fileSize:
 *                 type: integer
 *                 example: 102400
 *               mimeType:
 *                 type: string
 *                 example: image/jpeg
 *               replyToId:
 *                 type: string
 *                 format: uuid
 *                 example: 123e4567-e89b-12d3-a456-426614174001
 *     responses:
 *       201:
 *         description: Message sent successfully
 *       400:
 *         description: Invalid input
 *       403:
 *         description: Not authorized to send message to this recipient
 */
router.post(
  '/',
  protect,
  restrictTo('student', 'consultant', 'super_admin', 'manager'),
  messageController.createMessage
);

/**
 * @swagger
 * /api/v1/messages:
 *   get:
 *     summary: Get messages for the authenticated user or all student-consultant conversations (for super_admin)
 *     tags: [Messages]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: recipientId
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Filter messages by recipient ID (optional)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Number of messages to return
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: Number of messages to skip
 *     responses:
 *       200:
 *         description: List of messages or conversations
 *       403:
 *         description: Not authorized to view this conversation
 */
router.get('/', protect, messageController.getMessages);

//
router.get(
  '/users/allowed-recipients',
  protect,
  messageController.getAllowedRecipients
);

/**
 * @swagger
 * /api/v1/messages/{id}:
 *   put:
 *     summary: Update a message
 *     tags: [Messages]
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
 *                 example: Updated message content
 *     responses:
 *       200:
 *         description: Message updated successfully
 *       403:
 *         description: Not authorized to edit this message
 *       404:
 *         description: Message not found
 */
router.put(
  '/:id',
  protect,
  restrictTo('student', 'super_admin', 'manager'),
  messageController.updateMessage
);

/**
 * @swagger
 * /api/v1/messages/conversation/{conversationHash}/read:
 *   put:
 *     summary: Mark all messages in a conversation as read for the authenticated user
 *     tags: [Messages]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: conversationHash
 *         required: true
 *         schema:
 *           type: string
 *         description: The conversation hash to mark messages as read
 *     responses:
 *       200:
 *         description: Messages marked as read
 *       403:
 *         description: Not authorized to mark messages as read
 *       404:
 *         description: Conversation not found
 */
router.put(
  '/conversation/:conversationHash/read',
  protect,
  messageController.markConversationMessagesAsRead,
);

// /**
//  * @swagger
//  * /api/v1/messages/{id}:
//  *   delete:
//  *     summary: Delete a message
//  *     tags: [Messages]
//  *     security:
//  *       - BearerAuth: []
//  *     parameters:
//  *       - in: path
//  *         name: id
//  *         required: true
//  *         schema:
//  *           type: string
//  *           format: uuid
//  *     responses:
//  *       204:
//  *         description: Message deleted successfully
//  *       403:
//  *         description: Not authorized to delete this message
//  *       404:
//  *         description: Message not found
//  */
// router.delete(
//   '/:id',
//   protect,
//   restrictTo('student', 'super_admin', 'manager'),
//   messageController.deleteMessage
// );

/**
 * @swagger
 * /api/v1/messages/{id}/read:
 *   put:
 *     summary: Mark a message as read
 *     tags: [Messages]
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
 *       403:
 *         description: Not authorized to mark this message as read
 *       404:
 *         description: Message not found
 */
router.put('/:id/read', protect, messageController.markMessageAsRead);

// swagger doc
router.get('/unread-count', protect, messageController.getUnreadMessageCount);

module.exports = router;

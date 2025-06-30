const express = require('express');
const router = express.Router();
const conversationController = require('../controllers/conversationController');
const messageController = require('../controllers/messageController');
const { protect, restrictTo } = require('../middleware/authMiddleware');
const {
  validateConversation,
} = require('../middleware/conversationValidation');

// Protect all routes
router.use(protect);

/**
 * @swagger
 * /api/v1/conversations:
 *   post:
 *     summary: Create a new conversation
 *     tags: [Conversations]
 *     description: Create a new conversation between users
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - participants
 *               - purpose
 *             properties:
 *               name:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [direct, group, support]
 *                 default: direct
 *               purpose:
 *                 type: string
 *                 enum: [lead_consultant, manager_consultant, manager_receptionist, manager_lead, general, support]
 *               participants:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *               settings:
 *                 type: object
 *     responses:
 *       201:
 *         description: Conversation created successfully
 *       400:
 *         description: Invalid input or participants
 *       403:
 *         description: Not allowed to create conversation with these participants
 */
router.post(
  '/',
  validateConversation,
  conversationController.createConversation
);

/**
 * @swagger
 * /api/v1/conversations:
 *   get:
 *     summary: Get user conversations
 *     tags: [Conversations]
 *     description: Get all conversations for the authenticated user
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [direct, group, support]
 *         description: Filter by conversation type
 *       - in: query
 *         name: purpose
 *         schema:
 *           type: string
 *           enum: [lead_consultant, manager_consultant, manager_receptionist, manager_lead, general, support]
 *         description: Filter by conversation purpose
 *       - in: query
 *         name: archived
 *         schema:
 *           type: boolean
 *           default: false
 *         description: Include archived conversations
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
 *         description: User conversations
 */
router.get('/', conversationController.getUserConversations);

/**
 * @swagger
 * /api/v1/conversations/{id}:
 *   get:
 *     summary: Get conversation details
 *     tags: [Conversations]
 *     description: Get detailed information about a specific conversation
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
 *         description: Conversation details
 *       403:
 *         description: Not a participant in this conversation
 *       404:
 *         description: Conversation not found
 */
router.get('/:id', conversationController.getConversationById);

/**
 * @swagger
 * /api/v1/conversations/{id}/messages:
 *   get:
 *     summary: Get conversation messages
 *     tags: [Conversations]
 *     description: Get messages from a specific conversation with pagination
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: before
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Get messages before this timestamp
 *       - in: query
 *         name: after
 *         schema:
 *           type: string
 *           format: date-time
 *         description: Get messages after this timestamp
 *     responses:
 *       200:
 *         description: Conversation messages
 *       403:
 *         description: Not a participant in this conversation
 *       404:
 *         description: Conversation not found
 */
router.get('/:id/messages', messageController.getConversationMessages);

/**
 * @swagger
 * /api/v1/conversations/{id}:
 *   put:
 *     summary: Update conversation
 *     tags: [Conversations]
 *     description: Update conversation details (name, settings, etc.)
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
 *             properties:
 *               name:
 *                 type: string
 *               settings:
 *                 type: object
 *               metadata:
 *                 type: object
 *     responses:
 *       200:
 *         description: Conversation updated successfully
 *       403:
 *         description: Not allowed to update this conversation
 *       404:
 *         description: Conversation not found
 */
router.put('/:id', conversationController.updateConversation);

/**
 * @swagger
 * /api/v1/conversations/{id}/participants:
 *   post:
 *     summary: Add participants to conversation
 *     tags: [Conversations]
 *     description: Add new participants to a group conversation
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
 *               - userIds
 *             properties:
 *               userIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *     responses:
 *       200:
 *         description: Participants added successfully
 *       403:
 *         description: Not allowed to add participants
 *       404:
 *         description: Conversation not found
 */
router.post('/:id/participants', conversationController.addParticipants);

/**
 * @swagger
 * /api/v1/conversations/{id}/participants/{userId}:
 *   delete:
 *     summary: Remove participant from conversation
 *     tags: [Conversations]
 *     description: Remove a participant from the conversation
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Participant removed successfully
 *       403:
 *         description: Not allowed to remove this participant
 *       404:
 *         description: Conversation or participant not found
 */
router.delete(
  '/:id/participants/:userId',
  conversationController.removeParticipant
);

/**
 * @swagger
 * /api/v1/conversations/{id}/archive:
 *   patch:
 *     summary: Archive/unarchive conversation
 *     tags: [Conversations]
 *     description: Archive or unarchive a conversation
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
 *               - archived
 *             properties:
 *               archived:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Conversation archived/unarchived successfully
 *       404:
 *         description: Conversation not found
 */
router.patch('/:id/archive', conversationController.archiveConversation);

/**
 * @swagger
 * /api/v1/conversations/{id}/read:
 *   patch:
 *     summary: Mark conversation as read
 *     tags: [Conversations]
 *     description: Mark all messages in conversation as read for the user
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
 *         description: Conversation marked as read
 *       404:
 *         description: Conversation not found
 */
router.patch('/:id/read', conversationController.markConversationAsRead);

/**
 * @swagger
 * /api/v1/conversations/{id}/typing:
 *   post:
 *     summary: Send typing indicator
 *     tags: [Conversations]
 *     description: Send typing indicator to conversation participants
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
 *               - isTyping
 *             properties:
 *               isTyping:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Typing indicator sent
 *       404:
 *         description: Conversation not found
 */
router.post('/:id/typing', conversationController.sendTypingIndicator);

// Monitoring routes (Manager and Super Admin only)
/**
 * @swagger
 * /api/v1/conversations/monitoring/office/{officeId}:
 *   get:
 *     summary: Monitor office conversations
 *     tags: [Conversations]
 *     description: Get all conversations for monitoring within an office (Manager only)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: officeId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: purpose
 *         schema:
 *           type: string
 *           enum: [lead_consultant, manager_consultant, manager_receptionist, manager_lead, general, support]
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
 *         description: Office conversations for monitoring
 *       403:
 *         description: Not authorized to monitor this office
 */
router.get(
  '/monitoring/office/:officeId',
  restrictTo('manager', 'super_admin'),
  conversationController.getOfficeConversationsForMonitoring
);

/**
 * @swagger
 * /api/v1/conversations/monitoring/all:
 *   get:
 *     summary: Monitor all conversations
 *     tags: [Conversations]
 *     description: Get all conversations for monitoring (Super Admin only)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: officeId
 *         schema:
 *           type: string
 *           format: uuid
 *       - in: query
 *         name: purpose
 *         schema:
 *           type: string
 *           enum: [lead_consultant, manager_consultant, manager_receptionist, manager_lead, general, support]
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
 *         description: All conversations for monitoring
 *       403:
 *         description: Super Admin access required
 */
router.get(
  '/monitoring/all',
  restrictTo('super_admin'),
  conversationController.getAllConversationsForMonitoring
);

module.exports = router;

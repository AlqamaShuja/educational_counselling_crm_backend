const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware');

// Protect all routes
router.use(protect);

/**
 * @swagger
 * components:
 *   schemas:
 *     Notification:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Notification ID
 *         userId:
 *           type: string
 *           format: uuid
 *           description: User ID
 *         type:
 *           type: string
 *           enum: [email, sms, in_app]
 *           description: Notification type
 *         message:
 *           type: string
 *           description: Notification message
 *         status:
 *           type: string
 *           enum: [sent, pending, failed]
 *           description: Notification status
 *         readAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: When the notification was read
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Creation timestamp
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Last update timestamp
 */

/**
 * @swagger
 * /api/v1/notifications:
 *   get:
 *     summary: Get notifications (with optional filters)
 *     tags: [Notifications]
 *     description: Retrieves notifications for the authenticated user. Supports optional query filters by type and status.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [email, sms, in_app]
 *         description: Filter by notification type
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [sent, pending, failed]
 *         description: Filter by notification status
 *     responses:
 *       200:
 *         description: List of notifications
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Notification'
 *       401:
 *         description: Unauthorized
 */
router.get('/', notificationController.getNotifications);

/**
 * @swagger
 * /api/v1/notifications/preferences:
 *   put:
 *     summary: Set notification preferences
 *     tags: [Notifications]
 *     description: Updates the notification preferences for the authenticated user.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: boolean
 *                 example: true
 *               sms:
 *                 type: boolean
 *                 example: false
 *               in_app:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Preferences updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Preferences updated
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 */
router.put('/preferences', notificationController.setNotificationPreferences);

/**
 * @swagger
 * /api/v1/notifications/history:
 *   get:
 *     summary: Get notification history
 *     tags: [Notifications]
 *     description: Retrieves the history of all notifications for the authenticated user.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Notification history retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 count:
 *                   type: integer
 *                   example: 10
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Notification'
 *       401:
 *         description: Unauthorized
 */
router.get('/history', notificationController.getNotificationHistory);

/**
 * @swagger
 * /api/v1/notifications/{id}/read:
 *   patch:
 *     summary: Mark notification as read
 *     tags: [Notifications]
 *     description: Marks a specific notification as read for the authenticated user.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Notification ID
 *     responses:
 *       200:
 *         description: Notification marked as read
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Notification marked as read
 *                 data:
 *                   $ref: '#/components/schemas/Notification'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Notification not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: string
 *                   example: Notification not found
 */
router.patch('/:id/read', notificationController.markNotificationRead);

/**
 * @swagger
 * /api/v1/notifications/read/all:
 *   patch:
 *     summary: Mark all notifications as read
 *     tags: [Notifications]
 *     description: Marks all unread notifications for the authenticated user as read.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: All notifications marked as read
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: All notifications marked as read
 *       401:
 *         description: Unauthorized
 */
router.patch('/read/all', notificationController.markAllNotificationsRead);

/**
 * @swagger
 * /api/v1/notifications/{id}:
 *   delete:
 *     summary: Delete a notification
 *     tags: [Notifications]
 *     description: Deletes a specific notification for the authenticated user.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Notification ID
 *     responses:
 *       200:
 *         description: Notification deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Notification deleted
 *       404:
 *         description: Notification not found
 */

router.delete('/:id', notificationController.deleteNotification);

/**
 * @swagger
 * /api/v1/notifications/{id}:
 *   get:
 *     summary: Get notification by ID
 *     tags: [Notifications]
 *     description: Retrieves a specific notification by its ID for the authenticated user.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Notification ID
 *     responses:
 *       200:
 *         description: Notification data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Notification'
 *       404:
 *         description: Notification not found
 */
router.get('/:id', notificationController.getNotificationById);

module.exports = router;

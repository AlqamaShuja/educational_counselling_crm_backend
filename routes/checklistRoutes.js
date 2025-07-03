const express = require('express');
const router = express.Router();
const checklistController = require('../controllers/checklistController');
const { protect, restrictTo } = require('../middleware/authMiddleware');
const { validate, checklistSchema } = require('../middleware/validator');

// Protect all routes
router.use(protect);

/**
 * @swagger
 * /api/v1/checklists/student/{studentId}:
 *   post:
 *     summary: Create a new checklist for a student
 *     tags: [Checklists]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: string
 *         description: The student's ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - items
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high]
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       201:
 *         description: Checklist created successfully
 */
router.post(
  '/student/:studentId',
  restrictTo('consultant'),
  validate(checklistSchema),
  checklistController.createChecklist
);

/**
 * @swagger
 * /api/v1/checklists/student/{studentId}:
 *   get:
 *     summary: Get all checklists for a student
 *     tags: [Checklists]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: studentId
 *         required: true
 *         schema:
 *           type: string
 *         description: The student's ID
 *     responses:
 *       200:
 *         description: List of checklists
 */
router.get(
  '/student/:studentId',
  restrictTo('consultant', 'student'),
  checklistController.getStudentChecklists
);

/**
 * @swagger
 * /api/v1/checklists/consultant:
 *   get:
 *     summary: Get all checklists created by consultant
 *     tags: [Checklists]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of checklists
 */
router.get(
  '/consultant',
  restrictTo('consultant'),
  checklistController.getConsultantChecklists
);


// for student update completed 
/**
 * @swagger
 * /api/v1/checklists/{id}/items:
 *   patch:
 *     summary: Update checklist items completion (Student only)
 *     tags: [Checklists]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The checklist ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - items
 *             properties:
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     title:
 *                       type: string
 *                       description: Item title to match
 *                     completed:
 *                       type: boolean
 *                       description: Completion status
 *                 example:
 *                   - title: "Submit passport copy"
 *                     completed: true
 *                   - title: "Pay application fee"
 *                     completed: false
 *     responses:
 *       200:
 *         description: Checklist items updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                 leadStatusUpdated:
 *                   type: boolean
 *                   description: Whether lead status was updated to project
 *       400:
 *         description: Invalid input
 *       403:
 *         description: Unauthorized - only assigned student can update
 *       404:
 *         description: Checklist not found
 */
router.patch(
  '/:id/items',
  restrictTo('student'),
  checklistController.updateChecklistItems
);

/**
 * @swagger
 * /api/v1/checklists/{id}:
 *   patch:
 *     summary: Update a checklist
 *     tags: [Checklists]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The checklist ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [pending, in_progress, completed]
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high]
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       200:
 *         description: Checklist updated successfully
 */
router.patch(
  '/:id',
  restrictTo('consultant'),
  validate(checklistSchema),
  checklistController.updateChecklist
);

/**
 * @swagger
 * /api/v1/checklists/{id}:
 *   delete:
 *     summary: Delete a checklist
 *     tags: [Checklists]
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The checklist ID
 *     responses:
 *       200:
 *         description: Checklist deleted successfully
 */
router.delete(
  '/:id',
  restrictTo('consultant'),
  checklistController.deleteChecklist
);

module.exports = router;

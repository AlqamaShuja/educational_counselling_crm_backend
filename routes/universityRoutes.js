const express = require('express');
const router = express.Router();
const universityController = require('../controllers/universityController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

/**
 * @swagger
 * tags:
 *   name: University
 *   description: University management
 */

/**
 * @swagger
 * /api/v1/universities:
 *   post:
 *     summary: Create a new university
 *     tags: [University]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 example: University
 *               country:
 *                 type: string
 *                 example: Pakistan
 *               city:
 *                 type: string
 *                 example: Karachi
 *               website:
 *                 type: string
 *               mouStatus:
 *                 type: string
 *                 enum: [none, direct, third_party]
 *                 example: direct
 *               details:
 *                 type: object
 *                 example: {}
 *     responses:
 *       201:
 *         description: University created
 */
router.post('/', protect, restrictTo('super_admin'), universityController.createUniversity);

/**
 * @swagger
 * /api/v1/universities:
 *   get:
 *     summary: Get all universities
 *     tags: [University]
 *     responses:
 *       200:
 *         description: List of universities
 */
router.get('/', universityController.getAllUniversities);

/**
 * @swagger
 * /api/v1/universities/unassigned:
 *   get:
 *     summary: Get all unassigned courses
 *     tags: [University]
 *     description: Returns all courses that are not assigned to any university.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of unassigned courses
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Course'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/unassigned', protect, restrictTo('super_admin'), universityController.getUnAssignCourses);

/**
 * @swagger
 * /api/v1/universities/{id}:
 *   get:
 *     summary: Get university by ID
 *     tags: [University]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: University ID
 *     responses:
 *       200:
 *         description: University data
 *       404:
 *         description: Not found
 */
router.get('/:id', universityController.getUniversityById);

/**
 * @swagger
 * /api/v1/universities/{id}:
 *   put:
 *     summary: Update university by ID
 *     tags: [University]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: University ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               country:
 *                 type: string
 *               website:
 *                 type: string
 *               mouStatus:
 *                 type: string
 *                 enum: [none, direct, third_party]
 *               details:
 *                 type: object
 *                 example: {}
 *     responses:
 *       200:
 *         description: University updated
 *       404:
 *         description: Not found
 */
router.put('/:id', protect, restrictTo('super_admin'), universityController.updateUniversity);

/**
 * @swagger
 * /api/v1/universities/{id}:
 *   delete:
 *     summary: Delete university
 *     tags: [University]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: University ID
 *     responses:
 *       204:
 *         description: Deleted successfully
 *       404:
 *         description: Not found
 */
router.delete('/:id', protect, restrictTo('super_admin'), universityController.deleteUniversity);

/**
 * @swagger
 * /api/v1/universities/{id}/courses:
 *   get:
 *     summary: Get all courses for a specific university
 *     tags: [University]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: University ID
 *     responses:
 *       200:
 *         description: List of courses
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Course'
 *       404:
 *         description: University not found
 */
router.get('/:id/courses', universityController.getCoursesByUniversityId);

module.exports = router;

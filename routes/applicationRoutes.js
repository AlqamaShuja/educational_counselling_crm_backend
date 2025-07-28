const express = require('express');
const router = express.Router();
const applicationController = require('../controllers/applicationController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

// ===========================
// STUDENT APPLICATION ROUTES
// ===========================

/**
 * @swagger
 * /api/v1/applications/student/eligibility:
 *   get:
 *     summary: Check application eligibility
 *     tags: [Student - Applications]
 *     description: Checks if student profile and documents are complete for application submission
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Eligibility status retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 eligible:
 *                   type: boolean
 *                 completionPercentage:
 *                   type: number
 *                 missingFields:
 *                   type: array
 *                   items:
 *                     type: string
 *                 missingDocuments:
 *                   type: array
 *                   items:
 *                     type: string
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Student profile not found
 */
router.get('/student/eligibility', protect, restrictTo('student'), applicationController.checkEligibility);

/**
 * @swagger
 * /api/v1/applications/student/create:
 *   post:
 *     summary: Create new application
 *     tags: [Student - Applications]
 *     description: Creates a new application for the authenticated student
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       201:
 *         description: Application created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 application:
 *                   $ref: '#/components/schemas/Application'
 *       400:
 *         description: Student already has an active application
 *       401:
 *         description: Unauthorized
 */
router.post('/student/create', protect, restrictTo('student'), applicationController.createApplication);

/**
 * @swagger
 * /api/v1/applications/student/universities:
 *   get:
 *     summary: Get available universities
 *     tags: [Student - Applications]
 *     description: Retrieves list of available universities and programs
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: country
 *         schema:
 *           type: string
 *         description: Filter by country
 *       - in: query
 *         name: program
 *         schema:
 *           type: string
 *         description: Filter by program name
 *     responses:
 *       200:
 *         description: Universities retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 universities:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: number
 *                       universityName:
 *                         type: string
 *                       country:
 *                         type: string
 *                       programs:
 *                         type: array
 *       401:
 *         description: Unauthorized
 */
router.get('/student/universities', protect, restrictTo('student'), applicationController.getUniversities);

/**
 * @swagger
 * /api/v1/applications/student/{id}/universities:
 *   put:
 *     summary: Select universities for application
 *     tags: [Student - Applications]
 *     description: Selects universities and programs for the application
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Application ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - universitySelections
 *             properties:
 *               universitySelections:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     universityId:
 *                       type: number
 *                     universityName:
 *                       type: string
 *                     programId:
 *                       type: number
 *                     programName:
 *                       type: string
 *                     country:
 *                       type: string
 *     responses:
 *       200:
 *         description: Universities selected successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Application not found
 */
router.put('/student/:id/universities', protect, restrictTo('student'), applicationController.selectUniversities);

/**
 * @swagger
 * /api/v1/applications/student/{id}/submit:
 *   post:
 *     summary: Submit application
 *     tags: [Student - Applications]
 *     description: Submits the application to selected universities
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Application ID
 *     responses:
 *       200:
 *         description: Application submitted successfully
 *       400:
 *         description: Universities not selected
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Application not found
 */
router.post('/student/:id/submit', protect, restrictTo('student'), applicationController.submitApplication);

/**
 * @swagger
 * /api/v1/applications/student/my-applications:
 *   get:
 *     summary: Get my applications
 *     tags: [Student - Applications]
 *     description: Retrieves all applications for the authenticated student
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Applications retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 applications:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Application'
 *       401:
 *         description: Unauthorized
 */
router.get('/student/my-applications', protect, restrictTo('student'), applicationController.getMyApplications);

/**
 * @swagger
 * /api/v1/applications/student/{id}/offers:
 *   put:
 *     summary: Manage offer letters
 *     tags: [Student - Applications]
 *     description: Add, accept, or reject offer letters
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Application ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - action
 *             properties:
 *               action:
 *                 type: string
 *                 enum: [add, accept, reject]
 *               offerId:
 *                 type: number
 *               universityId:
 *                 type: number
 *               universityName:
 *                 type: string
 *               programName:
 *                 type: string
 *               conditions:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Offers updated successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Application not found
 */
router.put('/student/:id/offers', protect, restrictTo('student'), applicationController.manageOffers);

// ===========================
// CONSULTANT APPLICATION ROUTES
// ===========================

/**
 * @swagger
 * /api/v1/applications/consultant/applications:
 *   get:
 *     summary: Get assigned applications
 *     tags: [Consultant - Applications]
 *     description: Retrieves all applications assigned to the consultant
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Applications retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 applications:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Application'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/consultant/applications', protect, restrictTo('consultant'), applicationController.getAssignedApplications);

/**
 * @swagger
 * /api/v1/applications/consultant/{id}/review:
 *   put:
 *     summary: Review application
 *     tags: [Consultant - Applications]
 *     description: Reviews and updates application status and stage
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Application ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [draft, in_review, submitted, offers_received, accepted, rejected, visa_applied, completed]
 *               stage:
 *                 type: string
 *                 enum: [profile_review, university_selection, document_preparation, submission, offer_management, visa_application, completed]
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Application reviewed successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Application not found
 */
router.put('/consultant/:id/review', protect, restrictTo('consultant'), applicationController.reviewApplication);

/**
 * @swagger
 * /api/v1/applications/consultant/{id}/status:
 *   put:
 *     summary: Update application status
 *     tags: [Consultant - Applications]
 *     description: Updates application status and stage
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Application ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [draft, in_review, submitted, offers_received, accepted, rejected, visa_applied, completed]
 *               stage:
 *                 type: string
 *                 enum: [profile_review, university_selection, document_preparation, submission, offer_management, visa_application, completed]
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Application status updated successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Application not found
 */
router.put('/consultant/:id/status', protect, restrictTo('consultant'), applicationController.updateApplicationStatus);

// ===========================
// SUPER ADMIN APPLICATION ROUTES
// ===========================

/**
 * @swagger
 * /api/v1/applications/super-admin/applications:
 *   get:
 *     summary: Get all applications
 *     tags: [SuperAdmin - Applications]
 *     description: Retrieves all applications in the system
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, in_review, submitted, offers_received, accepted, rejected, visa_applied, completed]
 *         description: Filter by status
 *       - in: query
 *         name: stage
 *         schema:
 *           type: string
 *           enum: [profile_review, university_selection, document_preparation, submission, offer_management, visa_application, completed]
 *         description: Filter by stage
 *     responses:
 *       200:
 *         description: Applications retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 count:
 *                   type: number
 *                 applications:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Application'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/super-admin/applications', protect, restrictTo('super_admin'), applicationController.getAllApplications);

/**
 * @swagger
 * /api/v1/applications/super-admin/statistics:
 *   get:
 *     summary: Get application statistics
 *     tags: [SuperAdmin - Applications]
 *     description: Retrieves application statistics and metrics
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 stats:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: number
 *                     byStatus:
 *                       type: array
 *                     byStage:
 *                       type: array
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/super-admin/statistics', protect, restrictTo('super_admin'), applicationController.getApplicationStats);

module.exports = router;
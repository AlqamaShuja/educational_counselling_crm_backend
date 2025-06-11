const express = require('express');
const router = express.Router();
const studentController = require('../controllers/studentController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

// Protect all routes and restrict to student role
router.use(protect, restrictTo('student'));

/**
 * @swagger
 * /api/v1/student/profile:
 *   post:
 *     summary: Create student profile
 *     tags: [Student]
 *     description: Creates a profile for the authenticated student.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - personalInfo
 *               - educationalBackground
 *               - studyPreferences
 *             properties:
 *               personalInfo:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *                     example: John Doe
 *                   email:
 *                     type: string
 *                     format: email
 *                     example: john.doe@example.com
 *                   phone:
 *                     type: string
 *                     example: +1234567890
 *                   dob:
 *                     type: string
 *                     format: date
 *                     example: 2000-01-01
 *                   gender:
 *                     type: string
 *                     example: Male
 *                   nationality:
 *                     type: string
 *                     example: USA
 *               educationalBackground:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     institution:
 *                       type: string
 *                     degree:
 *                       type: string
 *                     year:
 *                       type: number
 *               studyPreferences:
 *                 type: object
 *                 properties:
 *                   destination:
 *                     type: string
 *                     example: Canada
 *                   level:
 *                     type: string
 *                     example: Undergraduate
 *                   fields:
 *                     type: array
 *                     items:
 *                       type: string
 *                     example: [Computer Science]
 *     responses:
 *       201:
 *         description: Profile created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StudentProfile'
 *       400:
 *         description: Invalid input
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Missing required fields
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Authentication failed: No token provided
 *       403:
 *         description: Forbidden (non-student role)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Access denied: insufficient permissions
 */
router.post('/profile', studentController.createProfile);

/**
 * @swagger
 * /api/v1/student/profile:
 *   put:
 *     summary: Update student profile
 *     tags: [Student]
 *     description: Updates the authenticated student's profile.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               personalInfo:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *                   email:
 *                     type: string
 *                     format: email
 *                   phone:
 *                     type: string
 *                   dob:
 *                     type: string
 *                     format: date
 *                   gender:
 *                     type: string
 *                   nationality:
 *                     type: string
 *               educationalBackground:
 *                 type: array
 *                 items:
 *                   type: object
 *               studyPreferences:
 *                 type: object
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StudentProfile'
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.put('/profile', studentController.updateProfile);

/**
 * @swagger
 * /api/v1/student/applications:
 *   get:
 *     summary: Get application status
 *     tags: [Student]
 *     description: Retrieves the status of the student's applications.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Application status retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     format: uuid
 *                   status:
 *                     type: string
 *                     example: Submitted
 *                   institution:
 *                     type: string
 *                     example: University of Toronto
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/applications', studentController.getApplicationStatus);

/**
 * @swagger
 * /api/v1/student/tasks:
 *   get:
 *     summary: Get pending tasks
 *     tags: [Student]
 *     description: Retrieves all pending tasks for the student.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Pending tasks retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     format: uuid
 *                   description:
 *                     type: string
 *                     example: Submit transcript
 *                   dueDate:
 *                     type: string
 *                     format: date-time
 *                     example: 2025-06-15T23:59:59Z
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/tasks', studentController.getPendingTasks);

/**
 * @swagger
 * /api/v1/student/appointments:
 *   get:
 *     summary: Get upcoming appointments
 *     tags: [Student]
 *     description: Retrieves all upcoming appointments for the student.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Upcoming appointments retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Appointment'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/appointments', studentController.getUpcomingAppointments);

/**
 * @swagger
 * /api/v1/student/appointments:
 *   post:
 *     summary: Book appointment
 *     tags: [Student]
 *     description: Books an appointment with a consultant for the student.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - consultantId
 *               - dateTime
 *               - type
 *             properties:
 *               consultantId:
 *                 type: string
 *                 format: uuid
 *                 example: 98765432-12d3-4e5f-a678-426614174000
 *               dateTime:
 *                 type: string
 *                 format: date-time
 *                 example: 2025-06-10T14:00:00Z
 *               type:
 *                 type: string
 *                 enum: [in_person, virtual]
 *                 example: virtual
 *               notes:
 *                 type: string
 *                 example: Discuss application requirements
 *     responses:
 *       201:
 *         description: Appointment booked successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Appointment'
 *       400:
 *         description: Invalid input or slot unavailable
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post('/appointments', studentController.bookAppointment);

/**
 * @swagger
 * /api/v1/student/meetings/join:
 *   post:
 *     summary: Join meeting
 *     tags: [Student]
 *     description: Allows the student to join a scheduled virtual meeting.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - appointmentId
 *             properties:
 *               appointmentId:
 *                 type: string
 *                 format: uuid
 *                 example: 123e4567-e89b-12d3-a456-426614174000
 *     responses:
 *       200:
 *         description: Meeting joined successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 meetingUrl:
 *                   type: string
 *                   example: https://zoom.us/j/123456789
 *       400:
 *         description: Invalid appointment
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Appointment not found
 */
router.post('/meetings/join', studentController.joinMeeting);

/**
 * @swagger
 * /api/v1/student/messages:
 *   post:
 *     summary: Send message to consultant
 *     tags: [Student]
 *     description: Sends a message to the assigned consultant.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - message
 *             properties:
 *               message:
 *                 type: string
 *                 example: I have a question about my application.
 *     responses:
 *       200:
 *         description: Message sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Message sent
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post('/messages', studentController.sendMessage);

/**
 * @swagger
 * /api/v1/student/communication:
 *   get:
 *     summary: Get communication history
 *     tags: [Student]
 *     description: Retrieves the communication history with the consultant.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Communication history retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   type:
 *                     type: string
 *                     enum: [message, notification, meeting]
 *                   content:
 *                     type: string
 *                   timestamp:
 *                     type: string
 *                     format: date-time
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/communication', studentController.getCommunicationHistory);

/**
 * @swagger
 * /api/v1/student/reviews/documents:
 *   post:
 *     summary: Upload review documents
 *     tags: [Student]
 *     description: Uploads documents requested for profile review.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               type:
 *                 type: string
 *                 enum: [passport, cnic, transcript, test_score, degree, experience_letter, bank_statement, photo, other]
 *                 example: transcript
 *     responses:
 *       200:
 *         description: Document uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Document'
 *       400:
 *         description: Missing file or invalid type
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post('/reviews/documents', studentController.uploadReviewDocuments);

/**
 * @swagger
 * /api/v1/student/reviews/profile:
 *   put:
 *     summary: Update profile information
 *     tags: [Student]
 *     description: Updates specific profile information in response to a review request.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               personalInfo:
 *                 type: object
 *               educationalBackground:
 *                 type: array
 *                 items:
 *                   type: object
 *               studyPreferences:
 *                 type: object
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StudentProfile'
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.put('/reviews/profile', studentController.updateProfileInfo);

/**
 * @swagger
 * /api/v1/student/reviews/clarifications:
 *   post:
 *     summary: Submit clarifications
 *     tags: [Student]
 *     description: Submits clarifications in response to a profile review request.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - clarification
 *             properties:
 *               clarification:
 *                 type: string
 *                 example: My transcript is from an international institution.
 *     responses:
 *       200:
 *         description: Clarification submitted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Clarification submitted
 *       400:
 *         description: Missing clarification
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post('/reviews/clarifications', studentController.submitClarifications);

/**
 * @swagger
 * /api/v1/student/reviews:
 *   get:
 *     summary: Get review status
 *     tags: [Student]
 *     description: Retrieves the status of profile review requests.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Review status retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     format: uuid
 *                   status:
 *                     type: string
 *                     enum: [pending, approved, rejected]
 *                   comments:
 *                     type: string
 *                     example: Please provide updated transcript
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/reviews', studentController.getReviewStatus);

/**
 * @swagger
 * /api/v1/student/checklist:
 *   get:
 *     summary: Get application checklist
 *     tags: [Student]
 *     description: Retrieves the application checklist for the student.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Checklist retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   task:
 *                     type: string
 *                     example: Submit transcript
 *                   status:
 *                     type: string
 *                     enum: [pending, completed]
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/checklist', studentController.getApplicationChecklist);

/**
 * @swagger
 * /api/v1/student/calendar:
 *   get:
 *     summary: Get deadline calendar
 *     tags: [Student]
 *     description: Retrieves a calendar of application deadlines and appointments.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Calendar retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   event:
 *                     type: string
 *                     example: Application deadline
 *                   dateTime:
 *                     type: string
 *                     format: date-time
 *                     example: 2025-06-20T23:59:59Z
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/calendar', studentController.getDeadlineCalendar);

/**
 * @swagger
 * /api/v1/student/documents/status:
 *   get:
 *     summary: Get document status
 *     tags: [Student]
 *     description: Retrieves the status of submitted documents.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Document status retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Document'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/documents/status', studentController.getDocumentStatus);

/**
 * @swagger
 * /api/v1/student/summaries:
 *   get:
 *     summary: Download application summary
 *     tags: [Student]
 *     description: Downloads a summary of the student's application in PDF or Excel format.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Application summary downloaded
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/summaries', studentController.downloadApplicationSummary);

module.exports = router;
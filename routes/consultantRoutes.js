const express = require('express');
const router = express.Router();
const consultantController = require('../controllers/consultantController');
const { protect, restrictTo } = require('../middleware/authMiddleware');
const { upload } = require('../middleware/multer');

// Protect all routes and restrict to consultant role
router.use(protect, restrictTo('consultant'));

/**
 * @swagger
 * /api/v1/consultant/leads:
 *   get:
 *     summary: Get assigned leads with student profiles
 *     tags: [Consultant]
 *     description: Retrieves all leads assigned to the consultant, including student and profile info.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of leads
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
 *                   studentId:
 *                     type: string
 *                   officeId:
 *                     type: string
 *                   assignedConsultant:
 *                     type: string
 *                   status:
 *                     type: string
 *                     enum: [new, in_progress, converted, lost]
 *                   source:
 *                     type: string
 *                     enum: [walk_in, online, referral]
 *                   studyPreferences:
 *                     type: object
 *                   languagePreference:
 *                     type: string
 *                   history:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         note:
 *                           type: string
 *                         timestamp:
 *                           type: string
 *                         userId:
 *                           type: string
 *                   student:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       email:
 *                         type: string
 *                       phone:
 *                         type: string
 *                       profile:
 *                         type: object
 *                         properties:
 *                           personalInfo:
 *                             type: object
 *                           educationalBackground:
 *                             type: object
 *                           studyPreferences:
 *                             type: object
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/leads', consultantController.getAssignedLeads);

/**
 * @swagger
 * /api/v1/consultant/leads/{id}/tasks:
 *   get:
 *     summary: Get tasks for a lead
 *     tags: [Consultant]
 *     description: Retrieves all tasks associated with a lead assigned to the consultant.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Lead ID
 *     responses:
 *       200:
 *         description: List of tasks
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
 *                   dueDate:
 *                     type: string
 *                     format: date-time
 *                   status:
 *                     type: string
 *                     enum: [pending, completed]
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Lead not found
 */
router.get('/leads/:id/tasks', consultantController.getLeadTasks);

/**
 * @swagger
 * /api/v1/consultant/tasks:
 *   get:
 *     summary: Get all tasks for leads assigned to the consultant
 *     tags: [Consultant]
 *     description: Retrieves all tasks associated with all leads assigned to the authenticated consultant.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of tasks for all assigned leads
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
 *                     description: Task ID
 *                   description:
 *                     type: string
 *                     description: Task description
 *                   dueDate:
 *                     type: string
 *                     format: date-time
 *                     description: Task due date
 *                   status:
 *                     type: string
 *                     enum: [pending, completed]
 *                     description: Task status
 *                   leadId:
 *                     type: string
 *                     format: uuid
 *                     description: ID of the associated lead
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - User is not a consultant
 *       404:
 *         description: No leads assigned to consultant
 */
router.get('/tasks', consultantController.getAllLeadTasks);

/**
 * @swagger
 * /api/v1/consultant/tasks/{id}:
 *   put:
 *     summary: Update a task and notify the lead
 *     tags: [Consultant]
 *     description: Updates a task associated with a lead assigned to the authenticated consultant and notifies the lead (student) via in-app notification and/or email based on their preferences.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID of the task to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - description
 *               - dueDate
 *               - status
 *               - leadId
 *             properties:
 *               description:
 *                 type: string
 *                 description: Task description
 *                 example: Follow up with student
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *                 description: Task due date
 *                 example: 2025-07-01T10:00:00.000Z
 *               status:
 *                 type: string
 *                 enum: [pending, in_progress, completed, cancelled]
 *                 description: Task status
 *                 example: pending
 *               leadId:
 *                 type: string
 *                 format: uuid
 *                 description: ID of the associated lead
 *                 example: 123e4567-e89b-12d3-a456-426614174000
 *               notes:
 *                 type: string
 *                 description: Additional notes for the task
 *                 example: Discuss study preferences
 *     responses:
 *       200:
 *         description: Task updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                 description:
 *                   type: string
 *                 dueDate:
 *                   type: string
 *                   format: date-time
 *                 status:
 *                   type: string
 *                   enum: [pending, in_progress, completed, cancelled]
 *                 leadId:
 *                   type: string
 *                   format: uuid
 *                 notes:
 *                   type: string
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - User is not a consultant
 *       404:
 *         description: Task not found, lead not found, or not associated with consultant’s lead
 */
router.put('/tasks/:id', consultantController.editLeadTask);

/**
 * @swagger
 * /api/v1/consultant/tasks/{id}:
 *   delete:
 *     summary: Delete a task and notify the lead
 *     tags: [Consultant]
 *     description: Deletes a task associated with a lead assigned to the authenticated consultant and notifies the lead (student) via in-app notification and/or email based on their preferences.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID of the task to delete
 *     responses:
 *       200:
 *         description: Task deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Task deleted successfully
 *       401:
 *         description: Unauthorized - Invalid or missing token
 *       403:
 *         description: Forbidden - User is not a consultant
 *       404:
 *         description: Task not found, student not found, or not associated with consultant’s lead
 */
router.delete('/tasks/:id', consultantController.deleteLeadTask);

/**
 * @swagger
 * /api/v1/consultant/leads/{id}/documents:
 *   get:
 *     summary: Get documents for a lead
 *     tags: [Consultant]
 *     description: Retrieves all documents associated with a lead assigned to the consultant.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Lead ID
 *     responses:
 *       200:
 *         description: List of documents
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
 *                   type:
 *                     type: string
 *                   url:
 *                     type: string
 *                   notes:
 *                     type: string
 *                   uploadedAt:
 *                     type: string
 *                     format: date-time
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Lead not found
 */
router.get('/leads/:id/documents', consultantController.getLeadDocuments);

/**
 * @swagger
 * /api/v1/consultant/documents/{id}/status:
 *   put:
 *     summary: Update document status
 *     tags: [Consultant]
 *     description: Updates the status of a document (pending, approved, rejected).
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Document ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending, approved, rejected]
 *                 example: approved
 *               notes:
 *                 type: string
 *                 example: Document is valid and approved
 *     responses:
 *       200:
 *         description: Document status updated successfully
 *       404:
 *         description: Document not found
 *       403:
 *         description: Unauthorized to update this document
 */
router.put('/documents/:id/status', consultantController.updateDocumentStatus);

/**
 * @swagger
 * /api/v1/consultant/leads/{id}/status:
 *   put:
 *     summary: Update lead status
 *     tags: [Consultant]
 *     description: Updates the status of a lead assigned to the consultant.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Lead ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [new, in_progress, converted, lost]
 *                 example: in_progress
 *     responses:
 *       200:
 *         description: Lead status updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Lead'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Lead not found or not assigned to consultant
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Lead not found
 */
router.put('/leads/:id/status', consultantController.updateLeadStatus);

/**
 * @swagger
 * /api/v1/consultant/leads/{id}/notes:
 *   post:
 *     summary: Add consultation notes to a lead
 *     tags: [Consultant]
 *     description: Adds a note to the history of a lead assigned to the consultant.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Lead ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - note
 *             properties:
 *               note:
 *                 type: string
 *                 example: Discussed study preferences with student.
 *     responses:
 *       200:
 *         description: Note added successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Lead'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Lead not found
 */
router.post('/leads/:id/notes', consultantController.addConsultationNotes);

/**
 * @swagger
 * /api/v1/consultant/leads/{id}/documents:
 *   post:
 *     summary: Upload documents for a lead
 *     tags: [Consultant]
 *     description: Uploads one or more documents for a lead's student (e.g., passport, transcript) with individual types and notes.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Lead ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Array of files to upload
 *               types:
 *                 type: string
 *                 description: JSON array of document types
 *                 example: '["passport", "transcript"]'
 *               notes:
 *                 type: string
 *                 description: JSON array of notes for each document (optional)
 *                 example: '["Valid passport copy", "Academic transcript"]'
 *     responses:
 *       200:
 *         description: Document(s) uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Document'
 *       400:
 *         description: Missing file(s), invalid types, or mismatched arrays
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: File(s), types, and notes arrays must have equal length
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Lead not found
 */
router.post(
  '/leads/:id/documents',
  upload.array('files', 10),
  consultantController.uploadLeadDocument
);

/**
 * @swagger
 * /api/v1/consultant/leads/{id}/tasks:
 *   post:
 *     summary: Set follow-up task for a lead
 *     tags: [Consultant]
 *     description: Creates a follow-up task for a lead assigned to the consultant.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Lead ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               description:
 *                 type: string
 *                 example: Follow up on application documents
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *                 example: 2025-06-15T10:00:00Z
 *     responses:
 *       200:
 *         description: Task set successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Task set
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Lead not found
 */
router.post('/leads/:id/tasks', consultantController.setFollowUpTask);

/**
 * @swagger
 * /api/v1/consultant/students/{id}/profile:
 *   get:
 *     summary: Get student profile
 *     tags: [Consultant]
 *     description: Retrieves the profile of a student associated with a lead assigned to the consultant.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Student ID
 *     responses:
 *       200:
 *         description: Student profile retrieved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StudentProfile'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Student not found or not assigned
 */
router.get('/students/:id/profile', consultantController.getStudentProfile);

/**
 * @swagger
 * /api/v1/consultant/students/{id}/review:
 *   post:
 *     summary: Request profile information
 *     tags: [Consultant]
 *     description: Requests additional information for a student's profile.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Student ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *                 example: Please provide your latest transcript.
 *     responses:
 *       200:
 *         description: Info requested successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Info requested
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Student not found
 */
router.post('/students/:id/review', consultantController.requestProfileInfo);

/**
 * @swagger
 * /api/v1/consultant/students/{id}/notifications:
 *   post:
 *     summary: Send review notification
 *     tags: [Consultant]
 *     description: Sends a notification to a student regarding their profile review.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Student ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *                 example: Your profile review is complete.
 *     responses:
 *       200:
 *         description: Notification sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Notification sent
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Student not found
 */
router.post(
  '/students/:id/notifications',
  consultantController.sendReviewNotification
);

/**
 * @swagger
 * /api/v1/consultant/students/{id}/messages:
 *   post:
 *     summary: Send message to student
 *     tags: [Consultant]
 *     description: Sends a message to a student associated with a lead.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Student ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               message:
 *                 type: string
 *                 example: Let's schedule a meeting to discuss your application.
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
 *       404:
 *         description: Student not found
 */
router.post('/students/:id/messages', consultantController.sendMessage);

/**
 * @swagger
 * /api/v1/consultant/students/{id}/meetings:
 *   post:
 *     summary: Schedule meeting with student
 *     tags: [Consultant]
 *     description: Schedules a meeting with a student.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Student ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               dateTime:
 *                 type: string
 *                 format: date-time
 *                 example: 2025-06-10T14:00:00Z
 *               type:
 *                 type: string
 *                 enum: [in_person, virtual]
 *                 example: virtual
 *     responses:
 *       200:
 *         description: Meeting scheduled successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Appointment'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Student not found
 */
router.post('/students/:id/meetings', consultantController.scheduleMeeting);

/**
 * @swagger
 * /api/v1/consultant/appointments/{id}:
 *   put:
 *     summary: Update appointment
 *     tags: [Consultant]
 *     description: Updates an existing appointment.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Appointment ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               dateTime:
 *                 type: string
 *                 format: date-time
 *               type:
 *                 type: string
 *                 enum: [in_person, virtual]
 *               status:
 *                 type: string
 *                 enum: [scheduled, completed, cancelled, no_show]
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: Appointment updated successfully
 *       404:
 *         description: Appointment not found
 */
router.put('/appointments/:id', consultantController.updateAppointment);

/**
 * @swagger
 * /api/v1/consultant/appointments/{id}:
 *   delete:
 *     summary: Delete appointment
 *     tags: [Consultant]
 *     description: Deletes an appointment.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Appointment ID
 *     responses:
 *       200:
 *         description: Appointment deleted successfully
 *       404:
 *         description: Appointment not found
 */
router.delete('/appointments/:id', consultantController.deleteAppointment);

/**
 * @swagger
 * /api/v1/consultant/appointments:
 *   get:
 *     summary: Get consultant appointments
 *     tags: [Consultant]
 *     description: Retrieves all appointments for the consultant.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of appointments
 */
router.get('/appointments', consultantController.getAppointments);

/**
 * @swagger
 * /api/v1/consultant/students/{id}/resources:
 *   post:
 *     summary: Share resources with student
 *     tags: [Consultant]
 *     description: Shares resources (e.g., documents, links) with a student.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Student ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               resources:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: [https://example.com/guide, /docs/template.pdf]
 *     responses:
 *       200:
 *         description: Resources shared successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Resources shared
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Student not found
 */
router.post('/students/:id/resources', consultantController.shareResources);

/**
 * @swagger
 * /api/v1/consultant/students/{id}/communication:
 *   get:
 *     summary: Get communication history
 *     tags: [Consultant]
 *     description: Retrieves the communication history with a student.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Student ID
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
 *       404:
 *         description: Student not found
 */
router.get(
  '/students/:id/communication',
  consultantController.getCommunicationHistory
);

/**
 * @swagger
 * /api/v1/consultant/students/{id}/messages/read:
 *   patch:
 *     summary: Mark messages as read
 *     tags: [Consultant]
 *     description: Marks all messages from a student to the authenticated counselor as read.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Student ID
 *     responses:
 *       200:
 *         description: Messages marked as read successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Messages marked as read
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Student or counselor not found
 */
router.patch(
  '/students/:id/messages/read',
  consultantController.markMessagesAsRead
);

/**
 * @swagger
 * /api/v1/consultant/students/{id}/checklist:
 *   post:
 *     summary: Create application checklist
 *     tags: [Consultant]
 *     description: Creates an application checklist for a student.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Student ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               items:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     task:
 *                       type: string
 *                     status:
 *                       type: string
 *                       enum: [pending, completed]
 *                 example:
 *                   - task: Submit transcript
 *                     status: pending
 *                   - task: Pay application fee
 *                     status: pending
 *     responses:
 *       200:
 *         description: Checklist created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 items:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       task:
 *                         type: string
 *                       status:
 *                         type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Student not found
 */
router.post(
  '/students/:id/checklist',
  consultantController.createApplicationChecklist
);

/**
 * @swagger
 * /api/v1/consultant/students/{id}/documents:
 *   put:
 *     summary: Track document submissions
 *     tags: [Consultant]
 *     description: Tracks the submission of multiple documents for a student's application.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Student ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *                 description: Array of files to upload
 *               types:
 *                 type: string
 *                 description: JSON array of document types
 *                 example: '["transcript", "passport"]'
 *               notes:
 *                 type: string
 *                 description: JSON array of notes for each document
 *                 example: '["Academic transcript", "Valid passport copy"]'
 *     responses:
 *       200:
 *         description: Documents tracked successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Document'
 *       400:
 *         description: Missing files, invalid types, or mismatched arrays
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Student not found
 */
router.put(
  '/students/:id/documents',
  upload.array('files', 10), // Allow up to 10 files
  consultantController.trackDocumentSubmission
);

/**
 * @swagger
 * /api/v1/consultant/students/{id}/reminders:
 *   post:
 *     summary: Set deadline reminder
 *     tags: [Consultant]
 *     description: Sets a reminder for an application deadline for a student.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Student ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - deadline
 *               - message
 *             properties:
 *               deadline:
 *                 type: string
 *                 format: date-time
 *                 example: "2025-06-20T23:59:59Z"
 *               message:
 *                 type: string
 *                 example: "Reminder: Submit application by June 20."
 *     responses:
 *       200:
 *         description: Reminder set successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Reminder set
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Student not found
 */

router.post(
  '/students/:id/reminders',
  consultantController.setDeadlineReminder
);

/**
 * @swagger
 * /api/v1/consultant/students/{id}/application-status:
 *   put:
 *     summary: Update application status
 *     tags: [Consultant]
 *     description: Updates the status of a student's application.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Student ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 example: submitted
 *     responses:
 *       200:
 *         description: Application status updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Status updated
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Student not found
 */
router.put(
  '/students/:id/application-status',
  consultantController.updateApplicationStatus
);

/**
 * @swagger
 * /api/v1/consultant/students/{id}/progress:
 *   get:
 *     summary: Get application progress
 *     tags: [Consultant]
 *     description: Retrieves the progress of a student's application.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Student ID
 *     responses:
 *       200:
 *         description: Application progress retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 checklist:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       task:
 *                         type: string
 *                       status:
 *                         type: string
 *                 applicationStatus:
 *                   type: string
 *                 deadlines:
 *                   type: array
 *                   items:
 *                     type: string
 *                     format: date-time
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Student not found
 */
router.get(
  '/students/:id/progress',
  consultantController.getApplicationProgress
);

/**
 * @swagger
 * /api/v1/consultant/leads/{id}/parked:
 *   put:
 *     summary: Update lead parked status
 *     tags: [Consultant]
 *     description: Updates the parked status of a lead assigned to the consultant.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Lead ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - parked
 *             properties:
 *               parked:
 *                 type: boolean
 *                 example: true
 *                 description: Whether to park (true) or unpark (false) the lead
 *     responses:
 *       200:
 *         description: Lead parked status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Lead parked successfully
 *                 lead:
 *                   $ref: '#/components/schemas/Lead'
 *       400:
 *         description: Invalid parked status value
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Parked status must be a boolean value
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Lead not found or not assigned to consultant
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Lead not found or not assigned to you
 */
router.put('/leads/:id/parked', consultantController.updateLeadParkedStatus);

module.exports = router;

const express = require('express');
const router = express.Router();
const managerController = require('../controllers/managerController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

// Protect all routes and restrict to manager role
router.use(protect, restrictTo('manager'));

/**
 * @swagger
 * /api/v1/manager/leads:
 *   post:
 *     summary: Create a new lead
 *     tags: [Manager]
 *     description: Creates a new lead and associated student from manager panel.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - studentData
 *               - studyPreferences
 *             properties:
 *               studentData:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *                     example: Jane Doe
 *                   email:
 *                     type: string
 *                     format: email
 *                     example: jane@example.com
 *                   phone:
 *                     type: string
 *                     example: +923001234567
 *               studyPreferences:
 *                 type: object
 *                 properties:
 *                   destination:
 *                     type: string
 *                     example: UK
 *                   level:
 *                     type: string
 *                     example: Postgraduate
 *                   fields:
 *                     type: array
 *                     items:
 *                       type: string
 *                     example: [Business, Finance]
 *               source:
 *                 type: string
 *                 enum: [walk_in, online, referral]
 *                 example: referral
 *               assignedConsultant:
 *                 type: string
 *                 format: uuid
 *                 example: 9f5f9fa3-3b1e-47f4-a9a7-2f4918241234
 *     responses:
 *       201:
 *         description: Lead created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Lead created successfully
 *                 lead:
 *                   $ref: '#/components/schemas/Lead'
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post('/leads', managerController.createLead);

/**
 * @swagger
 * /api/v1/manager/dashboard:
 *   get:
 *     summary: Get manager dashboard metrics
 *     tags: [Manager]
 *     description: Retrieves dashboard metrics for the manager’s office, such as lead counts and conversion rates.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard metrics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalLeads:
 *                   type: number
 *                   example: 100
 *                 convertedLeads:
 *                   type: number
 *                   example: 25
 *                 conversionRate:
 *                   type: number
 *                   example: 0.25
 *                 pendingAppointments:
 *                   type: number
 *                   example: 10
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/dashboard', managerController.getDashboard);

/**
 * @swagger
 * /api/v1/manager/staff/schedules:
 *   get:
 *     summary: Get staff schedules
 *     tags: [Manager]
 *     description: Retrieves appointment schedules for staff in the manager’s office.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Staff schedules retrieved successfully
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
router.get('/staff/schedules', managerController.getStaffSchedules);

/**
 * @swagger
 * /api/v1/manager/staff/{id}/interactions:
 *   get:
 *     summary: Get consultant interactions
 *     tags: [Manager]
 *     description: Retrieves lead interactions for a specific consultant in the manager’s office.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Consultant ID
 *     responses:
 *       200:
 *         description: Consultant interactions retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Lead'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Consultant not found
 */
router.get(
  '/staff/:id/interactions',
  managerController.getConsultantInteractions
);

/**
 * @swagger
 * /api/v1/manager/staff/{id}/notes:
 *   get:
 *     summary: Get consultation notes
 *     tags: [Manager]
 *     description: Retrieves notes from leads assigned to a specific consultant in the manager’s office.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Consultant ID
 *     responses:
 *       200:
 *         description: Consultation notes retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   note:
 *                     type: string
 *                     example: Client prefers UK universities
 *                   timestamp:
 *                     type: string
 *                     format: date-time
 *                     example: 2025-06-07T12:00:00Z
 *                   userId:
 *                     type: string
 *                     format: uuid
 *                     example: 9f5f9fa3-3b1e-47f4-a9a7-2f4918241234
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Consultant not found
 */
router.get('/staff/:id/notes', managerController.getConsultationNotes);

/**
 * @swagger
 * /api/v1/manager/leads/{id}/reassign:
 *   put:
 *     summary: Reassign a lead to a consultant
 *     tags: [Manager]
 *     description: Reassigns a lead to a different consultant within the manager’s office.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
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
 *               - consultantId
 *             properties:
 *               consultantId:
 *                 type: string
 *                 format: uuid
 *                 example: 9f5f9fa3-3b1e-47f4-a9a7-2f4918241234
 *     responses:
 *       200:
 *         description: Lead reassigned successfully
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
router.put('/leads/:id/reassign', managerController.reassignLead);

/**
 * @swagger
 * /api/v1/manager/staff/reports:
 *   get:
 *     summary: Get staff performance reports
 *     tags: [Manager]
 *     description: Retrieves performance reports for staff in the manager’s office.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Staff reports retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Report'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/staff/reports', managerController.getStaffReports);

/**
 * @swagger
 * /api/v1/manager/leads:
 *   get:
 *     summary: Get all office leads
 *     tags: [Manager]
 *     description: Retrieves all leads associated with the manager’s office.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of leads retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Lead'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/leads', managerController.getOfficeLeads);

/**
 * @swagger
 * /api/v1/manager/leads/{id}/assign:
 *   put:
 *     summary: Assign a lead to a consultant
 *     tags: [Manager]
 *     description: Assigns a lead to a specific consultant within the manager’s office.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
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
 *               - consultantId
 *             properties:
 *               consultantId:
 *                 type: string
 *                 format: uuid
 *                 example: 9f5f9fa3-3b1e-47f4-a9a7-2f4918241234
 *     responses:
 *       200:
 *         description: Lead assigned successfully
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
router.put('/leads/:id/assign', managerController.assignLead);

/**
 * @swagger
 * /api/v1/manager/leads/{id}/reminders:
 *   post:
 *     summary: Set a reminder for a lead
 *     tags: [Manager]
 *     description: Sets a reminder for a lead, stored in the lead’s history.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
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
 *               - message
 *               - dueDate
 *             properties:
 *               message:
 *                 type: string
 *                 example: Follow up with client
 *               dueDate:
 *                 type: string
 *                 format: date-time
 *                 example: 2025-06-10T14:00:00Z
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
 *         description: Lead not found
 */
router.post('/leads/:id/reminders', managerController.setLeadReminder);

/**
 * @swagger
 * /api/v1/manager/leads/{id}/notes:
 *   put:
 *     summary: Add notes to a lead
 *     tags: [Manager]
 *     description: Adds a note to a lead’s history.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
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
 *                 example: Client is interested in UK universities
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
router.put('/leads/:id/notes', managerController.addLeadNotes);

/**
 * @swagger
 * /api/v1/manager/leads/{id}/progress:
 *   get:
 *     summary: Get lead progress
 *     tags: [Manager]
 *     description: Retrieves the progress (status and history) of a specific lead.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Lead ID
 *     responses:
 *       200:
 *         description: Lead progress retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   format: uuid
 *                   example: 123e4567-e89b-12d3-a456-426614174000
 *                 status:
 *                   type: string
 *                   enum: [new, in_progress, converted, lost]
 *                   example: in_progress
 *                 history:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       note:
 *                         type: string
 *                         example: Lead reassigned
 *                       timestamp:
 *                         type: string
 *                         format: date-time
 *                         example: 2025-06-07T12:00:00Z
 *                       userId:
 *                         type: string
 *                         format: uuid
 *                         example: 9f5f9fa3-3b1e-47f4-a9a7-2f4918241234
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Lead not found
 */
router.get('/leads/:id/progress', managerController.getLeadProgress);

/**
 * @swagger
 * /api/v1/manager/consultants:
 *   get:
 *     summary: Get all consultants in manager's office
 *     tags: [Manager]
 *     description: Retrieves all active consultants assigned to the manager's office.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of consultants
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
 *                   example: 3
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         format: uuid
 *                       name:
 *                         type: string
 *                       email:
 *                         type: string
 *                       phone:
 *                         type: string
 *                       role:
 *                         type: string
 *                         example: consultant
 *       400:
 *         description: Manager not assigned to an office
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
 *                   example: Manager is not assigned to any office.
 *       401:
 *         description: Unauthorized
 */
router.get('/consultants', managerController.getOfficeConsultants);

module.exports = router;

const express = require('express');
const router = express.Router();
const managerController = require('../controllers/managerController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

// Protect all routes and restrict to manager role
router.use(protect, restrictTo('manager'));

/**
 * @swagger
 * /api/v1/manager/students:
 *   get:
 *     summary: Get students
 *     tags: [Manager]
 *     description: Retrieves students in the manager’s office.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Students retrieved successfully
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
 *                   name:
 *                     type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/students', managerController.getStudents);

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

// /**
//  * @swagger
//  * /api/v1/manager/staff/schedules:
//  *   get:
//  *     summary: Get staff schedules
//  *     tags: [Manager]
//  *     description: Retrieves appointment schedules for staff in the manager’s office.
//  *     security:
//  *       - BearerAuth: []
//  *     responses:
//  *       200:
//  *         description: Staff schedules retrieved successfully
//  *         content:
//  *           application/json:
//  *             schema:
//  *               type: array
//  *               items:
//  *                 $ref: '#/components/schemas/Appointment'
//  *       401:
//  *         description: Unauthorized
//  *       403:
//  *         description: Forbidden
//  */
// router.get('/staff/schedules', managerController.getStaffSchedules);

/**
 * @swagger
 * components:
 *   schemas:
 *     Appointment:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: The unique identifier for the appointment
 *         studentId:
 *           type: string
 *           format: uuid
 *           description: The ID of the student
 *         consultantId:
 *           type: string
 *           format: uuid
 *           description: The ID of the consultant (staff)
 *         officeId:
 *           type: string
 *           format: uuid
 *           description: The ID of the office
 *         dateTime:
 *           type: string
 *           format: date-time
 *           description: The start time of the appointment
 *         endTime:
 *           type: string
 *           format: date-time
 *           description: The end time of the appointment
 *         status:
 *           type: string
 *           enum: [scheduled, completed, canceled, no_show]
 *           description: The status of the appointment
 *         type:
 *           type: string
 *           enum: [in_person, virtual]
 *           description: The type of appointment
 *         notes:
 *           type: string
 *           description: Additional notes for the appointment
 *         staffName:
 *           type: string
 *           description: The name of the consultant
 */

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
 * /api/v1/manager/staff/schedules:
 *   post:
 *     summary: Create a new staff schedule
 *     tags: [Manager]
 *     description: Creates a new appointment schedule for a staff member in the manager’s office.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - studentId
 *               - dateTime
 *               - endTime
 *               - type
 *               - status
 *             properties:
 *               studentId:
 *                 type: string
 *                 format: uuid
 *                 description: The ID of the student
 *               consultantId:
 *                 type: string
 *                 format: uuid
 *                 description: The ID of the consultant (staff)
 *               dateTime:
 *                 type: string
 *                 format: date-time
 *                 description: The start time of the appointment
 *               endTime:
 *                 type: string
 *                 format: date-time
 *                 description: The end time of the appointment
 *               type:
 *                 type: string
 *                 enum: [in_person, virtual]
 *                 description: The type of appointment
 *               status:
 *                 type: string
 *                 enum: [scheduled, completed, canceled, no_show]
 *                 description: The status of the appointment
 *               notes:
 *                 type: string
 *                 description: Additional notes for the appointment
 *     responses:
 *       201:
 *         description: Schedule created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Appointment'
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post('/staff/schedules', managerController.createStaffSchedule);

/**
 * @swagger
 * /api/v1/manager/staff/schedules/{id}:
 *   put:
 *     summary: Update a staff schedule
 *     tags: [Manager]
 *     description: Updates an existing appointment schedule in the manager’s office.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The ID of the schedule to update
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - studentId
 *               - dateTime
 *               - endTime
 *               - type
 *               - status
 *             properties:
 *               studentId:
 *                 type: string
 *                 format: uuid
 *                 description: The ID of the student
 *               consultantId:
 *                 type: string
 *                 format: uuid
 *                 description: The ID of the consultant (staff)
 *               dateTime:
 *                 type: string
 *                 format: date-time
 *                 description: The start time of the appointment
 *               endTime:
 *                 type: string
 *                 format: date-time
 *                 description: The end time of the appointment
 *               type:
 *                 type: string
 *                 enum: [in_person, virtual]
 *                 description: The type of appointment
 *               status:
 *                 type: string
 *                 enum: [scheduled, completed, canceled, no_show]
 *                 description: The status of the appointment
 *               notes:
 *                 type: string
 *                 description: Additional notes for the appointment
 *     responses:
 *       200:
 *         description: Schedule updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Appointment'
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Schedule not found
 */
router.put('/staff/schedules/:id', managerController.updateStaffSchedule);

/**
 * @swagger
 * /api/v1/manager/staff/schedules/{id}:
 *   delete:
 *     summary: Delete a staff schedule
 *     tags: [Manager]
 *     description: Deletes an appointment schedule in the manager’s office.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: The ID of the schedule to delete
 *     responses:
 *       204:
 *         description: Schedule deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Schedule not found
 */
router.delete('/staff/schedules/:id', managerController.deleteStaffSchedule);

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

/**
 * @swagger
 * /api/v1/manager/staff:
 *   post:
 *     summary: Create a new consultant, receptionist, or student
 *     tags: [Manager]
 *     description: Creates a new user and assigns them to the manager's office. Consultants are also added to OfficeConsultants.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - role
 *               - name
 *               - email
 *               - phone
 *               - password
 *             properties:
 *               role:
 *                 type: string
 *                 enum: [consultant, receptionist, student]
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *               phone:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       201:
 *         description: Staff member created and assigned to office
 *       400:
 *         description: Validation error or manager not assigned to office
 *       500:
 *         description: Server error
 */
router.post('/staff', managerController.createStaffMember);

/**
 * @swagger
 * /api/v1/manager/staff/{id}:
 *   delete:
 *     summary: Disconnect a staff member from manager's office
 *     tags: [Manager]
 *     description: Removes a consultant from OfficeConsultants or unassigns any staff from manager's office without deleting the user.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID of the staff user to disconnect
 *     responses:
 *       200:
 *         description: User disconnected from office
 *       400:
 *         description: Manager not assigned to an office
 *       404:
 *         description: User not found
 *       500:
 *         description: Server error
 */
router.delete('/staff/:id', managerController.disconnectStaffMember);

module.exports = router;

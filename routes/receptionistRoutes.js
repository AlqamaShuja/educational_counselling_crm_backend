const express = require('express');
const router = express.Router();
const receptionistController = require('../controllers/receptionistController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

// Protect all routes and restrict to receptionist role
router.use(protect, restrictTo('receptionist'));

/**
 * @swagger
 * /api/v1/receptionist/leads/register:
 *   post:
 *     summary: Register walk-in student
 *     tags: [Receptionist]
 *     description: Registers a walk-in student as a lead in the system.
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
 *               - source
 *               - studyPreferences
 *             properties:
 *               studentId:
 *                 type: string
 *                 format: uuid
 *                 example: 123e4567-e89b-12d3-a456-426614174000
 *               source:
 *                 type: string
 *                 enum: [walk_in, online, referral]
 *                 example: walk_in
 *               studyPreferences:
 *                 type: object
 *                 properties:
 *                   destination:
 *                     type: string
 *                     example: Canada
 *                   level:
 *                     type: string
 *                     example: Undergraduate
 *                   budget:
 *                     type: number
 *                     example: 20000
 *                   fields:
 *                     type: array
 *                     items:
 *                       type: string
 *                     example: [Computer Science, Engineering]
 *     responses:
 *       201:
 *         description: Lead registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Lead'
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
 *         description: Forbidden (non-receptionist role)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Access denied: insufficient permissions
 */
router.post('/leads/register', receptionistController.registerWalkIn);

/**
 * @swagger
 * /api/v1/receptionist/leads/{id}/confirmation:
 *   get:
 *     summary: Get appointment confirmation
 *     tags: [Receptionist]
 *     description: Retrieves the appointment confirmation details for a lead.
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
 *         description: Appointment confirmation retrieved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Appointment'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Lead or appointment not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Appointment not found
 */
router.get('/leads/:id/confirmation', receptionistController.getAppointmentConfirmation);

/**
 * @swagger
 * /api/v1/receptionist/consultants/calendars:
 *   get:
 *     summary: Get consultant calendars
 *     tags: [Receptionist]
 *     description: Retrieves the availability calendars of consultants in the receptionist's office.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Consultant calendars retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   consultantId:
 *                     type: string
 *                     format: uuid
 *                   name:
 *                     type: string
 *                     example: John Doe
 *                   availability:
 *                     type: array
 *                     items:
 *                       type: object
 *                       properties:
 *                         dateTime:
 *                           type: string
 *                           format: date-time
 *                           example: 2025-06-10T10:00:00Z
 *                         status:
 *                           type: string
 *                           enum: [available, booked]
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/consultants/calendars', receptionistController.getConsultantCalendars);

/**
 * @swagger
 * /api/v1/receptionist/appointments:
 *   post:
 *     summary: Book appointment
 *     tags: [Receptionist]
 *     description: Books an appointment for a student with a consultant.
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
 *               - consultantId
 *               - dateTime
 *               - type
 *             properties:
 *               studentId:
 *                 type: string
 *                 format: uuid
 *                 example: 123e4567-e89b-12d3-a456-426614174000
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
 *                 example: in_person
 *               notes:
 *                 type: string
 *                 example: Initial consultation
 *     responses:
 *       201:
 *         description: Appointment booked successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Appointment'
 *       400:
 *         description: Invalid input or slot unavailable
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Slot unavailable
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post('/appointments', receptionistController.bookAppointment);

/**
 * @swagger
 * /api/v1/receptionist/appointments/{id}:
 *   put:
 *     summary: Reschedule appointment
 *     tags: [Receptionist]
 *     description: Reschedules an existing appointment to a new date and time.
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
 *             required:
 *               - dateTime
 *             properties:
 *               dateTime:
 *                 type: string
 *                 format: date-time
 *                 example: 2025-06-11T15:00:00Z
 *               notes:
 *                 type: string
 *                 example: Rescheduled due to student request
 *     responses:
 *       200:
 *         description: Appointment rescheduled successfully
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
 *       404:
 *         description: Appointment not found
 */
router.put('/appointments/:id', receptionistController.rescheduleAppointment);

/**
 * @swagger
 * /api/v1/receptionist/appointments/{id}:
 *   delete:
 *     summary: Cancel appointment
 *     tags: [Receptionist]
 *     description: Cancels an existing appointment.
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
 *         description: Appointment canceled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Appointment canceled
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Appointment not found
 */
router.delete('/appointments/:id', receptionistController.cancelAppointment);

/**
 * @swagger
 * /api/v1/receptionist/appointments/{id}/reminder:
 *   post:
 *     summary: Send appointment reminder
 *     tags: [Receptionist]
 *     description: Sends a reminder notification for an appointment.
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
 *               message:
 *                 type: string
 *                 example: Reminder: Your appointment is on June 10 at 2 PM.
 *     responses:
 *       200:
 *         description: Reminder sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Reminder sent
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Appointment not found
 */
router.post('/appointments/:id/reminder', receptionistController.sendAppointmentReminder);

/**
 * @swagger
 * /api/v1/receptionist/appointments/{id}/check-in:
 *   post:
 *     summary: Check in student for appointment
 *     tags: [Receptionist]
 *     description: Marks a student as checked in for their appointment.
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
 *         description: Student checked in successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Student checked in
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Appointment not found
 */
router.post('/appointments/:id/check-in', receptionistController.checkInStudent);

/**
 * @swagger
 * /api/v1/receptionist/appointments/waiting-list:
 *   get:
 *     summary: Get waiting list
 *     tags: [Receptionist]
 *     description: Retrieves the list of students waiting for appointments.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Waiting list retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   studentId:
 *                     type: string
 *                     format: uuid
 *                   name:
 *                     type: string
 *                     example: Jane Doe
 *                   requestedTime:
 *                     type: string
 *                     format: date-time
 *                     example: 2025-06-10T10:00:00Z
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/appointments/waiting-list', receptionistController.getWaitingList);

/**
 * @swagger
 * /api/v1/receptionist/leads/{id}/contact:
 *   put:
 *     summary: Update lead contact information
 *     tags: [Receptionist]
 *     description: Updates the contact details for a lead.
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
 *               phone:
 *                 type: string
 *                 example: +1234567890
 *               email:
 *                 type: string
 *                 format: email
 *                 example: student@example.com
 *     responses:
 *       200:
 *         description: Contact updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Lead'
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Lead not found
 */
router.put('/leads/:id/contact', receptionistController.updateLeadContact);

/**
 * @swagger
 * /api/v1/receptionist/leads/{id}/status:
 *   put:
 *     summary: Update lead status
 *     tags: [Receptionist]
 *     description: Updates the status of a lead.
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
 *       400:
 *         description: Invalid status
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Lead not found
 */
router.put('/leads/:id/status', receptionistController.updateLeadStatus);

/**
 * @swagger
 * /api/v1/receptionist/leads/{id}/notes:
 *   post:
 *     summary: Add notes to a lead
 *     tags: [Receptionist]
 *     description: Adds a note to the history of a lead.
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
 *                 example: Student inquired about visa requirements.
 *     responses:
 *       200:
 *         description: Note added successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Lead'
 *       400:
 *         description: Missing note
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Lead not found
 */
router.post('/leads/:id/notes', receptionistController.addLeadNotes);

/**
 * @swagger
 * /api/v1/receptionist/leads/{id}/history:
 *   get:
 *     summary: Get lead history
 *     tags: [Receptionist]
 *     description: Retrieves the history of actions and notes for a lead.
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
 *         description: Lead history retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   note:
 *                     type: string
 *                     example: Lead registered as walk-in
 *                   timestamp:
 *                     type: string
 *                     format: date-time
 *                     example: 2025-06-07T12:00:00Z
 *                   userId:
 *                     type: string
 *                     format: uuid
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Lead not found
 */
router.get('/leads/:id/history', receptionistController.getLeadHistory);

module.exports = router;
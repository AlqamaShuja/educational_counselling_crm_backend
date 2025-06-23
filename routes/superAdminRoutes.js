const express = require('express');
const router = express.Router();
const superAdminController = require('../controllers/superAdminController');
const { protect, restrictTo } = require('../middleware/authMiddleware');
const { validate, officeSchema } = require('../middleware/validator');

// Protect all routes and restrict to super_admin role
router.use(protect, restrictTo('super_admin'));

/**
 * @swagger
 * /api/v1/super-admin/dashboard:
 *   get:
 *     summary: Get super admin dashboard statistics
 *     tags: [SuperAdmin]
 *     description: Retrieves comprehensive dashboard statistics for super admin.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalOffices:
 *                   type: number
 *                   example: 5
 *                 totalStaff:
 *                   type: number
 *                   example: 25
 *                 totalStudents:
 *                   type: number
 *                   example: 150
 *                 totalCourses:
 *                   type: number
 *                   example: 40
 *                 totalLeads:
 *                   type: number
 *                   example: 75
 *                 totalUniversities:
 *                   type: number
 *                   example: 12
 *                 leadStatusBreakdown:
 *                   type: object
 *                   properties:
 *                     new:
 *                       type: number
 *                     in_progress:
 *                       type: number
 *                     converted:
 *                       type: number
 *                     lost:
 *                       type: number
 *                 officePerformance:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       officeName:
 *                         type: string
 *                       leadsCount:
 *                         type: number
 *                       conversionsCount:
 *                         type: number
 *                 recentActivities:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       description:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/dashboard', superAdminController.getDashboardStats);

/**
 * @swagger
 * /api/v1/super-admin/students:
 *   get:
 *     summary: Get all students
 *     tags: [SuperAdmin]
 *     security:
 *       - BearerAuth: []
 *     description: Fetch all users with the role 'student' along with their student profile.
 *     responses:
 *       200:
 *         description: List of students with profiles
 */

router.get('/students', superAdminController.getAllStudents);

/**
 * @swagger
 * /api/v1/super-admin/staff:
 *   get:
 *     summary: Get all staff (non-student)
 *     tags: [SuperAdmin]
 *     security:
 *       - BearerAuth: []
 *     description: Fetch all users with roles other than student.
 *     responses:
 *       200:
 *         description: List of staff members
 */

router.get('/staff', superAdminController.getAllStaff);

/**
 * @swagger
 * /api/v1/super-admin/offices:
 *   post:
 *     summary: Create a new office
 *     tags: [SuperAdmin]
 *     description: Creates a new office in the system.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - address
 *               - contact
 *               - officeHours
 *               - workingDays
 *               - serviceCapacity
 *             properties:
 *               name:
 *                 type: string
 *                 example: Toronto Branch
 *               address:
 *                 type: object
 *                 required:
 *                   - street
 *                   - city
 *                   - country
 *                 properties:
 *                   street:
 *                     type: string
 *                     example: 123 University Ave
 *                   city:
 *                     type: string
 *                     example: Toronto
 *                   state:
 *                     type: string
 *                     example: Ontario
 *                   postalCode:
 *                     type: string
 *                     example: M5V 3C6
 *                   country:
 *                     type: string
 *                     example: Canada
 *               contact:
 *                 type: object
 *                 required:
 *                   - phone
 *                   - email
 *                 properties:
 *                   phone:
 *                     type: string
 *                     example: +1-416-123-4567
 *                   email:
 *                     type: string
 *                     format: email
 *                     example: toronto@treklin.com
 *                   website:
 *                     type: string
 *                     example: https://www.example.com
 *               officeHours:
 *                 type: object
 *                 additionalProperties:
 *                   type: string
 *                 example:
 *                   Monday: "9:00 AM - 5:00 PM"
 *                   Tuesday: "9:00 AM - 5:00 PM"
 *                   Wednesday: "9:00 AM - 5:00 PM"
 *                   Thursday: "9:00 AM - 5:00 PM"
 *                   Friday: "9:00 AM - 5:00 PM"
 *                   Saturday: "Closed"
 *                   Sunday: "Closed"
 *               workingDays:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
 *               managerId:
 *                 type: string
 *                 format: uuid
 *                 example: 123e4567-e89b-12d3-a456-426614174000
 *               serviceCapacity:
 *                 type: object
 *                 required:
 *                   - maxAppointments
 *                   - maxConsultants
 *                 properties:
 *                   maxAppointments:
 *                     type: number
 *                     example: 20
 *                   maxConsultants:
 *                     type: number
 *                     example: 5
 *               isActive:
 *                 type: boolean
 *                 example: true
 *               consultants:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 example: ["123e4567-e89b-12d3-a456-426614174000"]
 *     responses:
 *       201:
 *         description: Office created successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post(
  '/offices',
  validate(officeSchema),
  superAdminController.createOffice
);

/**
 * @swagger
 * /api/v1/super-admin/offices/{id}:
 *   put:
 *     summary: Update office details
 *     tags: [SuperAdmin]
 *     description: Updates the details of an existing office.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Office ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: Toronto Branch
 *               address:
 *                 type: object
 *                 properties:
 *                   street:
 *                     type: string
 *                     example: 123 University Ave
 *                   city:
 *                     type: string
 *                     example: Toronto
 *                   country:
 *                     type: string
 *                     example: Canada
 *               contact:
 *                 type: object
 *                 properties:
 *                   phone:
 *                     type: string
 *                     example: +1-416-123-4567
 *                   email:
 *                     type: string
 *                     format: email
 *                     example: toronto@treklin.com
 *               officeHours:
 *                 type: object
 *                 additionalProperties:
 *                   type: string
 *                 example:
 *                   Monday: "9am-5pm"
 *                   Tuesday: "9am-5pm"
 *               workingDays:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]
 *               serviceCapacity:
 *                 type: object
 *                 properties:
 *                   maxAppointments:
 *                     type: number
 *                     example: 20
 *                   maxConsultants:
 *                     type: number
 *                     example: 5
 *               isActive:
 *                 type: boolean
 *                 example: true
 *               managerId:
 *                 type: string
 *                 format: uuid
 *                 example: 123e4567-e89b-12d3-a456-426614174000
 *               consultants:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *                 example: ["123e4567-e89b-12d3-a456-426614174000", "223e4567-e89b-12d3-a456-426614174001"]
 *     responses:
 *       200:
 *         description: Office updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Office'
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Office not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Office not found
 */
router.put('/offices/:id', superAdminController.updateOffice);

/**
 * @swagger
 * /api/v1/super-admin/offices/{id}/status:
 *   patch:
 *     summary: Toggle office status
 *     tags: [SuperAdmin]
 *     description: Toggles the active/inactive status of an office.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Office ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - isActive
 *             properties:
 *               isActive:
 *                 type: boolean
 *                 example: false
 *     responses:
 *       200:
 *         description: Office status toggled
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Office'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Office not found
 */
router.patch('/offices/:id/status', superAdminController.toggleOfficeStatus);

/**
 * @swagger
 * /api/v1/super-admin/offices:
 *   get:
 *     summary: Get all offices
 *     tags: [SuperAdmin]
 *     description: Retrieves a list of all offices in the system.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of offices
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Office'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/offices', superAdminController.getAllOffices);

/**
 * @swagger
 * /api/v1/super-admin/offices/{id}:
 *   get:
 *     summary: Get office by ID
 *     tags: [SuperAdmin]
 *     description: Retrieves the details of a specific office by ID.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the office
 *     responses:
 *       200:
 *         description: Office details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Office'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/office/:id', superAdminController.getAllOfficeDetails);

/**
 * @swagger
 * /api/v1/super-admin/offices/{id}/performance:
 *   get:
 *     summary: Get office performance
 *     tags: [SuperAdmin]
 *     description: Retrieves performance metrics for a specific office.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Office ID
 *     responses:
 *       200:
 *         description: Office performance retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 officeId:
 *                   type: string
 *                   format: uuid
 *                 metrics:
 *                   type: object
 *                   properties:
 *                     leadsConverted:
 *                       type: number
 *                       example: 50
 *                     appointmentsScheduled:
 *                       type: number
 *                       example: 100
 *                     revenue:
 *                       type: number
 *                       example: 50000
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Office not found
 */
router.get(
  '/offices/:id/performance',
  superAdminController.getOfficePerformance
);

/**
 * @swagger
 * /api/v1/super-admin/staff:
 *   post:
 *     summary: Create a new staff member
 *     tags: [SuperAdmin]
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - role
 *               - officeId
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: staff@example.com
 *               role:
 *                 type: string
 *                 enum:
 *                   - manager
 *                   - consultant
 *                   - receptionist
 *                   - student
 *                 example: consultant || manager || receptionist || student
 *               officeId:
 *                 type: string
 *                 format: uuid
 *                 example: 123e4567-e89b-12d3-a456-426614174000
 *               name:
 *                 type: string
 *                 example: Jane Doe
 *               phone:
 *                 type: string
 *                 example: +1234567890
 *               password:
 *                 type: string
 *                 example: anySecurePassword123
 */
router.post('/staff', superAdminController.createStaff);

/**
 * @swagger
 * /api/v1/super-admin/staff/{id}:
 *   put:
 *     summary: Update staff member
 *     tags: [SuperAdmin]
 *     description: Updates the details of an existing staff member.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Staff ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               role:
 *                 type: string
 *                 enum: [manager, consultant, receptionist]
 *               officeId:
 *                 type: string
 *                 format: uuid
 *               name:
 *                 type: string
 *               phone:
 *                 type: string
 *     responses:
 *       200:
 *         description: Staff member updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserStaff'
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Staff member not found
 */
router.put('/staff/:id', superAdminController.updateStaff);

/**
 * @swagger
 * /api/v1/super-admin/staff/{id}/status:
 *   patch:
 *     summary: Toggle staff status
 *     tags: [SuperAdmin]
 *     description: Toggles the active/inactive status of a staff member.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Staff ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - isActive
 *             properties:
 *               isActive:
 *                 type: boolean
 *                 example: false
 *     responses:
 *       200:
 *         description: Staff status toggled
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserStaff'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Staff member not found
 */
router.patch('/staff/:id/status', superAdminController.toggleStaffStatus);

/**
 * @swagger
 * /api/v1/super-admin/staff/import:
 *   post:
 *     summary: Import staff via CSV
 *     tags: [SuperAdmin]
 *     description: Imports multiple staff members from a CSV file.
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
 *     responses:
 *       200:
 *         description: Staff imported successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Staff imported successfully
 *                 count:
 *                   type: number
 *                   example: 10
 *       400:
 *         description: Invalid CSV file
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Invalid CSV format
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post('/staff/import', superAdminController.importStaffCSV);

/**
 * @swagger
 * /api/v1/super-admin/staff/{id}/logs:
 *   get:
 *     summary: Get staff logs
 *     tags: [SuperAdmin]
 *     description: Retrieves activity logs for a specific staff member.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Staff ID
 *     responses:
 *       200:
 *         description: Staff logs retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   action:
 *                     type: string
 *                     example: Updated lead status
 *                   timestamp:
 *                     type: string
 *                     format: date-time
 *                     example: 2025-06-07T12:00:00Z
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Staff member not found
 */
router.get('/staff/:id/logs', superAdminController.getStaffLogs);

/**
 * @swagger
 * /api/v1/super-admin/lead-rules:
 *   post:
 *     summary: Create lead distribution rule
 *     tags: [SuperAdmin]
 *     description: Creates a new rule for lead distribution.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - criteria
 *               - priority
 *             properties:
 *               criteria:
 *                 type: object
 *                 properties:
 *                   officeId:
 *                     type: string
 *                     format: uuid
 *                   studyDestination:
 *                     type: string
 *                   leadSource:
 *                     type: string
 *                     enum: [walk_in, online, referral]
 *               priority:
 *                 type: number
 *                 example: 1
 *               officeId:
 *                 type: string
 *                 format: uuid
 *                 example: 123e4567-e89b-12d3-a456-426614174000
 *               targetConsultantIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: uuid
 *     responses:
 *       201:
 *         description: Lead rule created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LeadRule'
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post('/lead-rules', superAdminController.createLeadRule);

/**
 * @swagger
 * /api/v1/super-admin/lead-rules/{id}:
 *   put:
 *     summary: Update lead distribution rule
 *     tags: [SuperAdmin]
 *     description: Updates an existing lead distribution rule.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Lead Rule ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               criteria:
 *                 type: object
 *                 properties:
 *                   officeId:
 *                     type: string
 *                     format: uuid
 *                   studyDestination:
 *                     type: string
 *                   leadSource:
 *                     type: string
 *                     enum: [walk_in, online, referral]
 *                 example:
 *                   officeId: 123e4567-e89b-12d3-a456-426614174000
 *                   studyDestination: Canada
 *                   leadSource: online
 *               priority:
 *                 type: number
 *                 example: 2
 *               officeId:
 *                 type: string
 *                 format: uuid
 *                 example: 123e4567-e89b-12d3-a456-426614174000
 *               consultantId:
 *                 type: string
 *                 format: uuid
 *                 example: abc123e4-e89b-12d3-a456-426614174001
 *     responses:
 *       200:
 *         description: Lead rule updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LeadRule'
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Lead rule not found
 */
router.put('/lead-rules/:id', superAdminController.updateLeadRule);

/**
 * @swagger
 * /api/v1/super-admin/lead-rules:
 *   get:
 *     summary: Get all lead distribution rules
 *     tags: [SuperAdmin]
 *     description: Retrieves all lead distribution rules.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of lead rules
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/LeadRule'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/lead-rules', superAdminController.getLeadRules);

/**
 * @swagger
 * /api/v1/super-admin/lead-rules/{id}/history:
 *   get:
 *     summary: Get lead rule history
 *     tags: [SuperAdmin]
 *     description: Retrieves the history of a lead distribution rule.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Lead Rule ID
 *     responses:
 *       200:
 *         description: Lead rule history retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   action:
 *                     type: string
 *                     example: Rule updated
 *                   timestamp:
 *                     type: string
 *                     format: date-time
 *                     example: 2025-06-07T12:00:00Z
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Lead rule not found
 */
router.get('/lead-rules/:id/history', superAdminController.getLeadRuleHistory);

/**
 * @swagger
 * /api/v1/super-admin/leads:
 *   get:
 *     summary: Get all leads
 *     tags: [SuperAdmin]
 *     description: Retrieves all leads in the system.
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
 *                 $ref: '#/components/schemas/Lead'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/leads', superAdminController.getAllLeads);

/**
 * @swagger
 * /api/v1/super-admin/leads/{id}/reassign:
 *   put:
 *     summary: Reassign lead
 *     tags: [SuperAdmin]
 *     description: Reassigns a lead to a different consultant.
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
 *               - consultantId
 *             properties:
 *               consultantId:
 *                 type: string
 *                 format: uuid
 *                 example: 98765432-12d3-4e5f-a678-426614174000
 *     responses:
 *       200:
 *         description: Lead reassigned
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Lead'
 *       400:
 *         description: Invalid consultant
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Lead not found
 */
router.put('/leads/:id/reassign', superAdminController.reassignLead);

/**
 * @swagger
 * /api/v1/super-admin/leads/export:
 *   get:
 *     summary: Export leads
 *     tags: [SuperAdmin]
 *     description: Exports all leads to a CSV file.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Leads exported successfully
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/leads/export', superAdminController.exportLeads);

/**
 * @swagger
 * /api/v1/super-admin/leads/{id}/history:
 *   get:
 *     summary: Get lead history
 *     tags: [SuperAdmin]
 *     description: Retrieves the history of a lead.
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
 *                     example: Lead reassigned
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
router.get('/leads/:id/history', superAdminController.getLeadHistory);

/**
 * @swagger
 * /api/v1/super-admin/reports:
 *   get:
 *     summary: Get all reports
 *     tags: [SuperAdmin]
 *     description: Retrieves all generated reports.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: List of reports
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
router.get('/reports', superAdminController.getReports);

/**
 * @swagger
 * /api/v1/super-admin/reports:
 *   post:
 *     summary: Create a new report
 *     tags: [SuperAdmin]
 *     description: Creates a new report based on specified parameters.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *               - parameters
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [performance, lead, financial]
 *                 example: performance
 *               parameters:
 *                 type: object
 *                 properties:
 *                   officeId:
 *                     type: string
 *                     format: uuid
 *                   dateRange:
 *                     type: object
 *                     properties:
 *                       start:
 *                         type: string
 *                         format: date
 *                       end:
 *                         type: string
 *                         format: date
 *     responses:
 *       201:
 *         description: Report created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Report'
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post('/reports', superAdminController.createReport);

/**
 * @swagger
 * /api/v1/super-admin/reports/export/{id}:
 *   get:
 *     summary: Export report
 *     tags: [SuperAdmin]
 *     description: Exports a specific report to PDF or CSV.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Report ID
 *     responses:
 *       200:
 *         description: Report exported
 *         content:
 *           application/pdf:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Report not found
 */
router.get('/reports/export/:id', superAdminController.exportReport);

/**
 * @swagger
 * /api/v1/super-admin/reports/schedule:
 *   post:
 *     summary: Schedule a report
 *     tags: [SuperAdmin]
 *     description: Schedules a report to be generated periodically.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *               - parameters
 *               - frequency
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [performance, lead, financial]
 *               parameters:
 *                 type: object
 *               frequency:
 *                 type: string
 *                 enum: [daily, weekly, monthly]
 *                 example: weekly
 *     responses:
 *       201:
 *         description: Report scheduled
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Report scheduled
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post('/reports/schedule', superAdminController.scheduleReport);

/**
 * @swagger
 * /api/v1/super-admin/leads/assign:
 *   post:
 *     summary: Assign a lead to a consultant and office
 *     tags: [SuperAdmin]
 *     description: Assigns a lead to a consultant who must already belong to the specified office.
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - leadId
 *               - consultantId
 *               - officeId
 *             properties:
 *               leadId:
 *                 type: string
 *                 format: uuid
 *               consultantId:
 *                 type: string
 *                 format: uuid
 *               officeId:
 *                 type: string
 *                 format: uuid
 *     responses:
 *       200:
 *         description: Lead assigned successfully
 *       400:
 *         description: Consultant not in selected office or bad request
 *       404:
 *         description: Lead not found
 */
router.post('/leads/assign', superAdminController.assignLeadToConsultant);

module.exports = router;

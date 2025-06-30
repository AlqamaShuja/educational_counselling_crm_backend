const express = require('express');
const router = express.Router();
const proposalController = require('../controllers/proposalController');
const { protect, restrictTo } = require('../middleware/authMiddleware');

// Protect all routes and restrict to consultant role
router.use(protect, restrictTo('consultant'));

/**
 * @swagger
 * components:
 *   schemas:
 *     Proposal:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           description: Proposal ID
 *         leadId:
 *           type: string
 *           format: uuid
 *           description: Lead ID
 *         consultantId:
 *           type: string
 *           format: uuid
 *           description: Consultant ID
 *         studentId:
 *           type: string
 *           format: uuid
 *           description: Student ID
 *         title:
 *           type: string
 *           description: Proposal title
 *         description:
 *           type: string
 *           description: Detailed description of the proposal
 *         proposedProgram:
 *           type: string
 *           description: Proposed academic program
 *         proposedUniversity:
 *           type: string
 *           description: Proposed university
 *         estimatedCost:
 *           type: number
 *           format: decimal
 *           description: Estimated cost for the program
 *         timeline:
 *           type: string
 *           description: Expected timeline for completion
 *         status:
 *           type: string
 *           enum: [pending, approved, rejected]
 *           description: Proposal status
 *         details:
 *           type: object
 *           description: Additional details in JSON format
 *         rejectionReason:
 *           type: string
 *           description: Reason for rejection (if applicable)
 *         expiresAt:
 *           type: string
 *           format: date-time
 *           description: Proposal expiration date
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 */

/**
 * @swagger
 * /api/v1/consultant/leads/{leadId}/proposals:
 *   post:
 *     summary: Create a proposal for a lead
 *     tags: [Consultant - Proposals]
 *     description: Creates a new proposal for a specific lead assigned to the consultant.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: leadId
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
 *               - title
 *             properties:
 *               title:
 *                 type: string
 *                 example: Study Program Proposal for Computer Science
 *               description:
 *                 type: string
 *                 example: Comprehensive study plan for pursuing Computer Science degree in Canada
 *               proposedProgram:
 *                 type: string
 *                 example: Bachelor of Computer Science
 *               proposedUniversity:
 *                 type: string
 *                 example: University of Toronto
 *               estimatedCost:
 *                 type: number
 *                 format: decimal
 *                 example: 45000.00
 *               timeline:
 *                 type: string
 *                 example: 4 years
 *               details:
 *                 type: object
 *                 example:
 *                   requirements:
 *                     - "IELTS 6.5 overall"
 *                     - "High school transcript"
 *                   scholarships:
 *                     - "Merit-based scholarship available"
 *                   accommodation: "On-campus housing recommended"
 *               expiresAt:
 *                 type: string
 *                 format: date-time
 *                 example: 2025-08-01T23:59:59Z
 *     responses:
 *       201:
 *         description: Proposal created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Proposal created successfully
 *                 proposal:
 *                   $ref: '#/components/schemas/Proposal'
 *       400:
 *         description: Bad request (pending proposal already exists)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: A pending proposal already exists for this lead
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Lead not found or not assigned
 */
router.post('/leads/:leadId/proposals', proposalController.createProposal);

/**
 * @swagger
 * /api/v1/consultant/leads/{leadId}/proposals:
 *   get:
 *     summary: Get proposals for a specific lead
 *     tags: [Consultant - Proposals]
 *     description: Retrieves all proposals created for a specific lead.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: leadId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Lead ID
 *     responses:
 *       200:
 *         description: Proposals retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Proposals retrieved successfully
 *                 count:
 *                   type: integer
 *                   example: 2
 *                 proposals:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Proposal'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Lead not found or not assigned
 */
router.get('/leads/:leadId/proposals', proposalController.getProposalsByLead);

/**
 * @swagger
 * /api/v1/consultant/proposals:
 *   get:
 *     summary: Get all proposals created by consultant
 *     tags: [Consultant - Proposals]
 *     description: Retrieves all proposals created by the authenticated consultant with optional status filtering.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected]
 *         description: Filter proposals by status
 *     responses:
 *       200:
 *         description: Proposals retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Proposals retrieved successfully
 *                 count:
 *                   type: integer
 *                   example: 5
 *                 proposals:
 *                   type: array
 *                   items:
 *                     allOf:
 *                       - $ref: '#/components/schemas/Proposal'
 *                       - type: object
 *                         properties:
 *                           lead:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                               status:
 *                                 type: string
 *                               source:
 *                                 type: string
 *                               studyPreferences:
 *                                 type: object
 *                           student:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                               name:
 *                                 type: string
 *                               email:
 *                                 type: string
 *                               phone:
 *                                 type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/proposals', proposalController.getMyProposals);

/**
 * @swagger
 * /api/v1/consultant/proposals/stats:
 *   get:
 *     summary: Get proposal statistics
 *     tags: [Consultant - Proposals]
 *     description: Retrieves proposal statistics for the authenticated consultant.
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Proposal statistics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Proposal statistics retrieved successfully
 *                 stats:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                       example: 10
 *                     pending:
 *                       type: integer
 *                       example: 3
 *                     approved:
 *                       type: integer
 *                       example: 5
 *                     rejected:
 *                       type: integer
 *                       example: 2
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get('/proposals/stats', proposalController.getProposalStats);

/**
 * @swagger
 * /api/v1/consultant/proposals/{id}:
 *   get:
 *     summary: Get proposal by ID
 *     tags: [Consultant - Proposals]
 *     description: Retrieves a specific proposal by its ID.
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Proposal ID
 *     responses:
 *       200:
 *         description: Proposal retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Proposal retrieved successfully
 *                 proposal:
 *                   allOf:
 *                     - $ref: '#/components/schemas/Proposal'
 *                     - type: object
 *                       properties:
 *                         lead:
 *                           type: object
 *                         student:
 *                           type: object
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Proposal not found or not authorized
 */
router.get('/proposals/:id', proposalController.getProposalById);

/**
 * @swagger
 * /api/v1/consultant/proposals/{id}:
 *   put:
 *     summary: Update a proposal
 *     tags: [Consultant - Proposals]
 *     description: Updates a proposal (only if status is pending).
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Proposal ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 example: Updated Study Program Proposal
 *               description:
 *                 type: string
 *                 example: Updated comprehensive study plan
 *               proposedProgram:
 *                 type: string
 *                 example: Master of Computer Science
 *               proposedUniversity:
 *                 type: string
 *                 example: University of British Columbia
 *               estimatedCost:
 *                 type: number
 *                 format: decimal
 *                 example: 55000.00
 *               timeline:
 *                 type: string
 *                 example: 2 years
 *               details:
 *                 type: object
 *                 example:
 *                   updatedRequirements:
 *                     - "IELTS 7.0 overall"
 *                     - "Bachelor's degree transcript"
 *               expiresAt:
 *                 type: string
 *                 format: date-time
 *                 example: 2025-09-01T23:59:59Z
 *     responses:
 *       200:
 *         description: Proposal updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Proposal updated successfully
 *                 proposal:
 *                   $ref: '#/components/schemas/Proposal'
 *       400:
 *         description: Can only update pending proposals
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Proposal not found or not authorized
 */
router.put('/proposals/:id', proposalController.updateProposal);

/**
 * @swagger
 * /api/v1/consultant/proposals/{id}:
 *   delete:
 *     summary: Delete a proposal
 *     tags: [Consultant - Proposals]
 *     description: Deletes a proposal (only if status is pending).
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Proposal ID
 *     responses:
 *       200:
 *         description: Proposal deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Proposal deleted successfully
 *       400:
 *         description: Can only delete pending proposals
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Proposal not found or not authorized
 */
router.delete('/proposals/:id', proposalController.deleteProposal);

module.exports = router;

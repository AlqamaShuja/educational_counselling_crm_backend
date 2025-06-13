const express = require('express');
const router = express.Router();
const passport = require('passport');
require('../config/passport');
const authController = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const jwt = require('jsonwebtoken');

/**
 * @swagger
 * /api/v1/auth/google:
 *   get:
 *     summary: Initiate Google OAuth login
 *     tags: [Auth]
 *     description: Redirects the user to Google for authentication using OAuth 2.0.
 *     responses:
 *       302:
 *         description: Redirects to Google OAuth login page.
 *       500:
 *         description: Server error initiating OAuth login
 */
// Redirect user to Google
router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

/**
 * @swagger
 * /api/v1/auth/google/callback:
 *   get:
 *     summary: Google OAuth callback
 *     tags: [Auth]
 *     description: Handles Google’s OAuth callback, signs the user in or creates an account, and redirects to the frontend with a JWT.
 *     parameters:
 *       - in: query
 *         name: code
 *         schema:
 *           type: string
 *         required: true
 *         description: Google authorization code (handled internally by Passport)
 *     responses:
 *       302:
 *         description: Redirects to the frontend with a JWT in the query string.
 *         headers:
 *           Location:
 *             schema:
 *               type: string
 *             description: URL to redirect the user to, containing the JWT.
 *       401:
 *         description: Authentication failed
 */
// Google OAuth callback
router.get(
  '/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/' }),
  async (req, res) => {
    const user = req.user;

    const token = jwt.sign(
      { id: user.id, role: user.role, officeId: user.officeId },
      process.env.JWT_SECRET
    );

    // Redirect with token in query (e.g., to frontend)
    res.redirect(
      `${process.env.FRONTEND_URL}/oauth-success?token=${token}&user=${JSON.stringify(user)}`
    );
  }
);


/**
 * @swagger
 * /api/v1/auth/facebook:
 *   get:
 *     summary: Initiate Facebook OAuth login
 *     tags: [Auth]
 *     description: Redirects the user to Facebook for authentication.
 *     responses:
 *       302:
 *         description: Redirects to Facebook login page
 */
router.get(
  '/facebook',
  passport.authenticate('facebook', { scope: ['email'] })
);

/**
 * @swagger
 * /api/v1/auth/facebook/callback:
 *   get:
 *     summary: Facebook OAuth callback
 *     tags: [Auth]
 *     description: Handles Facebook OAuth response, creates JWT, and redirects.
 *     responses:
 *       302:
 *         description: Redirects to frontend with JWT
 */
router.get(
  '/facebook/callback',
  passport.authenticate('facebook', { session: false, failureRedirect: '/' }),
  async (req, res) => {
    const user = req.user;

    const token = jwt.sign(
      { id: user.id, role: user.role, officeId: user.officeId },
      process.env.JWT_SECRET
    );

    res.redirect(`${process.env.FRONTEND_URL}/oauth-success?token=${token}`);
  }
);

/**
 * @swagger
 * /api/v1/auth/login:
 *   post:
 *     summary: User login
 *     tags: [Auth]
 *     description: Authenticates a user and returns a JWT token for session management.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: Password123
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       format: uuid
 *                       example: 123e4567-e89b-12d3-a456-426614174000
 *                     email:
 *                       type: string
 *                       example: user@example.com
 *                     role:
 *                       type: string
 *                       enum: [super_admin, manager, consultant, receptionist, student]
 *                       example: student
 *       401:
 *         description: Invalid credentials or inactive account
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Invalid credentials
 *       400:
 *         description: Missing required fields
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Email and password are required
 */
router.post('/login', authController.login);

/**
 * @swagger
 * /api/v1/auth/signup:
 *   post:
 *     summary: Student signup
 *     tags: [Auth]
 *     description: Allows only students to sign up.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - name
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               password:
 *                 type: string
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: Student registered successfully
 *       400:
 *         description: Validation error
 */
router.post('/signup', authController.signup);

/**
 * @swagger
 * /api/v1/auth/logout:
 *   post:
 *     summary: User logout
 *     tags: [Auth]
 *     description: Invalidates the user's session (client-side token removal).
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Logged out successfully
 *       401:
 *         description: Unauthorized (invalid or missing token)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Authentication failed: No token provided
 */
router.post('/logout', protect, authController.logout);

/**
 * @swagger
 * /api/v1/auth/reset-password:
 *   post:
 *     summary: Request password reset
 *     tags: [Auth]
 *     description: Sends a password reset email with a token to the user.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *     responses:
 *       200:
 *         description: Password reset email sent
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Password reset email sent
 *       404:
 *         description: User not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: User not found
 */
router.post('/reset-password', authController.requestPasswordReset);

/**
 * @swagger
 * /api/v1/auth/reset-password/confirm:
 *   post:
 *     summary: Confirm password reset
 *     tags: [Auth]
 *     description: Resets the user's password using a reset token.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - token
 *               - newPassword
 *             properties:
 *               token:
 *                 type: string
 *                 example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 example: NewPassword123
 *     responses:
 *       200:
 *         description: Password reset successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Password reset successfully
 *       400:
 *         description: Missing required fields
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Token and new password are required
 *       401:
 *         description: Invalid or expired token
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Invalid token
 */
router.post('/reset-password/confirm', authController.confirmPasswordReset);

module.exports = router;

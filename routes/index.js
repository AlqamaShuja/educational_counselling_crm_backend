// const express = require('express');
// const authMiddleware = require('../middleware/authMiddleware');
const authRoutes = require('./authRoutes');
const superAdminRoutes = require('./superAdminRoutes');
const managerRoutes = require('./managerRoutes');
const receptionistRoutes = require('./receptionistRoutes');
const consultantRoutes = require('./consultantRoutes');
const studentRoutes = require('./studentRoutes');
const notificationRoutes = require('./notificationRoutes');
const courseRoutes = require('./courseRoutes');
const universityRoutes = require('./universityRoutes');
const fileRoutes = require('./fileRoutes');
const proposalRoutes = require('./proposalRoutes');
const checklistRoutes = require('./checklistRoutes');
const applicationRoutes = require('./applicationRoutes');

// New messaging routes
const messageRoutes = require('./messageRoutes');
// const conversationRoutes = require('./conversationRoutes');

const API_PREFIX_V1 = '/api/v1';

module.exports = (app) => {
  // Authentication routes
  app.use(`${API_PREFIX_V1}/auth`, authRoutes);

  // Role-based routes
  app.use(`${API_PREFIX_V1}/super-admin`, superAdminRoutes);
  app.use(`${API_PREFIX_V1}/manager`, managerRoutes);
  app.use(`${API_PREFIX_V1}/receptionist`, receptionistRoutes);
  app.use(`${API_PREFIX_V1}/consultant`, consultantRoutes);
  app.use(`${API_PREFIX_V1}/consultant`, proposalRoutes);
  app.use(`${API_PREFIX_V1}/checklists`, checklistRoutes);
  app.use(`${API_PREFIX_V1}/applications`, applicationRoutes);
  app.use(`${API_PREFIX_V1}/student`, studentRoutes);

  // General routes
  app.use(`${API_PREFIX_V1}/notifications`, notificationRoutes);
  app.use(`${API_PREFIX_V1}/courses`, courseRoutes);
  app.use(`${API_PREFIX_V1}/universities`, universityRoutes);
  app.use(`${API_PREFIX_V1}/file`, fileRoutes);

  // Real-time messaging routes
  app.use(`${API_PREFIX_V1}/messages`, messageRoutes);
  // app.use(`${API_PREFIX_V1}/conversations`, conversationRoutes);

  // API status endpoint
  app.get(`${API_PREFIX_V1}/status`, (req, res) => {
    res.json({
      success: true,
      message: 'CRM API is running',
      version: '1.0.0',
      timestamp: new Date(),
      availableEndpoints: {
        auth: `${API_PREFIX_V1}/auth`,
        superAdmin: `${API_PREFIX_V1}/super-admin`,
        manager: `${API_PREFIX_V1}/manager`,
        receptionist: `${API_PREFIX_V1}/receptionist`,
        consultant: `${API_PREFIX_V1}/consultant`,
        student: `${API_PREFIX_V1}/student`,
        notifications: `${API_PREFIX_V1}/notifications`,
        courses: `${API_PREFIX_V1}/courses`,
        universities: `${API_PREFIX_V1}/universities`,
        file: `${API_PREFIX_V1}/file`,
        messages: `${API_PREFIX_V1}/messages`,
        conversations: `${API_PREFIX_V1}/conversations`,
        checklists: `${API_PREFIX_V1}/checklists`,
        applications: `${API_PREFIX_V1}/applications`,
      },
      features: {
        realTimeMessaging: true,
        fileSharing: true,
        voiceCalls: false, // Future feature
        videoCalls: false, // Future feature
        conversationMonitoring: true,
        messageSearch: true,
        messageEncryption: false, // Future feature
      },
    });
  });

  // Default API route
  app.get(`${API_PREFIX_V1}`, (req, res) => {
    res.json({
      success: true,
      message: 'Welcome to the CRM API with Real-time Messaging',
      documentation: '/api-docs',
      health: '/health',
      status: `${API_PREFIX_V1}/status`,
    });
  });
};

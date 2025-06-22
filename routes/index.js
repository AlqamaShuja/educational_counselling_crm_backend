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

const API_PREFIX_V1 = '/api/v1';

module.exports = (app) => {
  app.use(`${API_PREFIX_V1}/auth`, authRoutes);
  app.use(`${API_PREFIX_V1}/super-admin`, superAdminRoutes);
  app.use(`${API_PREFIX_V1}/manager`, managerRoutes);
  app.use(`${API_PREFIX_V1}/receptionist`, receptionistRoutes);
  app.use(`${API_PREFIX_V1}/consultant`, consultantRoutes);
  app.use(`${API_PREFIX_V1}/student`, studentRoutes);
  app.use(`${API_PREFIX_V1}/notifications`, notificationRoutes);
  app.use(`${API_PREFIX_V1}/courses`, courseRoutes);
  app.use(`${API_PREFIX_V1}/universities`, universityRoutes);
  app.use(`${API_PREFIX_V1}/file`, fileRoutes);
};
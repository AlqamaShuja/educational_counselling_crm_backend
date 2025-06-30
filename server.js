require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
const allRoutes = require('./routes/index');
const swaggerUi = require('swagger-ui-express');
const { sequelize } = require('./models/index');
const swaggerSpec = require('./swagger/swagger');
const errorMiddleware = require('./middleware/errorMiddleware');
const passport = require('passport');
const socketServer = require('./socket/socketServer');
const { handleMulterError } = require('./middleware/uploadMiddleware');

// Initialize Express app
const app = express();

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
const io = socketServer.initialize(server);

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// CORS configuration
app.use(
  cors({
    origin: '*', // process.env.FRONTEND_URL || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  })
);

// Passport middleware
app.use(passport.initialize());

// Static files for uploaded content
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    database: 'connected',
    socket: socketServer.healthCheck(),
  });
});

// Socket.IO stats endpoint (for monitoring)
app.get('/socket-stats', (req, res) => {
  const stats = socketServer.getStats();
  res.json({
    success: true,
    data: stats,
    timestamp: new Date(),
  });
});

// Database connection
sequelize
  .authenticate()
  .then(() => {
    console.log('✅ Database connected successfully!');

    // Note: Auto-sync disabled to prevent SQL errors
    // Use migrations instead: npm run migrate
    console.log('ℹ️  Use "npm run migrate" to update database schema');
  })
  .catch((err) => {
    console.error('❌ Database connection error:', err);
    process.exit(1);
  });

// API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// API Routes
allRoutes(app);

// File upload error handling
app.use(handleMulterError);

// Global error handling middleware
app.use(errorMiddleware);

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
    path: req.originalUrl,
  });
});

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  console.log(`\n🔄 Received ${signal}. Starting graceful shutdown...`);

  try {
    // Close Socket.IO server
    await socketServer.shutdown();

    // Close database connections
    await sequelize.close();
    console.log('✅ Database connections closed');

    // Close HTTP server
    server.close(() => {
      console.log('✅ HTTP server closed');
      process.exit(0);
    });

    // Force close after 10 seconds
    setTimeout(() => {
      console.log('⚠️  Forcing shutdown after timeout');
      process.exit(1);
    }, 10000);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});

// Start the server
const PORT = process.env.PORT || 5009;
server.listen(PORT, () => {
  console.log('\n🚀 Server Configuration:');
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Port: ${PORT}`);
  console.log(`   HTTP Server: http://localhost:${PORT}`);
  console.log(`   API Documentation: http://localhost:${PORT}/api-docs`);
  console.log(`   Health Check: http://localhost:${PORT}/health`);
  console.log(`   Socket Stats: http://localhost:${PORT}/socket-stats`);
  console.log(
    `   Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`
  );
  console.log('\n✅ Real-time messaging system is ready!');

  // Auto-create conversations for existing assignments (optional)
  if (process.env.AUTO_CREATE_CONVERSATIONS === 'true') {
    setTimeout(async () => {
      try {
        const conversationService = require('./services/conversationService');
        await conversationService.autoCreateConversations();
        console.log('✅ Auto-created conversations for existing assignments');
      } catch (error) {
        console.error('❌ Error auto-creating conversations:', error);
      }
    }, 5000); // Wait 5 seconds after server start
  }
});

// Export for testing
module.exports = { app, server, io };

// require('dotenv').config();
// const express = require('express');
// const cors = require('cors');
// const allRoutes = require('./routes/index');
// const swaggerUi = require('swagger-ui-express');
// const { sequelize } = require('./models/index');
// const swaggerSpec = require('./swagger/swagger');
// const errorMiddleware = require('./middleware/errorMiddleware');
// const passport = require('passport');

// //
// const app = express();
// app.use(express.json());
// app.use(cors({ origin: '*' }));

// app.use(passport.initialize());

// sequelize
//   .authenticate()
//   .then(() => console.log('Database connected!'))
//   .catch((err) => console.error('DB connection error:', err));

// // Routes
// app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
// allRoutes(app);

// // Error handling
// app.use(errorMiddleware);

// // Start the server
// const PORT = process.env.PORT || 5009;
// app.listen(PORT, () => {
//   console.log(`Server is running on port ${PORT}`);
//   console.log(`API DOCS: http://localhost:${PORT}/api-docs`);
// });

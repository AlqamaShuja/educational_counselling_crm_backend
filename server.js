require('dotenv').config();
const express = require('express');
const cors = require('cors');
const allRoutes = require('./routes/index');
const swaggerUi = require('swagger-ui-express');
const { sequelize } = require('./models/index');
const swaggerSpec = require('./swagger/swagger');
const errorMiddleware = require('./middleware/errorMiddleware');
const passport = require('passport');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // Adjust this to match your frontend URL in production
    methods: ['GET', 'POST'],
  },
});

app.use(express.json());
app.use(cors({ origin: '*' }));

app.use(
  '/uploads/leads',
  express.static(path.join(__dirname, 'uploads/leads'))
);

app.use(passport.initialize());

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  // Join a room based on user ID (passed from frontend)
  socket.on('join', (userId) => {
    socket.join(userId);
    console.log(`User ${userId} joined room`);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Make io accessible to routes/controllers
app.set('io', io);

// sequelize
//   .authenticate()
//   .then(() => console.log('Database connected!'))
//   .catch((err) => console.error('DB connection error:', err));

sequelize
  .authenticate()
  .then(() => console.log('Database connected!'))
  // .then(() => sequelize.sync({ alter: true })) // Add this line
  // .then(() => console.log('Database synced!'))
  .catch((err) => console.error('DB connection error:', err));
// Routes
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
allRoutes(app);

// Error handling
app.use(errorMiddleware);

// Start the server
const PORT = process.env.PORT || 5009;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`API DOCS: http://localhost:${PORT}/api-docs`);
});

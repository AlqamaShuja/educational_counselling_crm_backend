require('dotenv').config();
const express = require('express');
const cors = require('cors');
const allRoutes = require('./routes/index');
const swaggerUi = require('swagger-ui-express');
const { sequelize } = require('./models/index');
const swaggerSpec = require('./swagger/swagger');
const errorMiddleware = require('./middleware/errorMiddleware');

//
const app = express();
app.use(express.json());
app.use(cors({ origin: '*' }));

sequelize
  .authenticate()
  .then(() => console.log('Database connected!'))
  .catch((err) => console.error('DB connection error:', err));

// Routes
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
allRoutes(app);

// Error handling
app.use(errorMiddleware);

// Start the server
const PORT = process.env.PORT || 5009;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`API DOCS: http://localhost:${PORT}/api-docs`);
});

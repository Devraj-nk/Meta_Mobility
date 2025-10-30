require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const connectDB = require('./config/database');
const { errorHandler, notFound } = require('./middleware/errorHandler');

// Import routes
const authRoutes = require('./routes/authRoutes');
const rideRoutes = require('./routes/rideRoutes');
const driverRoutes = require('./routes/driverRoutes');
const paymentRoutes = require('./routes/paymentRoutes');

// Initialize express app
const app = express();

// Connect to database
connectDB();

// Security middleware - CAB-SR-001: Enforce TLS/HTTPS and secure headers
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: process.env.CLIENT_URL || '*',
  credentials: true
}));

// Body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware (only in development)
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Health check route
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Mini Ola Backend API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/rides', rideRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/payments', paymentRoutes);

// Welcome route
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to Mini Ola API - Meta-Mobility',
    version: '1.0.0',
    team: [
      'Devraj Ishwar Naik (Leader) - PES2UG23CS167',
      'Chinthan K - PES2UG23CS155',
      'Christananda B - PES2UG23CS158',
      'Chethan S - PES2UG23CS150'
    ],
    endpoints: {
      auth: '/api/auth',
      rides: '/api/rides',
      drivers: '/api/drivers',
      payments: '/api/payments',
      health: '/health'
    },
    documentation: 'See README.md for API documentation'
  });
});

// 404 handler
app.use(notFound);

// Global error handler
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║        🚕 Mini Ola Backend - Meta-Mobility 🚕             ║
║                                                           ║
║  Server running on: http://localhost:${PORT}               ║
║  Environment: ${process.env.NODE_ENV || 'development'}                      ║
║                                                           ║
║  Team: PESU_EC_CSE_C_P14_A                                ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

module.exports = app;

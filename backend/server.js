import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import morgan from 'morgan';
import dotenv from 'dotenv';

import { configureSecurity } from './config/security.js';
import authRoutes from './routes/auth.js';
import restaurantRoutes from './routes/restaurants.js';
import orderRoutes from './routes/orders.js';
import adminRoutes from './routes/admin.js';
import mapsRoutes from './routes/maps.js';
import { initOrderSocket } from './sockets/orderSocket.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);

// Attach Socket.IO
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Configure Helmet, CORS, and rate limiting
configureSecurity(app);

// Standard Middlewares
app.use(express.json());
app.use(morgan('dev'));

// Routing Middleware
app.use('/api/auth', authRoutes);
app.use('/api/restaurants', restaurantRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/maps', mapsRoutes);

// Health Check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'Operational',
    timestamp: new Date(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Initialize Socket event handlers
initOrderSocket(io);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('❌ Server Error Catch-all: ', err.stack);
  res.status(500).json({ error: 'Internal Server Error. Please contact support.' });
});

// Start Server
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`🚀 HungryHub Backend running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode.`);
});

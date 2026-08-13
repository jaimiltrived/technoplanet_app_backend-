import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { NotFoundError } from './utils/customErrors.js';

// Import modular routes
import authRoutes from './routes/auth.routes.js';
import studentRoutes from './routes/student.routes.js';
import eventRoutes from './routes/event.routes.js';
import passRoutes from './routes/pass.routes.js'; // /api/event-pass and /api/event-qr
import galleryRoutes from './routes/gallery.routes.js';
import certificateRoutes from './routes/certificate.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import feedbackRoutes from './routes/feedback.routes.js';
import facultyRoutes from './routes/faculty.routes.js';
import coordinatorRoutes from './routes/coordinator.routes.js';
import adminRoutes from './routes/admin.routes.js';
import staffRoutes from './routes/staff.routes.js';

const app = express();

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Swagger API Documentation
app.get('/api-docs/swagger.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Health Check API
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    timestamp: new Date().toISOString(),
    message: 'RKU Technoplanet API is running smoothly'
  });
});

// Register modular routes
app.use('/api/auth', authRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/events', eventRoutes);
app.use('/api', passRoutes); // /api/event-pass and /api/event-qr
app.use('/api/gallery', galleryRoutes);
app.use('/api/certificates', certificateRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/faculty', facultyRoutes);
app.use('/api/coordinator', coordinatorRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/staff', staffRoutes);

// Fallback 404 handler
app.use((req, res, next) => {
  next(new NotFoundError(`Route ${req.originalUrl} not found`));
});

// Global Error Handler
app.use(errorHandler);

export default app;

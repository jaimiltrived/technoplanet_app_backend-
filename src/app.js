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
import uploadRoutes from './routes/upload.routes.js';


const app = express();

// Middlewares
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, curl, server-to-server)
    if (!origin) {
      return callback(null, true);
    }

    const defaultOrigins = [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:8080',
      'http://localhost:5000',
      'https://api.techno.rku.ac.in',
      'https://techno.rku.ac.in',
      'http://api.techno.rku.ac.in',
      'http://techno.rku.ac.in'
    ];

    const envOrigins = (process.env.CORS_ORIGINS || '')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean);

    const allowedList = [...defaultOrigins, ...envOrigins];

    // In development, allow any localhost or 127.0.0.1 port (e.g. Flutter Web)
    const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
    const isDev = process.env.NODE_ENV !== 'production';

    // Allow all *.rku.ac.in subdomains & domains
    const isRkuDomain = /^https?:\/\/([a-zA-Z0-9-]+\.)*rku\.ac\.in(:\d+)?$/.test(origin);

    if ((isDev && isLocalhost) || isRkuDomain || allowedList.includes(origin) || allowedList.includes('*')) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Swagger API Documentation
app.get('/api-docs/swagger.json', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Root Welcome / API Status Route
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to RKU Technoplanet API',
    version: '1.0.0',
    documentation: '/api-docs',
    health: '/health'
  });
});

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
app.use('/api/upload', uploadRoutes);
app.use('/api/v1/upload', uploadRoutes);


// Fallback 404 handler
app.use((req, res, next) => {
  next(new NotFoundError(`Route ${req.originalUrl} not found`));
});

// Global Error Handler
app.use(errorHandler);

export default app;

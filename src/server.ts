import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import 'dotenv/config';

import { dbHealth } from './db';
import cardsRoutes from './routes/cards';
import adminRoutes from './routes/admin';
import reportsRoutes from './routes/reports';
import emailRoutes from './routes/emails';

const app = express();
const PORT = process.env.PORT || 3000;

// Configure CORS with strict origin policy
const getAllowedOrigins = (): string[] => {
  const allowedOrigins = process.env.ALLOWED_ORIGINS;
  if (!allowedOrigins) {
    // Default origins for development
    return ['http://localhost:3001', 'http://localhost:3000'];
  }
  return allowedOrigins.split(',').map(origin => origin.trim());
};

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = getAllowedOrigins();
    
    // Allow requests with no origin (mobile apps, curl, Postman, etc.)
    if (!origin) {
      return callback(null, true);
    }
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS: Blocked request from unauthorized origin: ${origin}`);
      callback(new Error('Not allowed by CORS policy'), false);
    }
  },
  credentials: true,
  optionsSuccessStatus: 200 // Support legacy browsers
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const timestamp = new Date().toISOString();
  console.log(`${timestamp} ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', async (req: Request, res: Response) => {
  try {
    const dbTime = await dbHealth();
    res.json({
      ok: true,
      dbTime: dbTime.toISOString()
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({
      ok: false,
      error: 'Database connection failed'
    });
  }
});

// API Routes
app.use('/cards', cardsRoutes);
app.use('/cards', adminRoutes); // Admin routes are nested under /cards/:cardId/...
app.use('/reports', reportsRoutes);
app.use('/admin', emailRoutes); // Email admin routes
app.use('/admin', emailRoutes); // Email management routes

// 404 handler
app.use('*', (req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not found',
    details: `Endpoint ${req.method} ${req.originalUrl} not found`
  });
});

// Global error handler
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', error);
  
  // Don't send error details in production
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  res.status(500).json({
    error: 'Internal server error',
    ...(isDevelopment && { details: error.message, stack: error.stack })
  });
});

// Start server
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀 FTG Sportfabrik Bonus Cards API Server running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`📖 Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

export default app;
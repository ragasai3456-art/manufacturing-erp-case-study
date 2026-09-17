import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.js';
import { authRoutes } from './routes/auth.routes.js';
import { customerRoutes } from './routes/customer.routes.js';
import { enquiryRoutes } from './routes/enquiry.routes.js';
import { productRoutes } from './routes/product.routes.js';
import { inventoryRoutes } from './routes/inventory.routes.js';
import { quotationRoutes } from './routes/quotation.routes.js';
import { salesOrderRoutes } from './routes/salesOrder.routes.js';
import { errorHandler, notFoundHandler } from './middleware/error.middleware.js';

export const createApp = (): Express => {
  const app = express();

  // Security Middleware (configured for iframe preview and local development)
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      frameguard: false,
    })
  );

  // CORS Configuration: allows localhost dev and production Vercel frontend from FRONTEND_URL
  const configuredOrigins = (process.env.FRONTEND_URL || env.FRONTEND_URL || '')
    .split(',')
    .map((url) => url.trim());

  const allowedOrigins = Array.from(
    new Set([
      'http://localhost:5173',
      'http://localhost:3000',
      ...configuredOrigins,
    ])
  ).filter(Boolean);

  app.use(
    cors({
      origin: allowedOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // Request body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Health Check Endpoint - clean response without internal server or environment exposure
  app.get('/api/health', (req, res) => {
    res.status(200).json({
      status: 'ok',
    });
  });

  // Core API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/customers', customerRoutes);
  app.use('/api/enquiries', enquiryRoutes);
  app.use('/api/products', productRoutes);
  app.use('/api/inventory', inventoryRoutes);
  app.use('/api/quotations', quotationRoutes);
  app.use('/api/sales-orders', salesOrderRoutes);

  // 404 Handler for undefined API routes
  app.use('/api', notFoundHandler);

  // Centralized Error Handling Middleware (must be registered last)
  app.use(errorHandler);

  return app;
};

export const app = createApp();

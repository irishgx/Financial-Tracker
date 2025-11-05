import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { authRoutes } from './routes/auth';
import { uploadRoutes } from './routes/upload';
import { accountRoutes } from './routes/account';
import { transactionRoutes } from './routes/transaction';
import { categoryRoutes } from './routes/category';
import { reminderRoutes } from './routes/reminder';
import { errorHandler } from './middleware/errorHandler';
import { initializeDatabase } from './db/connection';
import { validateEnvironment } from './middleware/validateEnv';
import { apiLimiter, uploadLimiter } from './middleware/rateLimiter';
import { sanitizeInput } from './middleware/sanitize';

dotenv.config();

// Validate environment variables before starting
validateEnvironment();

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy for accurate IP addresses (needed for rate limiting behind proxies)
app.set('trust proxy', 1);

// Enhanced Helmet configuration
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false, // Allow cross-origin resources
}));

// Configure CORS with proper origin restrictions
const allowedOrigins = process.env.CORS_ORIGINS 
  ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim())
  : (process.env.NODE_ENV === 'production' 
      ? [] // No origins allowed in production by default - must be configured
      : ['http://localhost:3000', 'http://localhost:5173']); // Development defaults

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests) in development
    if (!origin && process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Apply rate limiting to all API routes
app.use('/api', apiLimiter);

// Apply input sanitization
app.use(sanitizeInput);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/uploads', uploadLimiter, uploadRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/reminders', reminderRoutes);

// Root endpoint - return HTML page
app.get('/', (req, res) => {
  // Check if client wants JSON (API clients)
  if (req.headers.accept && req.headers.accept.includes('application/json')) {
    return res.json({ 
      message: 'Financial Tracker API',
      version: '1.0.0',
      documentation: 'Visit /api for API information',
      endpoints: {
        api: '/api',
        health: '/api/health',
        auth: '/api/auth',
        uploads: '/api/uploads',
        accounts: '/api/accounts',
        transactions: '/api/transactions',
        categories: '/api/categories',
        reminders: '/api/reminders'
      }
    });
  }
  
  // Return HTML for browser requests
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Financial Tracker API</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .container {
          background: white;
          border-radius: 16px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          padding: 40px;
          max-width: 600px;
          width: 100%;
        }
        h1 {
          color: #1f2937;
          font-size: 2rem;
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .logo {
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: bold;
          font-size: 1.2rem;
        }
        .version {
          color: #6b7280;
          font-size: 0.875rem;
          margin-bottom: 24px;
        }
        .description {
          color: #4b5563;
          margin-bottom: 32px;
          line-height: 1.6;
        }
        .endpoints {
          margin-top: 24px;
        }
        .endpoints h2 {
          color: #1f2937;
          font-size: 1.25rem;
          margin-bottom: 16px;
        }
        .endpoint-list {
          list-style: none;
        }
        .endpoint-item {
          padding: 12px 16px;
          margin-bottom: 8px;
          background: #f9fafb;
          border-radius: 8px;
          border-left: 3px solid #667eea;
          transition: all 0.2s;
        }
        .endpoint-item:hover {
          background: #f3f4f6;
          transform: translateX(4px);
        }
        .endpoint-method {
          display: inline-block;
          padding: 4px 8px;
          background: #667eea;
          color: white;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 600;
          margin-right: 8px;
          text-transform: uppercase;
        }
        .endpoint-path {
          color: #1f2937;
          font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
          font-size: 0.9rem;
        }
        .status {
          display: inline-block;
          padding: 6px 12px;
          background: #10b981;
          color: white;
          border-radius: 6px;
          font-size: 0.875rem;
          font-weight: 500;
          margin-top: 24px;
        }
        .footer {
          margin-top: 32px;
          padding-top: 24px;
          border-top: 1px solid #e5e7eb;
          text-align: center;
          color: #6b7280;
          font-size: 0.875rem;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>
          <span class="logo">$</span>
          Financial Tracker API
        </h1>
        <div class="version">Version 1.0.0</div>
        <p class="description">
          Welcome to the Financial Tracker API. This is a RESTful API for managing financial transactions, accounts, categories, and reminders.
        </p>
        <div class="status">✓ API is running</div>
        <div class="endpoints">
          <h2>Available Endpoints</h2>
          <ul class="endpoint-list">
            <li class="endpoint-item">
              <span class="endpoint-method">GET</span>
              <span class="endpoint-path"><a href="/api/health" style="color: #667eea; text-decoration: none;">/api/health</a></span>
            </li>
            <li class="endpoint-item">
              <span class="endpoint-method">POST</span>
              <span class="endpoint-path">/api/auth/login</span>
            </li>
            <li class="endpoint-item">
              <span class="endpoint-method">POST</span>
              <span class="endpoint-path">/api/auth/register</span>
            </li>
            <li class="endpoint-item">
              <span class="endpoint-method">GET</span>
              <span class="endpoint-path">/api/accounts</span>
            </li>
            <li class="endpoint-item">
              <span class="endpoint-method">GET</span>
              <span class="endpoint-path">/api/transactions</span>
            </li>
            <li class="endpoint-item">
              <span class="endpoint-method">GET</span>
              <span class="endpoint-path">/api/categories</span>
            </li>
            <li class="endpoint-item">
              <span class="endpoint-method">GET</span>
              <span class="endpoint-path">/api/reminders</span>
            </li>
            <li class="endpoint-item">
              <span class="endpoint-method">POST</span>
              <span class="endpoint-path">/api/uploads</span>
            </li>
          </ul>
        </div>
        <div class="footer">
          For API documentation, visit <a href="/api" style="color: #667eea;">/api</a> or use JSON format by sending <code>Accept: application/json</code> header
        </div>
      </div>
    </body>
    </html>
  `);
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Root API endpoint
app.get('/api', (req, res) => {
  res.json({ 
    message: 'Financial Tracker API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      uploads: '/api/uploads',
      accounts: '/api/accounts',
      transactions: '/api/transactions',
      categories: '/api/categories',
      reminders: '/api/reminders',
      health: '/api/health'
    }
  });
});

// Error handling
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Initialize database and start server
async function startServer() {
  try {
    await initializeDatabase();
    console.log('Database initialized successfully');
    
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

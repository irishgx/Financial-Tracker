import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Joi from 'joi';
import { db } from '../db/connection';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { getCurrentTimestamp } from '../services/jsonStorage';
import { authLimiter } from '../middleware/rateLimiter';
import { logSecurityEvent } from '../middleware/securityLogger';

const router = Router();

// Stronger password validation
const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;

const registerSchema = Joi.object({
  email: Joi.string().email().required().lowercase().trim(),
  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(passwordRegex)
    .required()
    .messages({
      'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
      'string.min': 'Password must be at least 8 characters long',
      'string.max': 'Password must not exceed 128 characters'
    }),
  firstName: Joi.string().min(1).max(100).required().trim(),
  lastName: Joi.string().min(1).max(100).required().trim()
});

const loginSchema = Joi.object({
  email: Joi.string().email().required().lowercase().trim(),
  password: Joi.string().required()
});

// Account lockout configuration
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

async function isAccountLocked(user: any): Promise<boolean> {
  if (!user.accountLockedUntil) {
    return false;
  }
  
  const lockUntil = new Date(user.accountLockedUntil);
  const now = new Date();
  
  if (now < lockUntil) {
    return true;
  }
  
  // Lockout expired, reset it
  await db.users.update(user.id, {
    failedLoginAttempts: 0,
    accountLockedUntil: undefined,
    updatedAt: getCurrentTimestamp()
  });
  
  return false;
}

async function handleFailedLogin(user: any): Promise<void> {
  const failedAttempts = (user.failedLoginAttempts || 0) + 1;
  const now = getCurrentTimestamp();
  
  if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
    const lockUntil = new Date(Date.now() + LOCKOUT_DURATION_MS).toISOString();
    await db.users.update(user.id, {
      failedLoginAttempts: failedAttempts,
      accountLockedUntil: lockUntil,
      updatedAt: now
    });
  } else {
    await db.users.update(user.id, {
      failedLoginAttempts: failedAttempts,
      updatedAt: now
    });
  }
}

async function handleSuccessfulLogin(user: any): Promise<void> {
  if (user.failedLoginAttempts || user.accountLockedUntil) {
    await db.users.update(user.id, {
      failedLoginAttempts: 0,
      accountLockedUntil: undefined,
      updatedAt: getCurrentTimestamp()
    });
  }
}

// Register
router.post('/register', authLimiter, async (req, res) => {
  try {
    const { error, value } = registerSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { email, password, firstName, lastName } = value;

    // Check if user already exists
    const existingUsers = await db.users.findBy('email', email);
    if (existingUsers.length > 0) {
      return res.status(409).json({ error: 'User already exists' });
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const now = getCurrentTimestamp();
    const user = await db.users.create({
      email,
      passwordHash,
      firstName,
      lastName,
      createdAt: now,
      updatedAt: now
    });

    // Generate JWT token
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not configured');
    }
    
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      jwtSecret,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    logSecurityEvent(req, 'login_success', { userId: user.id, email: user.email });

    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        createdAt: user.createdAt
      },
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    logSecurityEvent(req, 'suspicious_activity', { error: 'Registration failed', details: error });
    res.status(500).json({ error: 'Registration failed' });
  }
});

// Login
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { error, value } = loginSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { email, password } = value;

    // Find user
    const users = await db.users.findBy('email', email);
    if (users.length === 0) {
      logSecurityEvent(req, 'login_failure', { email, reason: 'User not found' });
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = users[0];

    // Check if account is locked
    const isLocked = await isAccountLocked(user);
    if (isLocked) {
      // Re-fetch user to get updated lock status
      const updatedUser = await db.users.findById(user.id);
      if (updatedUser?.accountLockedUntil) {
        const lockUntil = new Date(updatedUser.accountLockedUntil);
        const minutesRemaining = Math.ceil((lockUntil.getTime() - Date.now()) / (60 * 1000));
        logSecurityEvent(req, 'unauthorized_access', { 
          userId: user.id, 
          email, 
          reason: 'Account locked',
          minutesRemaining 
        });
        return res.status(423).json({ 
          error: 'Account is locked due to too many failed login attempts',
          retryAfter: minutesRemaining
        });
      }
      // Lockout expired, continue with login
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      await handleFailedLogin(user);
      logSecurityEvent(req, 'login_failure', { userId: user.id, email, reason: 'Invalid password' });
      
      const updatedUser = await db.users.findById(user.id);
      const remainingAttempts = MAX_FAILED_ATTEMPTS - (updatedUser?.failedLoginAttempts || 0);
      
      if (remainingAttempts <= 0) {
        return res.status(423).json({ 
          error: 'Account has been locked due to too many failed login attempts. Please try again in 15 minutes.',
          accountLocked: true
        });
      }
      
      return res.status(401).json({ 
        error: 'Invalid credentials',
        remainingAttempts
      });
    }

    // Successful login - reset failed attempts
    await handleSuccessfulLogin(user);
    logSecurityEvent(req, 'login_success', { userId: user.id, email });

    // Generate JWT token
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not configured');
    }
    
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      jwtSecret,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    logSecurityEvent(req, 'suspicious_activity', { error: 'Login failed', details: error });
    res.status(500).json({ error: 'Login failed' });
  }
});

// Get current user
router.get('/me', authenticateToken, async (req: AuthRequest, res) => {
  try {
    const user = await db.users.findById(req.user!.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

export { router as authRoutes };

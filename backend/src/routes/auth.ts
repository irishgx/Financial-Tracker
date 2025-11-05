import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import Joi from 'joi';
import crypto from 'crypto';
import { db } from '../db/connection';
import { authenticateToken, AuthRequest } from '../middleware/auth';
import { getCurrentTimestamp } from '../services/jsonStorage';
import { authLimiter } from '../middleware/rateLimiter';
import { logSecurityEvent } from '../middleware/securityLogger';
import { emailService } from '../services/emailService';

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

    // Generate email verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

    // Create user
    const now = getCurrentTimestamp();
    const user = await db.users.create({
      email,
      passwordHash,
      firstName,
      lastName,
      emailVerified: false,
      emailVerificationToken: verificationToken,
      emailVerificationTokenExpires: verificationTokenExpires,
      createdAt: now,
      updatedAt: now
    });

    // Send verification email (non-blocking - don't fail registration if email fails)
    let emailSent = false;
    try {
      emailSent = await emailService.sendVerificationEmail(
        user.email,
        verificationToken,
        user.firstName
      );
    } catch (emailError) {
      console.error('Failed to send verification email (registration continues):', emailError);
      // Don't fail registration if email sending fails
      emailSent = false;
    }

    logSecurityEvent(req, 'login_success', { userId: user.id, email: user.email });

    res.status(201).json({
      message: emailSent 
        ? 'User created successfully. Please check your email to verify your account.'
        : 'User created successfully. Please verify your email address to complete registration.',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt
      },
      emailSent,
      requiresVerification: true
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', JSON.stringify(error, null, 2));
    logSecurityEvent(req, 'suspicious_activity', { error: 'Registration failed', details: error });
    
    // Provide more specific error messages
    let errorMessage = 'Registration failed';
    if (error.message) {
      errorMessage = error.message;
    } else if (error.code === 'EACCES' || error.code === 'ENOENT') {
      errorMessage = 'Database error. Please contact support.';
    }
    
    res.status(500).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? (error.message || String(error)) : undefined,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
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

    // Check if email is verified (optional - can be made required)
    const requireEmailVerification = process.env.REQUIRE_EMAIL_VERIFICATION === 'true';
    if (requireEmailVerification && !user.emailVerified) {
      logSecurityEvent(req, 'unauthorized_access', { 
        userId: user.id, 
        email, 
        reason: 'Email not verified' 
      });
      return res.status(403).json({ 
        error: 'Please verify your email address before logging in. Check your inbox for the verification link.',
        emailVerified: false,
        canResend: true
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
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' } as jwt.SignOptions
    );

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        emailVerified: user.emailVerified
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    logSecurityEvent(req, 'suspicious_activity', { error: 'Login failed', details: error });
    res.status(500).json({ error: 'Login failed' });
  }
});

// Verify email
router.get('/verify-email', async (req, res) => {
  try {
    const { token } = req.query;

    if (!token || typeof token !== 'string') {
      return res.status(400).json({ error: 'Verification token is required' });
    }

    // Find user with matching token
    const allUsers = await db.users.findAll();
    const user = allUsers.find(u => 
      u.emailVerificationToken === token &&
      u.emailVerificationTokenExpires &&
      new Date(u.emailVerificationTokenExpires) > new Date()
    );

    if (!user) {
      return res.status(400).json({ 
        error: 'Invalid or expired verification token. Please request a new verification email.' 
      });
    }

    // Verify email
    const now = getCurrentTimestamp();
    await db.users.update(user.id, {
      emailVerified: true,
      emailVerificationToken: undefined,
      emailVerificationTokenExpires: undefined,
      updatedAt: now
    });

    logSecurityEvent(req, 'login_success', { 
      userId: user.id, 
      email: user.email, 
      reason: 'Email verified' 
    });

    res.json({
      message: 'Email verified successfully. You can now log in to your account.',
      verified: true
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ error: 'Failed to verify email' });
  }
});

// Resend verification email
router.post('/resend-verification', authLimiter, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Find user
    const users = await db.users.findBy('email', email.toLowerCase().trim());
    if (users.length === 0) {
      // Don't reveal if user exists for security
      return res.json({
        message: 'If an account with that email exists and is not verified, a verification email has been sent.'
      });
    }

    const user = users[0];

    // Check if already verified
    if (user.emailVerified) {
      return res.json({
        message: 'Your email is already verified.'
      });
    }

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    // Update user
    const now = getCurrentTimestamp();
    await db.users.update(user.id, {
      emailVerificationToken: verificationToken,
      emailVerificationTokenExpires: verificationTokenExpires,
      updatedAt: now
    });

    // Send verification email
    await emailService.sendVerificationEmail(
      user.email,
      verificationToken,
      user.firstName
    );

    logSecurityEvent(req, 'login_success', { 
      userId: user.id, 
      email: user.email, 
      reason: 'Verification email resent' 
    });

    res.json({
      message: 'Verification email sent. Please check your inbox.'
    });
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ error: 'Failed to resend verification email' });
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
        emailVerified: user.emailVerified,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

export { router as authRoutes };

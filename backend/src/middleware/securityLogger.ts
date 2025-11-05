import { Request, Response } from 'express';
import { AuthRequest } from './auth';

interface SecurityEvent {
  type: 'login_failure' | 'login_success' | 'rate_limit' | 'unauthorized_access' | 'file_upload' | 'suspicious_activity';
  timestamp: string;
  ip: string;
  userAgent?: string;
  userId?: string;
  details?: any;
}

const securityEvents: SecurityEvent[] = [];
const MAX_LOG_SIZE = 1000; // Keep last 1000 events

export function logSecurityEvent(
  req: Request | AuthRequest,
  type: SecurityEvent['type'],
  details?: any
) {
  const event: SecurityEvent = {
    type,
    timestamp: new Date().toISOString(),
    ip: req.ip || req.socket.remoteAddress || 'unknown',
    userAgent: req.headers['user-agent'],
    userId: (req as AuthRequest).user?.id,
    details,
  };

  securityEvents.push(event);
  
  // Keep only last MAX_LOG_SIZE events
  if (securityEvents.length > MAX_LOG_SIZE) {
    securityEvents.shift();
  }

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    console.log('[SECURITY EVENT]', event);
  }

  // In production, you might want to send this to a logging service
  // For now, we'll just keep it in memory
}

export function getSecurityEvents(limit: number = 100): SecurityEvent[] {
  return securityEvents.slice(-limit);
}

export function getSecurityEventsByType(type: SecurityEvent['type'], limit: number = 100): SecurityEvent[] {
  return securityEvents.filter(e => e.type === type).slice(-limit);
}


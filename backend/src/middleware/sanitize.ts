import { Request, Response, NextFunction } from 'express';

/**
 * Basic XSS protection by sanitizing string inputs
 * Removes potentially dangerous characters and scripts
 */
export function sanitizeInput(req: Request, res: Response, next: NextFunction) {
  const sanitizeString = (value: any): any => {
    if (typeof value === 'string') {
      // Remove script tags and event handlers
      return value
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
        .replace(/javascript:/gi, '')
        .trim();
    }
    if (Array.isArray(value)) {
      return value.map(sanitizeString);
    }
    if (value && typeof value === 'object') {
      const sanitized: any = {};
      for (const key in value) {
        sanitized[key] = sanitizeString(value[key]);
      }
      return sanitized;
    }
    return value;
  };

  if (req.body) {
    req.body = sanitizeString(req.body);
  }
  if (req.query) {
    req.query = sanitizeString(req.query);
  }
  if (req.params) {
    req.params = sanitizeString(req.params);
  }

  next();
}


import dotenv from 'dotenv';

dotenv.config();

interface RequiredEnvVars {
  JWT_SECRET: string;
  NODE_ENV?: string;
  PORT?: string;
}

const requiredEnvVars: (keyof RequiredEnvVars)[] = ['JWT_SECRET'];

export function validateEnvironment(): void {
  const missing: string[] = [];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      missing.push(envVar);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      `Please check your .env file or environment configuration.`
    );
  }

  // Validate JWT_SECRET strength in production
  if (process.env.NODE_ENV === 'production') {
    const jwtSecret = process.env.JWT_SECRET!;
    if (jwtSecret.length < 32) {
      throw new Error(
        'JWT_SECRET must be at least 32 characters long in production. ' +
        'Generate a strong secret using: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
      );
    }
    
    // Warn if using default secret
    if (jwtSecret.includes('your-super-secret') || jwtSecret.includes('change-this')) {
      throw new Error(
        'JWT_SECRET appears to be using a default value. ' +
        'Please set a strong, unique secret for production.'
      );
    }
  }
}


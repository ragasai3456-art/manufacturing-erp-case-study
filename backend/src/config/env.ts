import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load environment variables from .env file if present
// In production (e.g. Render/Cloud Run), existing environment variables must always take precedence
dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

// Strict validation in production: ensure mandatory variables are present without weak fallbacks
if (isProduction) {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required in production');
  }
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 16) {
    throw new Error('JWT_SECRET is required in production and must be at least 16 characters long');
  }
  if (process.env.JWT_SECRET === 'super_secret_jwt_key_for_erp_manufacturing_case_study_2026') {
    throw new Error('Default development JWT_SECRET cannot be used in production');
  }
  if (!process.env.FRONTEND_URL) {
    throw new Error('FRONTEND_URL is required in production');
  }
}

const envSchema = z.object({
  DATABASE_URL: isProduction
    ? z.string().min(1, 'DATABASE_URL is required in production')
    : z
        .string()
        .default(
          'postgresql://erp_user:erp_password@localhost:5432/erp_case_study?schema=public'
        ),
  JWT_SECRET: isProduction
    ? z.string().min(16, 'JWT_SECRET must be at least 16 characters long')
    : z
        .string()
        .min(16, 'JWT_SECRET must be at least 16 characters long')
        .default('super_secret_jwt_key_for_erp_manufacturing_case_study_2026'),
  JWT_EXPIRES_IN: z.string().default('24h'),
  PORT: z.coerce.number().default(5000),
  FRONTEND_URL: isProduction
    ? z.string().min(1, 'FRONTEND_URL is required in production')
    : z.string().default('http://localhost:3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  // Never print raw secrets to logs
  const issues = parsedEnv.error.issues
    .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    .join(', ');
  console.error(`Invalid environment configuration: ${issues}`);
  throw new Error(`Invalid environment configuration: ${issues}`);
}

export const env = parsedEnv.data;

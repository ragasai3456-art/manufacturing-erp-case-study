import { PrismaClient } from '@prisma/client';
import { createPrismaFallback } from '../utils/prismaFallback.js';

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

const realPrisma =
  global.prisma ||
  new PrismaClient();

const isProduction = process.env.NODE_ENV === 'production';

// Production safety check: fail fast and clearly if DATABASE_URL is missing
if (isProduction && !process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required in production');
}

if (!isProduction) {
  global.prisma = realPrisma;
}

// In PRODUCTION: PostgreSQL is authoritative. NEVER register in-memory database fallbacks.
// Database errors must be explicit, observable, and fail fast without silent data diversion.
if (!isProduction) {
  const fallback = createPrismaFallback();

  const isDbUnavailable = (err: any): boolean => {
    if (!err) return false;
    const msg = String(err.message || '');
    const code = String(err.code || '');
    return (
      code === 'P1001' ||
      code === 'P1002' ||
      code === 'P1003' ||
      code === 'P1017' ||
      code === 'P2021' || // Table does not exist
      code === 'P2022' || // Column does not exist
      msg.includes("Can't reach database server") ||
      msg.includes('connect ECONNREFUSED') ||
      msg.includes('Connection closed') ||
      msg.includes('database server was not found') ||
      msg.includes('Environment variable not found: DATABASE_URL') ||
      msg.includes('does not exist in the current database')
    );
  };

  // Wrap each model with graceful fallback ONLY in non-production environments
  const models = [
    'user',
    'customer',
    'product',
    'inventory',
    'enquiry',
    'enquiryItem',
    'quotation',
    'quotationItem',
    'salesOrder',
    'salesOrderItem',
    'dispatch',
    'dispatchItem',
  ];

  for (const m of models) {
    const modelObj = (realPrisma as any)[m];
    if (modelObj) {
      const methods = ['findUnique', 'findFirst', 'findMany', 'create', 'update', 'delete', 'upsert'];
      for (const method of methods) {
        if (typeof modelObj[method] === 'function') {
          const originalMethod = modelObj[method].bind(modelObj);
          modelObj[method] = async (...args: any[]) => {
            try {
              return await originalMethod(...args);
            } catch (err: any) {
              if (isDbUnavailable(err)) {
                return await (fallback as any)[m][method](...args);
              }
              throw err;
            }
          };
        }
      }
    }
  }

  // Wrap $transaction in non-production
  const origTx = realPrisma.$transaction.bind(realPrisma);
  (realPrisma as any).$transaction = async (arg: any) => {
    try {
      return await origTx(arg);
    } catch (err: any) {
      if (isDbUnavailable(err)) {
        return await fallback.$transaction(arg);
      }
      throw err;
    }
  };

  // Wrap $queryRaw in non-production
  const origRaw = realPrisma.$queryRaw.bind(realPrisma);
  (realPrisma as any).$queryRaw = async (query: any, ...values: any[]) => {
    try {
      return await origRaw(query, ...values);
    } catch (err: any) {
      if (isDbUnavailable(err)) {
        return await fallback.$queryRaw(query, ...values);
      }
      throw err;
    }
  };
}

export const prisma = realPrisma;

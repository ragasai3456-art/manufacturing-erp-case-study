import { app } from './app.js';
import { env } from './config/env.js';
import { prisma } from './config/prisma.js';

const PORT = env.PORT || 5000;

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Manufacturing ERP Backend listening on http://0.0.0.0:${PORT}`);
  console.log(`📡 Environment: ${env.NODE_ENV}`);
  console.log(`🔒 RBAC & JWT Authentication active`);
});

// Graceful shutdown
const handleShutdown = async (signal: string) => {
  console.log(`Received ${signal}. Shutting down gracefully...`);
  server.close(async () => {
    try {
      await prisma.$disconnect();
      console.log('Database disconnected successfully.');
      process.exit(0);
    } catch (err) {
      console.error('Error during shutdown:', err);
      process.exit(1);
    }
  });
};

process.on('SIGTERM', () => handleShutdown('SIGTERM'));
process.on('SIGINT', () => handleShutdown('SIGINT'));

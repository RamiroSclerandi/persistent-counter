import { PrismaClient } from '@prisma/client';

// Declare a global variable to hold the Prisma client instance
const globalForPrisma = global as unknown as { prisma: PrismaClient };

// Export a single instance of Prisma.
// If one already exists in the global object, reuse it. If not, create a new one.
export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: ['query', 'warn', 'error'],
  });

// In non-production environments, assign the instance to the global object.
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
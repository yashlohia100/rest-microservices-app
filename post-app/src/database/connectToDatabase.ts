import { logger } from '../logger.js';
import { prisma } from './prisma.js';

export async function connectToDatabase() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    logger.info('Database connected');
  } catch (error) {
    logger.error(error, 'Error connecting database');
    throw error;
  }
}

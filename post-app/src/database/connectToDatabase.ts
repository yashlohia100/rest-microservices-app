import { prisma } from './prisma.js';

export async function connectToDatabase() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('Database connected...');
  } catch (error) {
    console.error('Error connecting database:', error);
    throw error;
  }
}

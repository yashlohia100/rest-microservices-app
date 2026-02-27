import mongoose from 'mongoose';

export async function connectToDatabase() {
  try {
    await mongoose.connect(process.env.DATABASE_URL || '');
    console.log('Database connected...');
  } catch (error) {
    console.error('Error connecting database:', error);
    throw error;
  }
}

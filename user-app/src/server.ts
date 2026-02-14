import { app } from './app.js';
import { connectToDatabase } from './database/connectToDatabase.js';
import { prisma } from './database/prisma.js';

const port = process.env.PORT || 8080;

async function start() {
  try {
    await connectToDatabase();

    app.listen(port, () => {
      console.log(`Server is listening on port ${port}...`);
    });
  } catch (error) {
    console.error('Startup failed. Exiting.');
    process.exit(1);
  }
}

start();

async function shutdown() {
  console.log('Shutting down...');
  await prisma.$disconnect();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

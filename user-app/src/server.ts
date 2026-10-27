import { app } from './app.js';
import { connectToDatabase } from './database/connectToDatabase.js';
import { prisma } from './database/prisma.js';
import { sdk } from './instrumentation.js';
import { logger } from './logger.js';
import { emailQueue } from './queues/email.queue.js';
import { emailWorker } from './workers/email.worker.js';

const port = process.env.PORT || 8080;

async function start() {
  try {
    await connectToDatabase();

    logger.info('Email worker started...');

    app.listen(port, () => {
      logger.info(`Server is listening on port ${port}...`);
    });
  } catch (error) {
    logger.error('Startup failed. Exiting.');
    process.exit(1);
  }
}

start();

async function shutdown() {
  logger.info('Shutting down...');
  await emailWorker.close();
  await emailQueue.close();
  await prisma.$disconnect();
  await sdk.shutdown(); // flush remaining spans
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

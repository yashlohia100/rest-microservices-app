import { app, setupRateLimiter } from './app.js';
import { connectToDatabase } from './database/connectToDatabase.js';
import { prisma } from './database/prisma.js';
import { sdk } from './instrumentation.js';
import { logger } from './logger.js';
import { redis } from './redis/client.js';
import { initPostsCollection } from './typesense/posts.collection.js';

const port = process.env.PORT || 8080;

async function start() {
  try {
    await connectToDatabase();
    await redis.connect();
    setupRateLimiter();
    await initPostsCollection();

    app.listen(port, () => {
      logger.info(`Server is listening on port ${port}...`);
    });
  } catch (error) {
    logger.error(error, 'Startup failed. Exiting.');
    process.exit(1);
  }
}

start();

async function shutdown() {
  logger.info('Shutting down...');
  await redis.quit();
  await prisma.$disconnect();
  await sdk.shutdown(); // flush remaining spans
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

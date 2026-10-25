import mongoose from 'mongoose';
import { app } from './app.js';
import { connectToDatabase } from './database/connectToDatabase.js';
import { sdk } from './instrumentation.js';
import { logger } from './logger.js';

const port = process.env.PORT || 8080;

async function start() {
  try {
    await connectToDatabase();

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
  await mongoose.disconnect();
  await sdk.shutdown(); // flush remaining spans
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

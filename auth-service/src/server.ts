import { app } from './app.js';
import { sdk } from './instrumentation.js';
import { logger } from './logger.js';

const port = process.env.PORT || 8080;

app.listen(port, () => {
  logger.info(`Server is listening on port ${port}...`);
});

async function shutdown() {
  logger.info('Shutting down...');
  await sdk.shutdown(); // flush remaining spans
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

import fs from 'node:fs';
import path from 'node:path';
import { app } from './app.js';
import { logger } from './logger.js';

// Create logs directory if not exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

const port = process.env.PORT || 8080;

app.listen(port, () => {
  logger.info(`Server is listening on port ${port}...`);
});

async function shutdown() {
  logger.info('Shutting down...');
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

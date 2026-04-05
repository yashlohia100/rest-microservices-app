import fs from 'node:fs';
import path from 'node:path';
import pino from 'pino';
import { getContext } from './context.js';

const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const isDev = process.env.NODE_ENV !== 'production';

const logger = pino(
  {
    name: 'auth-service',
    base: {
      service: 'auth-service',
      env: process.env.NODE_ENV,
    },
    level: process.env.LOG_LEVEL || 'info',
    mixin() {
      const ctx = getContext();
      return ctx ? { requestId: ctx.requestId } : {};
    },
    transport: isDev
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
          },
        }
      : undefined,
  },
  pino.destination(path.join(process.cwd(), 'logs', 'auth-service.log')),
);

export { logger };

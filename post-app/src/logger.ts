import pino from 'pino';
import { getContext } from './context.js';

const isDev = process.env.NODE_ENV !== 'production';

const logger = pino({
  name: 'post-app',
  level: process.env.LOG_LEVEL || 'info',
  base: {
    service: 'post-app',
    env: process.env.NODE_ENV,
  },

  mixin: () => {
    const context = getContext();
    return context ? { requestId: context.requestId } : {};
  },

  transport: isDev
    ? {
        target: 'pino-pretty',
        options: {
          translateTime: 'SYS:standard',
        },
      }
    : undefined,
});

export { logger };

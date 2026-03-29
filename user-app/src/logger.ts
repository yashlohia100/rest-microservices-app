import pino from 'pino';
import { getContext } from './context.js';

const isDev = process.env.NODE_ENV !== 'production';

const logger = pino({
  name: 'user-app',
  level: process.env.LOG_LEVEL || 'info',
  base: {
    service: 'user-app',
    env: process.env.NODE_ENV,
  },

  mixin: () => {
    const context = getContext();
    return context ? { requestId: context.requestId } : {};
  },

  transport: isDev ? { target: 'pino-pretty' } : undefined,
});

export { logger };

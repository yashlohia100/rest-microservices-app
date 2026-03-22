import express from 'express';
import rateLimit from 'express-rate-limit';
import { collectDefaultMetrics, register } from 'prom-client';
import RedisStore from 'rate-limit-redis';
import { logger } from './logger.js';
import { postRouter } from './post.routes.js';
import { redis } from './redis/client.js';
import { requestContextMiddleware } from './requestContextMiddleware.js';
import { requestTimeLogger } from './requestTimeLogger.js';

collectDefaultMetrics();

const app = express();

app.use(express.json());

// Must be called after redis.connect() so the RedisStore can reach Redis
// Exclude `/metrics` route
function setupRateLimiter() {
  const rateLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 10,
    standardHeaders: 'draft-8',

    store: new RedisStore({
      sendCommand: (...args: string[]) => redis.sendCommand(args),
    }),
  });

  app.use(rateLimiter);
}

app.get('/', (req, res) => {
  logger.info('Request received on root route');
  res.status(200).send('Hello from the post-app.');
});

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.send(await register.metrics());
});

app.use(requestContextMiddleware);

app.use(requestTimeLogger);

app.use('/api/posts', postRouter);

export { app, setupRateLimiter };

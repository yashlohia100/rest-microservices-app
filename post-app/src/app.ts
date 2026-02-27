import express from 'express';
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { postRouter } from './post.routes.js';
import { redis } from './redis/client.js';

const app = express();

app.use(express.json());

const rateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // limit each IP to 10 requests per windowMs
  standardHeaders: 'draft-8',

  store: new RedisStore({
    sendCommand: (...args: string[]) => redis.sendCommand(args),
  }),
});

app.use(rateLimiter);

app.get('/', (req, res) => {
  res.status(200).send('Hello from the post-app.');
});

app.use('/api/posts', postRouter);

export { app };

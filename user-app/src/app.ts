import express from 'express';
import { collectDefaultMetrics, register } from 'prom-client';
import { requestContextMiddleware } from './requestContextMiddleware.js';
import { requestTimeLogger } from './requestTimeLogger.js';
import { userRouter } from './user.routes.js';

collectDefaultMetrics();

const app = express();

app.use(express.json());

app.get('/', (req, res) => {
  res.status(200).send('Hello from the user-app.');
});

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.send(await register.metrics());
});

app.use(requestContextMiddleware);

app.use(requestTimeLogger);

app.use('/api/users', userRouter);

export { app };

import express from 'express';
import { collectDefaultMetrics, register } from 'prom-client';
import { eventRouter } from './event.routes.js';
import { logger } from './logger.js';
import { requestContextMiddleware } from './requestContextMiddleware.js';
import { requestTimeLogger } from './requestTimeLogger.js';

collectDefaultMetrics();

const app = express();

app.use(express.json());

app.get('/', (req, res) => {
  logger.info('Request received on root route');
  res.status(200).send('Hello from the event-service.');
});

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.send(await register.metrics());
});

app.use(requestContextMiddleware);

app.use(requestTimeLogger);

app.use('/api/events', eventRouter);

export { app };

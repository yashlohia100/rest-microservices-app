import express from 'express';
import { pinoHttp } from 'pino-http';
import { collectDefaultMetrics, register } from 'prom-client';
import { authRouter } from './auth.routes.js';
import { logger } from './logger.js';

collectDefaultMetrics();

const app = express();

app.use(express.json());

app.use(pinoHttp({ logger: logger }));

app.get('/', (req, res) => {
  req.log.info('Request received on the root route');
  res.status(200).send('Hello from the auth-service.');
});

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.send(await register.metrics());
});

app.use('/api/auth', authRouter);

export { app };

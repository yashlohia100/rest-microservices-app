import express from 'express';
import { pinoHttp } from 'pino-http';
import { collectDefaultMetrics, register } from 'prom-client';
import { authRouter } from './auth.routes.js';
import { logger } from './logger.js';
import { requestContextMiddleware } from './requestContextMiddleware.js';

collectDefaultMetrics();

const app = express();

app.use(express.json());

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.send(await register.metrics());
});

app.use(pinoHttp({ logger: logger }));

app.use(requestContextMiddleware);

app.get('/', (req, res) => {
  req.log.info('Request received on the root route');
  res.status(200).send('Hello from the auth-service.');
});

app.use((req, res, next) => {
  req.log.info(`Request received ${req.method} ${req.url}`);
  next();
});

app.use('/api/auth', authRouter);

export { app };

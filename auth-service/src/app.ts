import express from 'express';
import { collectDefaultMetrics, register } from 'prom-client';
import { authRouter } from './auth.routes.js';

collectDefaultMetrics();

const app = express();

app.use(express.json());

app.get('/', (req, res) => {
  res.status(200).send('Hello from the auth-service.');
});

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.send(await register.metrics());
});

app.use('/api/auth', authRouter);

export { app };

import express from 'express';
import { authRouter } from './auth.routes.js';

const app = express();

app.use(express.json());

app.get('/', (req, res) => {
  res.status(200).send('Hello from the auth-service.');
});

app.use('/api/auth', authRouter);

export { app };

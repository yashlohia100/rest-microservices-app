import express from 'express';
import { userRouter } from './user.routes.js';

const app = express();

app.use(express.json());

app.get('/', (req, res) => {
  res.status(200).send('Hello from the user-app.');
});

app.use('/api/users', userRouter);

export { app };

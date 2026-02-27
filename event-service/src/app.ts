import express from 'express';
import { eventRouter } from './event.routes.js';

const app = express();

app.use(express.json());

app.get('/', (req, res) => {
  res.status(200).send('Hello from the event-service.');
});

app.use('/api/events', eventRouter);

export { app };

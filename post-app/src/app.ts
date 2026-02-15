import express from 'express';
import { postRouter } from './post.routes.js';

const app = express();

app.use(express.json());

app.get('/', (req, res) => {
  res.status(200).send('Hello from the post-app.');
});

app.use('/api/posts', postRouter);

export { app };

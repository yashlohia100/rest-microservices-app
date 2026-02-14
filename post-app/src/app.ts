import express from 'express';

const app = express();

app.get('/', (req, res) => {
  res.status(200).send('Hello from the post-app.');
});

export { app };

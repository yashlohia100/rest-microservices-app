import { NextFunction, Request, Response } from 'express';
import { logger } from './logger.js';

const requestTimeLogger = (req: Request, res: Response, next: NextFunction) => {
  logger.info(
    {
      method: req.method,
      url: req.originalUrl,
      params: req.params,
      queryParams: req.query,
      requestBody: req.body,
    },
    'Incoming request',
  );

  const start = Date.now();

  res.on('finish', () => {
    const durationMs = Date.now() - start;

    logger.info(
      {
        method: req.method,
        url: req.originalUrl,
        durationMs,
      },
      'Request finish',
    );
  });

  next();
};

export { requestTimeLogger };

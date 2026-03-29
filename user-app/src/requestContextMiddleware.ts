import { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { setContext } from './context.js';

// Generate unique `requestId`
// Set `requestId` in context
const requestContextMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const requestIdHeaderValue = req.get('x-request-id');

  const requestId = requestIdHeaderValue || randomUUID();

  // Set `requestId` in context
  setContext({ requestId }, () => {
    res.set('x-request-id', requestId);
    next();
  });
};

export { requestContextMiddleware };

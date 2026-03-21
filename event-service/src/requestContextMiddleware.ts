import { NextFunction, Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { setContext } from './context.js';

const requestContextMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const requestIdHeaderValue = req.headers['x-request-id'];

  let requestId = '';

  if (Array.isArray(requestIdHeaderValue)) {
    requestId = requestIdHeaderValue[0];
  } else if (typeof requestIdHeaderValue === 'string') {
    requestId = requestIdHeaderValue;
  } else {
    // Generate a unique id
    requestId = randomUUID();
  }

  // Set `requestId` in context
  setContext({ requestId }, () => {
    res.setHeader('x-request-id', requestId);
    next();
  });
};

export { requestContextMiddleware };

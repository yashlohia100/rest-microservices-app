import { NextFunction, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { setContext } from './context.js';

function requestContextMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const requestIdHeaderValue = req.headers['x-request-id'];

  let requestId = '';

  if (Array.isArray(requestIdHeaderValue)) {
    requestId = requestIdHeaderValue[0];
  } else if (typeof requestIdHeaderValue === 'string') {
    requestId = requestIdHeaderValue;
  } else {
    requestId = uuidv4();
  }

  // const requestId = Array.isArray(headerValue)
  //   ? headerValue[0]
  //   : headerValue || uuidv4();

  setContext({ requestId }, () => {
    res.setHeader('x-request-id', requestId);
    next();
  });
}

export { requestContextMiddleware };

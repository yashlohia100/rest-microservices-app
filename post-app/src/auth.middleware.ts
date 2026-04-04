import axios from 'axios';
import { NextFunction, Request, Response } from 'express';
import { axiosInstance } from './axiosInstance.js';
import { logger } from './logger.js';

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL;

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      logger.debug('Auth rejected: no token provided');
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    const token = authHeader.split(' ')[1];
    logger.debug('Verifying token with auth-service');

    // Verify token via auth microservice
    const response = await axiosInstance.post(
      `${AUTH_SERVICE_URL}/api/auth/verify-token`,
      { token },
    );

    const { decoded } = response.data;

    // Attach userId to request for downstream handlers
    req.user = { id: decoded.userId };

    logger.debug({ userId: decoded.userId }, 'Token verified');

    next();
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      logger.debug('Auth rejected: invalid or expired token');
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    logger.error(error, 'Auth middleware error');
    res.status(500).json({ error: 'Authentication failed' });
  }
};

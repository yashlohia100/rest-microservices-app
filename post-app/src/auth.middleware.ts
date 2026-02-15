import { Request, Response, NextFunction } from 'express';
import axios from 'axios';

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL;

export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }

    const token = authHeader.split(' ')[1];

    // Verify token via auth microservice
    const response = await axios.post(
      `${AUTH_SERVICE_URL}/api/auth/verify-token`,
      { token },
    );

    const { decoded } = response.data;

    // Attach userId to request for downstream handlers
    req.user = { id: decoded.userId };

    next();
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};

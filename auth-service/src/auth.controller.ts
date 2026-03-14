import { Request, Response } from 'express';
import { signJwtAsync, verifyJwtAsync } from './jwt.utils.js';
import { logger } from './logger.js';

const secretKey = process.env.JWT_SECRET;

export const generateToken = async (req: Request, res: Response) => {
  try {
    logger.debug('Generating token...');
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        error: 'userId is required',
      });
    }

    if (!secretKey) {
      return res.status(500).json({
        error: 'JWT_SECRET is not configured',
      });
    }

    const token = await signJwtAsync({ userId }, secretKey, {
      expiresIn: '3d',
    });

    logger.debug('Token generated successfully');

    res.status(200).json({
      token,
    });
  } catch (error) {
    logger.error(error, 'Error generating token');
    res.status(500).json({
      error: 'Failed to generate token',
    });
  }
};

export const verifyToken = async (req: Request, res: Response) => {
  try {
    logger.debug('Verifying token...');
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        error: 'token is required',
      });
    }

    if (!secretKey) {
      return res.status(500).json({
        error: 'JWT_SECRET is not configured',
      });
    }

    const decoded = await verifyJwtAsync(token, secretKey);

    logger.debug('Token verified successfully');

    res.status(200).json({
      decoded,
    });
  } catch (error) {
    logger.error(error, 'Error verifying token');
    res.status(401).json({
      error: 'Invalid or expired token',
    });
  }
};

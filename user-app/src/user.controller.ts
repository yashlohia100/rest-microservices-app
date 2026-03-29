import bcrypt from 'bcryptjs';
import { Request, Response } from 'express';
import { axiosInstance as axios } from './axiosInstance.js';
import { prisma } from './database/prisma.js';
import { logger } from './logger.js';
import { addWelcomeEmailJob } from './queues/email.queue.js';

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL;
const EVENT_SERVICE_URL = process.env.EVENT_SERVICE_URL;
const SALT_ROUNDS = 10;

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    logger.debug('Fetching all users');
    const users = await prisma.user.findMany();

    logger.debug('Fetching all users flow complete');
    res.status(200).json({
      numRecords: users.length,
      users,
    });
  } catch (error) {
    logger.error({ err: error }, 'Error fetching users');
    res.status(500).json('Error fetching users');
  }
};

// GET /api/users/:userId - Get user by ID (used by other microservices)
export const getUserById = async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId as string;
    logger.debug({ userId }, 'Getting user by id');

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Return user info without the password
    res.status(200).json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      },
    });
    logger.debug({ userId }, 'Successfully fetched user by id');
  } catch (error) {
    logger.error({ err: error }, 'Error fetching user');
    res.status(500).json({ error: 'Failed to fetch user' });
  }
};

export const signup = async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;
    logger.debug({ email }, 'Signup request received');

    // Validate input
    if (!name || !email || !password) {
      res.status(400).json({
        error: 'name, email, and password are required',
      });
      return;
    }

    // Check if user with this email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      res.status(409).json({
        error: 'A user with this email already exists',
      });
      return;
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    logger.debug({ email }, 'Password hashed for signup');

    // Create user in database
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
    });
    logger.debug(
      { userId: user.id, email: user.email },
      'User created in database',
    );

    // Generate JWT token via auth microservice
    const tokenResponse = await axios.post(
      `${AUTH_SERVICE_URL}/api/auth/generate-token`,
      { userId: user.id },
    );
    logger.debug({ userId: user.id }, 'Token generated via auth service');

    const { token } = tokenResponse.data;

    // Queue welcome email asynchronously
    await addWelcomeEmailJob({
      userId: user.id,
      name: user.name,
      email: user.email,
    });
    logger.debug({ userId: user.id }, 'Welcome email job queued');

    // Send userCreated event to event-service
    try {
      await axios.post(`${EVENT_SERVICE_URL}/api/events`, {
        type: 'userCreated',
        serviceName: 'userService',
        sourceId: user.id,
        data: {
          id: user.id,
          name: user.name,
          email: user.email,
          createdAt: user.createdAt,
        },
      });
      logger.debug({ userId: user.id }, 'userCreated event sent');
    } catch (error) {
      logger.warn(
        { err: error, userId: user.id },
        'Failed to send userCreated event',
      );
    }

    // Send response without the password
    res.status(201).json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      },
      token,
    });
    logger.debug({ userId: user.id }, 'Signup flow completed successfully');
  } catch (error) {
    logger.error({ err: error }, 'Error during signup');
    res.status(500).json({
      error: 'Something went wrong during signup',
    });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    logger.debug({ email }, 'Login request received');

    // Validate input
    if (!email || !password) {
      res.status(400).json({
        error: 'email and password are required',
      });
      return;
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      res.status(404).json({
        error: 'No user found with this email',
      });
      return;
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    logger.debug({ userId: user.id }, 'Password verification completed');

    if (!isPasswordValid) {
      res.status(401).json({
        error: 'Incorrect password',
      });
      return;
    }

    // Generate JWT token via auth microservice
    const tokenResponse = await axios.post(
      `${AUTH_SERVICE_URL}/api/auth/generate-token`,
      { userId: user.id },
    );
    logger.debug(
      { userId: user.id },
      'Token generated via auth service for login',
    );

    const { token } = tokenResponse.data;

    // Send response without the password
    res.status(200).json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      },
      token,
    });
    logger.debug({ userId: user.id }, 'Login flow completed successfully');
  } catch (error) {
    logger.error({ err: error }, 'Error during login');
    res.status(500).json({
      error: 'Something went wrong during login',
    });
  }
};

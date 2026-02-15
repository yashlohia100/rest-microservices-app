import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import axios from 'axios';
import { prisma } from './database/prisma.js';

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL;
const SALT_ROUNDS = 10;

// GET /api/users/:userId - Get user by ID (used by other microservices)
export const getUserById = async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId as string;

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
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
};

export const signup = async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

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

    // Create user in database
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
    });

    // Generate JWT token via auth microservice
    const tokenResponse = await axios.post(
      `${AUTH_SERVICE_URL}/api/auth/generate-token`,
      { userId: user.id },
    );

    const { token } = tokenResponse.data;

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
  } catch (error) {
    console.error('Error during signup:', error);
    res.status(500).json({
      error: 'Something went wrong during signup',
    });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

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
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({
      error: 'Something went wrong during login',
    });
  }
};

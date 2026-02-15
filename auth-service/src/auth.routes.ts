import { Router } from 'express';
import { generateToken, verifyToken } from './auth.controller.js';

const authRouter = Router();

authRouter.post('/generate-token', generateToken);

authRouter.post('/verify-token', verifyToken);

export { authRouter };

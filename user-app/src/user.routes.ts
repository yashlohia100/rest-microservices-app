import { Router } from 'express';
import { login, signup } from './user.controller.js';

const userRouter = Router();

userRouter.post('/signup', signup);

userRouter.post('/login', login);

export { userRouter };

import { Router } from 'express';
import { getUserById, login, signup } from './user.controller.js';

const userRouter = Router();

userRouter.get('/:userId', getUserById);

userRouter.post('/signup', signup);

userRouter.post('/login', login);

export { userRouter };

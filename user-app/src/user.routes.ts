import { Router } from 'express';
import { getAllUsers, getUserById, login, signup } from './user.controller.js';

const userRouter = Router();

userRouter.get('/', getAllUsers);

userRouter.get('/:userId', getUserById);

userRouter.post('/signup', signup);

userRouter.post('/login', login);

export { userRouter };

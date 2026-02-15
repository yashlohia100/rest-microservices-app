import { Router } from 'express';
import {
  getAllPosts,
  getPost,
  createPost,
  updatePost,
  deletePost,
} from './post.controller.js';
import { authMiddleware } from './auth.middleware.js';

const postRouter = Router();

// Public routes
postRouter.get('/', getAllPosts);
postRouter.get('/:postId', getPost);

// Protected routes (require authentication)
postRouter.post('/', authMiddleware, createPost);
postRouter.patch('/:postId', authMiddleware, updatePost);
postRouter.delete('/:postId', authMiddleware, deletePost);

export { postRouter };

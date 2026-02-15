import { Request, Response } from 'express';
import axios from 'axios';
import { prisma } from './database/prisma.js';

const USER_SERVICE_URL = process.env.USER_SERVICE_URL;

// GET /api/posts - Get all published posts
export const getAllPosts = async (req: Request, res: Response) => {
  try {
    const posts = await prisma.post.findMany({
      where: { published: true },
      orderBy: { createdAt: 'desc' },
    });

    res.status(200).json({ posts });
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
};

// GET /api/posts/:postId - Get a single post with author details
export const getPost = async (req: Request, res: Response) => {
  try {
    const postId = req.params.postId as string;

    const post = await prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      res.status(404).json({ error: 'Post not found' });
      return;
    }

    // Fetch author from user microservice (since User lives in a separate DB)
    let author = null;
    try {
      const userResponse = await axios.get(
        `${USER_SERVICE_URL}/api/users/${post.authorId}`,
      );
      author = userResponse.data.user;
    } catch {
      console.warn(`Could not fetch author for post ${postId}`);
    }

    res.status(200).json({
      post: {
        ...post,
        author,
      },
    });
  } catch (error) {
    console.error('Error fetching post:', error);
    res.status(500).json({ error: 'Failed to fetch post' });
  }
};

// POST /api/posts - Create a new post (protected)
export const createPost = async (req: Request, res: Response) => {
  try {
    const { title, content, published } = req.body;
    const authorId = req.user!.id;

    if (!title || !content) {
      res.status(400).json({ error: 'title and content are required' });
      return;
    }

    const post = await prisma.post.create({
      data: {
        title,
        content,
        published: published ?? false,
        authorId,
      },
    });

    res.status(201).json({ post });
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ error: 'Failed to create post' });
  }
};

// PATCH /api/posts/:postId - Update a post (protected)
export const updatePost = async (req: Request, res: Response) => {
  try {
    const postId = req.params.postId as string;
    const userId = req.user!.id;

    // Check if post exists and belongs to the user
    const existingPost = await prisma.post.findUnique({
      where: { id: postId },
    });

    if (!existingPost) {
      res.status(404).json({ error: 'Post not found' });
      return;
    }

    if (existingPost.authorId !== userId) {
      res.status(403).json({ error: 'You can only update your own posts' });
      return;
    }

    // Only allow updating specific fields
    const { title, content, published } = req.body;

    const post = await prisma.post.update({
      where: { id: postId },
      data: {
        ...(title !== undefined && { title }),
        ...(content !== undefined && { content }),
        ...(published !== undefined && { published }),
      },
    });

    res.status(200).json({ post });
  } catch (error) {
    console.error('Error updating post:', error);
    res.status(500).json({ error: 'Failed to update post' });
  }
};

// DELETE /api/posts/:postId - Delete a post (protected)
export const deletePost = async (req: Request, res: Response) => {
  try {
    const postId = req.params.postId as string;
    const userId = req.user!.id;

    // Check if post exists and belongs to the user
    const existingPost = await prisma.post.findUnique({
      where: { id: postId },
    });

    if (!existingPost) {
      res.status(404).json({ error: 'Post not found' });
      return;
    }

    if (existingPost.authorId !== userId) {
      res.status(403).json({ error: 'You can only delete your own posts' });
      return;
    }

    await prisma.post.delete({
      where: { id: postId },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ error: 'Failed to delete post' });
  }
};

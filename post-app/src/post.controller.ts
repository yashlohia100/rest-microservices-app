import { Request, Response } from 'express';
import axios from 'axios';
import { prisma } from './database/prisma.js';
import { typesenseClient } from './typesense/client.js';
import { POSTS_COLLECTION } from './typesense/posts.collection.js';
import { redis } from './redis/client.js';

const USER_SERVICE_URL = process.env.USER_SERVICE_URL;
const ALL_POSTS_CACHE_KEY = 'posts:all';
const CACHE_TTL_SECONDS = 60;

// GET /api/posts/search - Search posts via Typesense
export const searchPosts = async (req: Request, res: Response) => {
  try {
    const q = (req.query.q as string) || '*';
    const page = Math.max(1, Number(req.query.page) || 1);
    const perPage = Math.min(100, Math.max(1, Number(req.query.per_page) || 10));

    const results = await typesenseClient
      .collections(POSTS_COLLECTION)
      .documents()
      .search({
        q,
        query_by: 'title,content,authorName',
        filter_by: 'published:true',
        sort_by: 'createdAt:desc',
        page,
        per_page: perPage,
        highlight_full_fields: 'title,content',
      });

    res.status(200).json({
      query: q,
      found: results.found,
      page: results.page,
      hits: results.hits?.map((hit) => ({
        document: hit.document,
        highlights: hit.highlights,
      })),
    });
  } catch (error) {
    console.error('Error searching posts:', error);
    res.status(500).json({ error: 'Failed to search posts' });
  }
};

// GET /api/posts - Get all published posts (cached)
export const getAllPosts = async (req: Request, res: Response) => {
  try {
    // Check cache first
    const cached = await redis.get(ALL_POSTS_CACHE_KEY);
    if (cached) {
      res.status(200).json({ ...JSON.parse(cached), source: 'cache' });
      return;
    }

    const posts = await prisma.post.findMany({
      where: { published: true },
      orderBy: { createdAt: 'desc' },
    });

    const responseBody = { posts };

    // Store in cache with TTL
    await redis.set(ALL_POSTS_CACHE_KEY, JSON.stringify(responseBody), {
      EX: CACHE_TTL_SECONDS,
    });

    res.status(200).json({ ...responseBody, source: 'database' });
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
};

// GET /api/posts/:postId - Get a single post with author details (cached)
export const getPost = async (req: Request, res: Response) => {
  try {
    const postId = req.params.postId as string;
    const cacheKey = `posts:${postId}`;

    // Check cache first
    const cached = await redis.get(cacheKey);
    if (cached) {
      res.status(200).json({ ...JSON.parse(cached), source: 'cache' });
      return;
    }

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

    const responseBody = { post: { ...post, author } };

    // Store in cache with TTL
    await redis.set(cacheKey, JSON.stringify(responseBody), {
      EX: CACHE_TTL_SECONDS,
    });

    res.status(200).json({ ...responseBody, source: 'database' });
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

    // Sync to Typesense
    try {
      let authorName: string | undefined;
      try {
        const userResponse = await axios.get(
          `${USER_SERVICE_URL}/api/users/${authorId}`,
        );
        authorName = userResponse.data.user.name;
      } catch {
        console.warn('Could not fetch author name for Typesense sync');
      }

      await typesenseClient
        .collections(POSTS_COLLECTION)
        .documents()
        .upsert({
          id: post.id,
          title: post.title,
          content: post.content,
          published: post.published,
          authorId: post.authorId,
          ...(authorName && { authorName }),
          createdAt: post.createdAt.getTime(),
          updatedAt: post.updatedAt.getTime(),
        });
    } catch (tsError) {
      console.warn('Failed to sync post to Typesense:', tsError);
    }

    await redis.del(ALL_POSTS_CACHE_KEY);

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

    // Sync to Typesense
    try {
      await typesenseClient
        .collections(POSTS_COLLECTION)
        .documents(postId)
        .update({
          ...(title !== undefined && { title }),
          ...(content !== undefined && { content }),
          ...(published !== undefined && { published }),
          updatedAt: post.updatedAt.getTime(),
        });
    } catch (tsError) {
      console.warn('Failed to sync post update to Typesense:', tsError);
    }

    await redis.del([ALL_POSTS_CACHE_KEY, `posts:${postId}`]);

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

    // Sync to Typesense
    try {
      await typesenseClient
        .collections(POSTS_COLLECTION)
        .documents(postId)
        .delete();
    } catch (tsError) {
      console.warn('Failed to sync post deletion to Typesense:', tsError);
    }

    await redis.del([ALL_POSTS_CACHE_KEY, `posts:${postId}`]);

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ error: 'Failed to delete post' });
  }
};

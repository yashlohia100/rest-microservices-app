import { Request, Response } from 'express';
import { axiosInstance as axios } from './axiosInstance.js';
import { prisma } from './database/prisma.js';
import { logger } from './logger.js';
import { redis } from './redis/client.js';
import { typesenseClient } from './typesense/client.js';
import { POSTS_COLLECTION } from './typesense/posts.collection.js';

const USER_SERVICE_URL = process.env.USER_SERVICE_URL;
const EVENT_SERVICE_URL = process.env.EVENT_SERVICE_URL;
const ALL_POSTS_CACHE_KEY = 'posts:all';
const CACHE_TTL_SECONDS = 60;

async function invalidatePostCaches(postId?: string) {
  const keys: string[] = [ALL_POSTS_CACHE_KEY];
  if (postId) keys.push(`posts:${postId}`);

  // Collect all search cache keys
  for await (const batch of redis.scanIterator({
    MATCH: 'posts:search:*',
    COUNT: 100,
  })) {
    if (Array.isArray(batch)) {
      keys.push(...batch);
    } else {
      keys.push(batch);
    }
  }

  await Promise.all(keys.map((key) => redis.del(key)));
  logger.debug({ keys }, 'Invalidated post caches');
}

// GET /api/posts/search - Search posts via Typesense (cached)
export const searchPosts = async (req: Request, res: Response) => {
  try {
    const q = (req.query.q as string) || '*';
    const page = Math.max(1, Number(req.query.page) || 1);
    const perPage = Math.min(
      100,
      Math.max(1, Number(req.query.per_page) || 10),
    );

    logger.debug({ q, page, perPage }, 'Searching posts');

    // Cache key derived from query parameters
    const cacheKey = `posts:search:${q}:${page}:${perPage}`;

    const cached = await redis.get(cacheKey);
    if (cached) {
      logger.debug({ cacheKey }, 'Search cache hit');
      res.status(200).json({ ...JSON.parse(cached), source: 'cache' });
      return;
    }

    logger.debug({ cacheKey }, 'Search cache miss, querying Typesense');

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

    const responseBody = {
      query: q,
      found: results.found,
      page: results.page,
      hits: results.hits?.map((hit) => ({
        document: hit.document,
        highlights: hit.highlights,
      })),
    };

    await redis.set(cacheKey, JSON.stringify(responseBody), {
      EX: CACHE_TTL_SECONDS,
    });

    logger.debug({ found: results.found }, 'Search results cached');

    res.status(200).json({ ...responseBody, source: 'typesense' });
  } catch (error) {
    logger.error(error, 'Error searching posts');
    res.status(500).json({ error: 'Failed to search posts' });
  }
};

// GET /api/posts - Get all published posts (cached)
export const getAllPosts = async (req: Request, res: Response) => {
  try {
    logger.debug('Fetching all published posts');

    // Check cache first
    const cached = await redis.get(ALL_POSTS_CACHE_KEY);
    if (cached) {
      logger.debug('All posts cache hit');
      res.status(200).json({ ...JSON.parse(cached), source: 'cache' });
      return;
    }

    logger.debug('All posts cache miss, querying database');

    const posts = await prisma.post.findMany({
      where: { published: true },
      orderBy: { createdAt: 'desc' },
    });

    const responseBody = { posts };

    // Store in cache with TTL
    await redis.set(ALL_POSTS_CACHE_KEY, JSON.stringify(responseBody), {
      EX: CACHE_TTL_SECONDS,
    });

    logger.debug(
      { count: posts.length },
      'Fetched posts from database and cached',
    );

    res.status(200).json({ ...responseBody, source: 'database' });
  } catch (error) {
    logger.error(error, 'Error fetching posts');
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
};

// GET /api/posts/:postId - Get a single post with author details (cached)
export const getPost = async (req: Request, res: Response) => {
  try {
    const postId = req.params.postId as string;
    const cacheKey = `posts:${postId}`;

    logger.debug({ postId }, 'Fetching post');

    // Check cache first
    const cached = await redis.get(cacheKey);
    if (cached) {
      logger.debug({ postId }, 'Post cache hit');
      res.status(200).json({ ...JSON.parse(cached), source: 'cache' });
      return;
    }

    logger.debug({ postId }, 'Post cache miss, querying database');

    const post = await prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      logger.debug({ postId }, 'Post not found');
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
      logger.debug(
        { authorId: post.authorId },
        'Fetched author from user-service',
      );
    } catch {
      logger.warn(
        { postId, authorId: post.authorId },
        'Could not fetch author from user-service',
      );
    }

    const responseBody = { post: { ...post, author } };

    // Store in cache with TTL
    await redis.set(cacheKey, JSON.stringify(responseBody), {
      EX: CACHE_TTL_SECONDS,
    });

    res.status(200).json({ ...responseBody, source: 'database' });
  } catch (error) {
    logger.error(error, 'Error fetching post');
    res.status(500).json({ error: 'Failed to fetch post' });
  }
};

// POST /api/posts - Create a new post (protected)
export const createPost = async (req: Request, res: Response) => {
  try {
    const { title, content, published } = req.body;
    const authorId = req.user!.id;

    logger.debug({ authorId }, 'Creating post');

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

    logger.info({ postId: post.id, authorId }, 'Post created');

    // Sync to Typesense
    try {
      let authorName: string | undefined;
      try {
        const userResponse = await axios.get(
          `${USER_SERVICE_URL}/api/users/${authorId}`,
        );
        authorName = userResponse.data.user.name;
      } catch {
        logger.warn(
          { authorId },
          'Could not fetch author name for Typesense sync',
        );
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
      logger.debug({ postId: post.id }, 'Post synced to Typesense');
    } catch (tsError) {
      logger.warn(tsError, 'Failed to sync post to Typesense');
    }

    await invalidatePostCaches();

    // Send postCreated event
    try {
      await axios.post(`${EVENT_SERVICE_URL}/api/events`, {
        type: 'postCreated',
        serviceName: 'postService',
        sourceId: post.id,
        data: {
          id: post.id,
          title: post.title,
          authorId: post.authorId,
          published: post.published,
        },
      });
      logger.debug({ postId: post.id }, 'postCreated event sent');
    } catch {
      logger.warn({ postId: post.id }, 'Failed to send postCreated event');
    }

    res.status(201).json({ post });
  } catch (error) {
    logger.error(error, 'Error creating post');
    res.status(500).json({ error: 'Failed to create post' });
  }
};

// PATCH /api/posts/:postId - Update a post (protected)
export const updatePost = async (req: Request, res: Response) => {
  try {
    const postId = req.params.postId as string;
    const userId = req.user!.id;

    logger.debug({ postId, userId }, 'Updating post');

    // Check if post exists and belongs to the user
    const existingPost = await prisma.post.findUnique({
      where: { id: postId },
    });

    if (!existingPost) {
      logger.debug({ postId }, 'Post not found');
      res.status(404).json({ error: 'Post not found' });
      return;
    }

    if (existingPost.authorId !== userId) {
      logger.warn(
        { postId, userId, authorId: existingPost.authorId },
        'Unauthorized update attempt',
      );
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

    logger.info({ postId }, 'Post updated');

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
      logger.debug({ postId }, 'Post update synced to Typesense');
    } catch (tsError) {
      logger.warn(tsError, 'Failed to sync post update to Typesense');
    }

    await invalidatePostCaches(postId);

    // Send postUpdated event
    try {
      await axios.post(`${EVENT_SERVICE_URL}/api/events`, {
        type: 'postUpdated',
        serviceName: 'postService',
        sourceId: post.id,
        data: {
          id: post.id,
          title: post.title,
          authorId: post.authorId,
          published: post.published,
        },
      });
      logger.debug({ postId }, 'postUpdated event sent');
    } catch {
      logger.warn({ postId }, 'Failed to send postUpdated event');
    }

    res.status(200).json({ post });
  } catch (error) {
    logger.error(error, 'Error updating post');
    res.status(500).json({ error: 'Failed to update post' });
  }
};

// DELETE /api/posts/:postId - Delete a post (protected)
export const deletePost = async (req: Request, res: Response) => {
  try {
    const postId = req.params.postId as string;
    const userId = req.user!.id;

    logger.debug({ postId, userId }, 'Deleting post');

    // Check if post exists and belongs to the user
    const existingPost = await prisma.post.findUnique({
      where: { id: postId },
    });

    if (!existingPost) {
      logger.debug({ postId }, 'Post not found');
      res.status(404).json({ error: 'Post not found' });
      return;
    }

    if (existingPost.authorId !== userId) {
      logger.warn(
        { postId, userId, authorId: existingPost.authorId },
        'Unauthorized delete attempt',
      );
      res.status(403).json({ error: 'You can only delete your own posts' });
      return;
    }

    await prisma.post.delete({
      where: { id: postId },
    });

    logger.info({ postId }, 'Post deleted');

    // Sync to Typesense
    try {
      await typesenseClient
        .collections(POSTS_COLLECTION)
        .documents(postId)
        .delete();
      logger.debug({ postId }, 'Post deletion synced to Typesense');
    } catch (tsError) {
      logger.warn(tsError, 'Failed to sync post deletion to Typesense');
    }

    await invalidatePostCaches(postId);

    // Send postDeleted event
    try {
      await axios.post(`${EVENT_SERVICE_URL}/api/events`, {
        type: 'postDeleted',
        serviceName: 'postService',
        sourceId: postId,
        data: { id: postId, authorId: existingPost.authorId },
      });
      logger.debug({ postId }, 'postDeleted event sent');
    } catch {
      logger.warn({ postId }, 'Failed to send postDeleted event');
    }

    res.status(204).send();
  } catch (error) {
    logger.error(error, 'Error deleting post');
    res.status(500).json({ error: 'Failed to delete post' });
  }
};

import { createClient } from 'redis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const redis = createClient({ url: REDIS_URL });

redis.on('connect', () => console.log('Redis connected...'));

redis.on('error', (err) => console.error('Redis client error:', err));

export { redis };

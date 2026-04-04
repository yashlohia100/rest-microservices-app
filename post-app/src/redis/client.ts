import { createClient } from 'redis';
import { logger } from '../logger.js';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const redis = createClient({ url: REDIS_URL });

redis.on('connect', () => logger.info('Redis connected'));

redis.on('error', (err) => logger.error(err, 'Redis client error'));

export { redis };

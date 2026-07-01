import { createClient, type RedisClientType } from 'redis';

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  throw new Error('REDIS_URL environment variable is missing.');
}

// 1. Create a global variable type so TypeScript doesn't complain
const globalForRedis = global as unknown as {
  redisClient: RedisClientType | undefined;
};

// 2. Use the existing global connection if it exists, otherwise create a new one.
// This completely eliminates connection leaks during Next.js development.
export const redis =
  globalForRedis.redisClient ??
  createClient({
    url: redisUrl,
  }) as RedisClientType;

// Attach error listener
redis.on('error', (err) => console.error('[Redis Client Error]', err));
redis.on('ready', () => console.log('[Redis] Connected successfully'));

// 3. Save the connection globally ONLY in development.
// In production, Next.js handles serverless pooling differently.
if (process.env.NODE_ENV !== 'production') {
  globalForRedis.redisClient = redis;
}

// 4. Safe self-executing connection
if (!redis.isOpen) {
  redis.connect().catch((err) => console.error('[Redis Connection Failed]', err));
}

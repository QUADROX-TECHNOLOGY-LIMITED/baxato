// src/lib/redis.ts
import { createClient } from 'redis';

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  throw new Error('REDIS_URL environment variable is missing.');
}

export const redis = createClient({
  url: redisUrl,
});

redis.on('error', (err) => console.error('Redis Client Error', err));

// Self-executing connection helper for Next.js serverless/edge contexts
if (!redis.isOpen) {
  redis.connect().catch(console.error);
}

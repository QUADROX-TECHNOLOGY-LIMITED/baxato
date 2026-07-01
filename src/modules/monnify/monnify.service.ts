import { redis } from '@/lib/redis';

const MONNIFY_BASE_URL = process.env.MONNIFY_BASE_URL;
const REDIS_TOKEN_KEY = 'monnify_bearer_token';

export async function getMonnifyToken(): Promise<string> {
  try {
    const cachedToken = await redis.get(REDIS_TOKEN_KEY);
    if (cachedToken) return cachedToken;

    const apiKey = process.env.MONNIFY_API_KEY;
    const secretKey = process.env.MONNIFY_SECRET_KEY;

    if (!apiKey || !secretKey || !MONNIFY_BASE_URL) {
      throw new Error('Monnify environment variables are missing.');
    }

    const base64Credentials = Buffer.from(`${apiKey}:${secretKey}`).toString('base64');

    const response = await fetch(`${MONNIFY_BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${base64Credentials}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Monnify Auth Failed: ${errorText}`);
    }

    const data = await response.json();

    if (data.requestSuccessful && data.responseBody?.accessToken) {
      const { accessToken, expiresIn = 3600 } = data.responseBody;
      const safeExpiry = Math.max(0, expiresIn - 60);
      
      await redis.set(REDIS_TOKEN_KEY, accessToken, 'EX', safeExpiry);
      return accessToken;
    }

    throw new Error('Invalid Monnify auth response structure');
  } catch (error) {
    console.error('[MONNIFY_AUTH_ERROR]', error);
    throw new Error('Failed to obtain Monnify access token');
  }
}

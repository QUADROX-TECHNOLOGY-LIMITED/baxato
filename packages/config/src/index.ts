import { config } from 'dotenv';
import { resolve } from 'path';
import { parseEnv, getSanitizedEnv, type Env } from './env.schema.js';

// Load .env from root workspace if present
config({ path: resolve(process.cwd(), '.env') });
config({ path: resolve(process.cwd(), '../../.env') });

export const env: Env = parseEnv(process.env);
export { parseEnv, getSanitizedEnv, type Env };

import { migrate } from 'drizzle-orm/postgres-js/migrator';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { db } from './client';

/**
 * Automatically applies pending Drizzle migrations to PostgreSQL on startup.
 * Ensures all tables, enums, indexes, and constraints exist before the API serves traffic.
 */
export async function runMigrations(): Promise<boolean> {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));

  const candidatePaths = [
    path.resolve(currentDir, '../drizzle'),
    path.resolve(currentDir, '../../drizzle'),
    path.resolve(process.cwd(), 'packages/database/drizzle'),
    path.resolve(process.cwd(), '../packages/database/drizzle'),
    path.resolve(process.cwd(), '../../packages/database/drizzle'),
    '/app/packages/database/drizzle',
  ];

  const migrationsFolder = candidatePaths.find(
    (p) => fs.existsSync(p) && fs.existsSync(path.join(p, 'meta/_journal.json')),
  );

  if (!migrationsFolder) {
    console.warn(
      `[Database Migration] Migration journal not found in checked locations: ${candidatePaths.join(', ')}`,
    );
    return false;
  }

  console.log(`[Database Migration] Applying PostgreSQL migrations from: ${migrationsFolder}`);
  await migrate(db, { migrationsFolder });
  console.log('[Database Migration] PostgreSQL schemas and tables verified & up to date.');
  return true;
}

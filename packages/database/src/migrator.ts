import { migrate } from 'drizzle-orm/postgres-js/migrator';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { db, getQueryClient } from './client.js';

/**
 * Automatically applies pending Drizzle migrations to PostgreSQL.
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
  try {
    await migrate(db, { migrationsFolder });
    
    // Idempotent schema guarantee for Two-Factor Authentication fields
    const sql = getQueryClient();
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT FALSE NOT NULL;`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_method TEXT;`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_secret TEXT;`;
    await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_backup_codes JSONB DEFAULT '[]'::jsonb NOT NULL;`;

    // Idempotent schema guarantee for Team & RBAC
    try {
      await sql`ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'FINANCE';`;
      await sql`ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'VIEWER';`;
    } catch {
      // Ignore if already added or not supported in transaction
    }

    await sql`
      DO $$ BEGIN
        CREATE TYPE invitation_status AS ENUM ('PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS team_invitations (
        id TEXT PRIMARY KEY,
        business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        invited_by_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        email TEXT NOT NULL,
        role user_role NOT NULL,
        token_hash TEXT NOT NULL UNIQUE,
        status invitation_status DEFAULT 'PENDING' NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      );
    `;

    await sql`CREATE INDEX IF NOT EXISTS team_inv_token_hash_idx ON team_invitations(token_hash);`;
    await sql`CREATE INDEX IF NOT EXISTS team_inv_business_id_idx ON team_invitations(business_id);`;
    await sql`CREATE INDEX IF NOT EXISTS team_inv_email_idx ON team_invitations(email);`;
    await sql`CREATE INDEX IF NOT EXISTS team_inv_status_idx ON team_invitations(status);`;

    // Idempotent schema guarantee for Sandbox Webhook fields
    await sql`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS webhook_test_url TEXT;`;
    await sql`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS webhook_test_secret TEXT;`;

    // Idempotent schema guarantee for Multi-business contact fields
    await sql`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS email TEXT;`;
    await sql`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS phone_number TEXT;`;

    console.log('[Database Migration] PostgreSQL schemas and tables verified & up to date.');
    return true;
  } catch (err: any) {
    console.error('[Database Migration] Migration execution failed:', {
      message: err?.message,
      code: err?.code,
      detail: err?.detail,
      hint: err?.hint,
      routine: err?.routine,
      file: err?.file,
      line: err?.line,
    });
    throw err;
  }
}

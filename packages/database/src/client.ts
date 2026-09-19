import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { env } from '@baxato/config';
import * as schema from './schema/index';

export type Database = PostgresJsDatabase<typeof schema>;

let client: postgres.Sql | null = null;
let dbInstance: Database | null = null;

/**
 * Returns a configured PostgreSQL query client with connection pooling.
 */
export function getQueryClient(connectionString: string = env.DATABASE_URL): postgres.Sql {
  if (!client) {
    client = postgres(connectionString, {
      max: env.DATABASE_POOL_MAX,
      idle_timeout: 20,
      connect_timeout: 10,
      prepare: true,
      onnotice: env.NODE_ENV === 'development' ? console.warn : undefined,
    });
  }
  return client;
}

/**
 * Returns the typed Drizzle ORM database instance with all schemas attached.
 */
export function getDb(connectionString: string = env.DATABASE_URL): Database {
  if (!dbInstance) {
    const queryClient = getQueryClient(connectionString);
    dbInstance = drizzle(queryClient, { schema });
  }
  return dbInstance;
}

export const db = getDb();

/**
 * Closes the active PostgreSQL connection pool gracefully during server shutdown.
 */
export async function closeDatabasePool(): Promise<void> {
  if (client) {
    await client.end({ timeout: 5 });
    client = null;
    dbInstance = null;
  }
}

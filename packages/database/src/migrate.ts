import { runMigrations } from './migrator';
import { closeDatabasePool } from './client';

async function main() {
  try {
    const success = await runMigrations();
    if (!success) {
      console.error('[Migration] Migration failed or migrations folder not found.');
      process.exit(1);
    }
    console.log('[Migration] Migration completed successfully.');
    process.exit(0);
  } catch (err) {
    console.error('[Migration] Fatal error during migration:', err);
    process.exit(1);
  } finally {
    await closeDatabasePool();
  }
}

main();

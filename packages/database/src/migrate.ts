import { runMigrations } from './migrator.js';
import { closeDatabasePool } from './client.js';

async function main() {
  try {
    const success = await runMigrations();
    if (!success) {
      console.error('[Migration] Migration failed or migrations folder not found.');
      process.exit(1);
    }
    console.log('[Migration] Migration completed successfully.');
    process.exit(0);
  } catch (err: any) {
    console.error('[Migration] Fatal error during migration:', {
      message: err?.message,
      code: err?.code,
      detail: err?.detail,
      hint: err?.hint,
    });
    process.exit(1);
  } finally {
    await closeDatabasePool();
  }
}

main();

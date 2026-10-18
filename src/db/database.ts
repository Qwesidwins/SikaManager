import { SikaDatabase } from './schema';

export const db = new SikaDatabase();

/**
 * Hard deletes all data from all tables (for "Delete all data" in Settings or testing).
 */
export async function clearAllDatabaseData(): Promise<void> {
  await db.transaction('rw', db.tables, async () => {
    for (const table of db.tables) {
      await table.clear();
    }
  });
}

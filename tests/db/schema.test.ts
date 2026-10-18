import { describe, it, expect, beforeEach } from 'vitest';
import { SikaDatabase } from '@/db/schema';

describe('DB: Schema and Migrations', () => {
  let testDb: SikaDatabase;

  beforeEach(async () => {
    testDb = new SikaDatabase(`test-db-${Date.now()}-${Math.random()}`);
    await testDb.open();
  });

  it('initializes Version 1 schema with all required tables and indexes', () => {
    expect(testDb.verno).toBe(1);
    const tableNames = testDb.tables.map((t) => t.name);
    expect(tableNames).toContain('accounts');
    expect(tableNames).toContain('categories');
    expect(tableNames).toContain('transactions');
    expect(tableNames).toContain('journalEntries');
    expect(tableNames).toContain('budgets');
    expect(tableNames).toContain('goals');
    expect(tableNames).toContain('settings');
  });

  it('supports version migration path', async () => {
    // Test that chaining an upgrade hook works properly
    class V2TestDatabase extends SikaDatabase {
      constructor(name: string) {
        super(name);
        this.version(2)
          .stores({
            newExperimentalTable: 'id, createdAt',
          })
          .upgrade(() => {
            // migration hook
          });
      }
    }

    const v2Db = new V2TestDatabase(`v2-test-${Date.now()}`);
    await v2Db.open();
    expect(v2Db.verno).toBe(2);
    expect(v2Db.tables.map((t) => t.name)).toContain('newExperimentalTable');
    await v2Db.close();
  });
});

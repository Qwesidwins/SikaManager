import Dexie, { type EntityTable } from 'dexie';
import type {
  Account,
  Category,
  Transaction,
  JournalEntry,
  Budget,
  Goal,
} from '@/domain/types';

export interface SettingRow {
  key: string;
  value: unknown;
}

export class SikaDatabase extends Dexie {
  accounts!: EntityTable<Account, 'id'>;
  categories!: EntityTable<Category, 'id'>;
  transactions!: EntityTable<Transaction, 'id'>;
  journalEntries!: EntityTable<JournalEntry, 'id'>;
  budgets!: EntityTable<Budget, 'id'>;
  goals!: EntityTable<Goal, 'id'>;
  settings!: EntityTable<SettingRow, 'key'>;

  constructor(dbName = 'SikaMangerDB') {
    super(dbName);

    // Version 1 Schema
    this.version(1).stores({
      accounts: 'id, type, archived, createdAt, updatedAt',
      categories: 'id, kind, sortOrder, archived, createdAt, updatedAt',
      transactions: 'id, accountId, categoryId, date, type, deletedAt, createdAt, updatedAt',
      journalEntries: 'id, transactionId, createdAt, rating, deletedAt, updatedAt',
      budgets: 'id, categoryId, period, startsOn, deletedAt, createdAt, updatedAt',
      goals: 'id, deletedAt, createdAt, updatedAt',
      settings: 'key',
    });

    // Future version migrations can be chained cleanly here:
    // this.version(2).stores({ ... }).upgrade(tx => { ... });
  }
}


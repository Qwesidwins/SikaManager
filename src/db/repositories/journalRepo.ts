import { db } from '../database';
import type { JournalEntry, JournalRating } from '@/domain/types';

export const journalRepo = {
  async getAll(ratingFilter?: JournalRating | 'all', includeDeleted = false): Promise<JournalEntry[]> {
    let items = await db.journalEntries.toArray();

    if (!includeDeleted) {
      items = items.filter((j) => !j.deletedAt);
    }

    if (ratingFilter && ratingFilter !== 'all') {
      items = items.filter((j) => j.rating === ratingFilter);
    }

    return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async getById(id: string): Promise<JournalEntry | undefined> {
    return db.journalEntries.get(id);
  },

  async getByTransactionId(transactionId: string): Promise<JournalEntry | undefined> {
    const entries = await db.journalEntries
      .where('transactionId')
      .equals(transactionId)
      .filter((j) => !j.deletedAt)
      .toArray();
    return entries[0];
  },

  async create(entry: JournalEntry): Promise<string> {
    const now = new Date().toISOString();
    const fullEntry: JournalEntry = {
      ...entry,
      createdAt: entry.createdAt || now,
      updatedAt: entry.updatedAt || now,
    };
    await db.journalEntries.put(fullEntry);
    return fullEntry.id;
  },

  async update(id: string, updates: Partial<Omit<JournalEntry, 'id' | 'createdAt'>>): Promise<void> {
    await db.journalEntries.update(id, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  },

  async softDelete(id: string): Promise<void> {
    const now = new Date().toISOString();
    await db.journalEntries.update(id, {
      deletedAt: now,
      updatedAt: now,
    });
  },

  async restore(id: string): Promise<void> {
    const now = new Date().toISOString();
    await db.journalEntries.update(id, {
      deletedAt: null,
      updatedAt: now,
    });
  },
};

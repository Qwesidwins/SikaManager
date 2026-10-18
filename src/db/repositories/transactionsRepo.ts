import { db } from '../database';
import type { Transaction, TransactionType } from '@/domain/types';

export interface TransactionFilter {
  accountId?: string;
  categoryId?: string;
  type?: TransactionType;
  fromDate?: string; // ISO string
  toDate?: string; // ISO string
  minAmountMinor?: number;
  maxAmountMinor?: number;
  search?: string;
  includeDeleted?: boolean;
}

export const transactionsRepo = {
  async getAll(filter?: TransactionFilter): Promise<Transaction[]> {
    let items = await db.transactions.toArray();

    // Exclude soft-deleted by default
    if (!filter?.includeDeleted) {
      items = items.filter((t) => !t.deletedAt);
    }

    if (filter?.accountId) {
      items = items.filter(
        (t) => t.accountId === filter.accountId || t.transferAccountId === filter.accountId
      );
    }

    if (filter?.categoryId) {
      items = items.filter((t) => t.categoryId === filter.categoryId);
    }

    if (filter?.type) {
      items = items.filter((t) => t.type === filter.type);
    }

    if (filter?.fromDate) {
      const from = new Date(filter.fromDate).getTime();
      items = items.filter((t) => new Date(t.date).getTime() >= from);
    }

    if (filter?.toDate) {
      const to = new Date(filter.toDate).getTime();
      items = items.filter((t) => new Date(t.date).getTime() <= to);
    }

    if (filter?.minAmountMinor !== undefined) {
      items = items.filter((t) => t.amountMinor >= filter.minAmountMinor!);
    }

    if (filter?.maxAmountMinor !== undefined) {
      items = items.filter((t) => t.amountMinor <= filter.maxAmountMinor!);
    }

    if (filter?.search) {
      const q = filter.search.toLowerCase().trim();
      items = items.filter((t) => t.note?.toLowerCase().includes(q));
    }

    // Sort newest first by transaction date
    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },

  async getById(id: string): Promise<Transaction | undefined> {
    return db.transactions.get(id);
  },

  async create(
    transaction: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'> & {
      id?: string;
      createdAt?: string;
      updatedAt?: string;
    }
  ): Promise<string> {
    const now = new Date().toISOString();
    const id = transaction.id || crypto.randomUUID();
    const fullTransaction: Transaction = {
      ...transaction,
      id,
      createdAt: transaction.createdAt || now,
      updatedAt: transaction.updatedAt || now,
    };
    await db.transactions.put(fullTransaction);
    return fullTransaction.id;
  },

  async update(id: string, updates: Partial<Omit<Transaction, 'id' | 'createdAt'>>): Promise<void> {
    await db.transactions.update(id, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  },

  async softDelete(id: string): Promise<void> {
    const now = new Date().toISOString();
    await db.transactions.update(id, {
      deletedAt: now,
      updatedAt: now,
    });
  },

  async restore(id: string): Promise<void> {
    const now = new Date().toISOString();
    await db.transactions.update(id, {
      deletedAt: null,
      updatedAt: now,
    });
  },

  /**
   * Retrieves the top most recently used category IDs for quick-add chips
   */
  async getRecentCategoryIds(limit = 6): Promise<string[]> {
    const recent = await db.transactions
      .filter((t) => !t.deletedAt && !!t.categoryId)
      .reverse()
      .sortBy('date');

    const seen = new Set<string>();
    const result: string[] = [];

    for (const t of recent) {
      if (t.categoryId && !seen.has(t.categoryId)) {
        seen.add(t.categoryId);
        result.push(t.categoryId);
        if (result.length >= limit) break;
      }
    }

    return result;
  },
};

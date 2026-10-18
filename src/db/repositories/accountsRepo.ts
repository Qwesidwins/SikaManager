import { db } from '../database';
import type { Account } from '@/domain/types';

export const accountsRepo = {
  async getAll(includeArchived = false): Promise<Account[]> {
    if (includeArchived) {
      return db.accounts.toArray();
    }
    return db.accounts.filter((a) => !a.archived).toArray();
  },

  async getById(id: string): Promise<Account | undefined> {
    return db.accounts.get(id);
  },

  async create(account: Account): Promise<string> {
    const now = new Date().toISOString();
    const fullAccount: Account = {
      ...account,
      createdAt: account.createdAt || now,
      updatedAt: account.updatedAt || now,
    };
    await db.accounts.put(fullAccount);
    return fullAccount.id;
  },

  async update(id: string, updates: Partial<Omit<Account, 'id' | 'createdAt'>>): Promise<void> {
    await db.accounts.update(id, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  },

  async archive(id: string): Promise<void> {
    await db.accounts.update(id, {
      archived: true,
      updatedAt: new Date().toISOString(),
    });
  },

  async unarchive(id: string): Promise<void> {
    await db.accounts.update(id, {
      archived: false,
      updatedAt: new Date().toISOString(),
    });
  },
};

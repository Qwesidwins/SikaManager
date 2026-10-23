import { db } from '../database';
import type { Budget } from '@/domain/types';

export const budgetsRepo = {
  async getAll(includeDeleted = false): Promise<Budget[]> {
    let items = await db.budgets.toArray();
    if (!includeDeleted) {
      items = items.filter((b) => !b.deletedAt);
    }
    return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async getById(id: string): Promise<Budget | undefined> {
    return db.budgets.get(id);
  },

  async getByCategoryId(categoryId: string): Promise<Budget | undefined> {
    const items = await db.budgets
      .where('categoryId')
      .equals(categoryId)
      .filter((b) => !b.deletedAt)
      .toArray();
    return items[0];
  },

  async create(budget: Budget): Promise<string> {
    const now = new Date().toISOString();
    const fullBudget: Budget = {
      ...budget,
      createdAt: budget.createdAt || now,
      updatedAt: budget.updatedAt || now,
    };
    await db.budgets.put(fullBudget);
    return fullBudget.id;
  },

  async update(id: string, updates: Partial<Omit<Budget, 'id' | 'createdAt'>>): Promise<void> {
    await db.budgets.update(id, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  },

  async softDelete(id: string): Promise<void> {
    const now = new Date().toISOString();
    await db.budgets.update(id, {
      deletedAt: now,
      updatedAt: now,
    });
  },

  async restore(id: string): Promise<void> {
    const now = new Date().toISOString();
    await db.budgets.update(id, {
      deletedAt: null,
      updatedAt: now,
    });
  },
};


import { db } from '../database';
import type { Goal } from '@/domain/types';

export const goalsRepo = {
  async getAll(includeDeleted = false): Promise<Goal[]> {
    let items = await db.goals.toArray();
    if (!includeDeleted) {
      items = items.filter((g) => !g.deletedAt);
    }
    return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async getById(id: string): Promise<Goal | undefined> {
    return db.goals.get(id);
  },

  async create(goal: Goal): Promise<string> {
    const now = new Date().toISOString();
    const fullGoal: Goal = {
      ...goal,
      createdAt: goal.createdAt || now,
      updatedAt: goal.updatedAt || now,
    };
    await db.goals.put(fullGoal);
    return fullGoal.id;
  },

  async update(id: string, updates: Partial<Omit<Goal, 'id' | 'createdAt'>>): Promise<void> {
    await db.goals.update(id, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  },

  async softDelete(id: string): Promise<void> {
    const now = new Date().toISOString();
    await db.goals.update(id, {
      deletedAt: now,
      updatedAt: now,
    });
  },
};

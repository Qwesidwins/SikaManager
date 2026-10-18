import { db } from '../database';
import type { Category, CategoryKind } from '@/domain/types';

export const categoriesRepo = {
  async getAll(kind?: CategoryKind, includeArchived = false): Promise<Category[]> {
    let collection = db.categories.toCollection();

    let items = await collection.toArray();
    if (!includeArchived) {
      items = items.filter((c) => !c.archived);
    }
    if (kind) {
      items = items.filter((c) => c.kind === kind);
    }

    return items.sort((a, b) => a.sortOrder - b.sortOrder);
  },

  async getById(id: string): Promise<Category | undefined> {
    return db.categories.get(id);
  },

  async create(category: Category): Promise<string> {
    const now = new Date().toISOString();
    const fullCategory: Category = {
      ...category,
      createdAt: category.createdAt || now,
      updatedAt: category.updatedAt || now,
    };
    await db.categories.put(fullCategory);
    return fullCategory.id;
  },

  async update(id: string, updates: Partial<Omit<Category, 'id' | 'createdAt'>>): Promise<void> {
    await db.categories.update(id, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  },

  async archive(id: string): Promise<void> {
    await db.categories.update(id, {
      archived: true,
      updatedAt: new Date().toISOString(),
    });
  },
};

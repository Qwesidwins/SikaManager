import { db } from '../database';
import { DEFAULT_SETTINGS } from '../seed';
import type { Settings } from '@/domain/types';

export const settingsRepo = {
  async getAll(): Promise<Settings> {
    const rows = await db.settings.toArray();
    const map: Record<string, unknown> = {};
    for (const r of rows) {
      map[r.key] = r.value;
    }

    return {
      ...DEFAULT_SETTINGS,
      ...map,
    } as Settings;
  },

  async get<K extends keyof Settings>(key: K): Promise<Settings[K]> {
    const row = await db.settings.get(key);
    if (!row) {
      return DEFAULT_SETTINGS[key];
    }
    return row.value as Settings[K];
  },

  async set<K extends keyof Settings>(key: K, value: Settings[K]): Promise<void> {
    await db.settings.put({ key, value });
  },

  async update(partial: Partial<Settings>): Promise<void> {
    await db.transaction('rw', db.settings, async () => {
      for (const [key, value] of Object.entries(partial)) {
        await db.settings.put({ key, value });
      }
    });
  },
};

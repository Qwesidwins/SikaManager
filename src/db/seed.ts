import type { Category, Account, Settings } from '@/domain/types';
import { db } from './database';

export const DEFAULT_SETTINGS: Settings = {
  currency: 'GHS',
  locale: 'en-GH',
  incomeMode: 'variable',
  weekStart: 1, // Monday
  essentialMonthlyMinor: 100000, // GH₵ 1,000.00
  savingsTargetMinor: 300000, // GH₵ 3,000.00 (3-month buffer)
  lockEnabled: false,
  biometricEnabled: false,
  passcodeHash: null,
  lastBackupAt: null,
  onboardingDone: false,
};

export const DEFAULT_CATEGORIES: Omit<Category, 'createdAt' | 'updatedAt'>[] = [
  // Expense Categories
  {
    id: 'cat-food',
    name: 'Food & Groceries',
    icon: 'restaurant',
    color: '#2E7D5B',
    kind: 'expense',
    sortOrder: 1,
    archived: false,
  },
  {
    id: 'cat-transport',
    name: 'Trotro & Taxi',
    icon: 'directions_bus',
    color: '#C9962B',
    kind: 'expense',
    sortOrder: 2,
    archived: false,
  },
  {
    id: 'cat-airtime',
    name: 'Airtime & Data',
    icon: 'wifi_tethering',
    color: '#14213D',
    kind: 'expense',
    sortOrder: 3,
    archived: false,
  },
  {
    id: 'cat-susu',
    name: 'Susu Contribution',
    icon: 'verified',
    color: '#2E7D5B',
    kind: 'expense',
    sortOrder: 4,
    archived: false,
  },
  {
    id: 'cat-utilities',
    name: 'Utilities & Power',
    icon: 'bolt',
    color: '#7C5800',
    kind: 'expense',
    sortOrder: 5,
    archived: false,
  },
  {
    id: 'cat-health',
    name: 'Health & Pharmacy',
    icon: 'medical_services',
    color: '#B23A3A',
    kind: 'expense',
    sortOrder: 6,
    archived: false,
  },
  {
    id: 'cat-family',
    name: 'Family Support',
    icon: 'family_restroom',
    color: '#7C5800',
    kind: 'expense',
    sortOrder: 7,
    archived: false,
  },
  {
    id: 'cat-shopping',
    name: 'Shopping & Gear',
    icon: 'shopping_bag',
    color: '#14213D',
    kind: 'expense',
    sortOrder: 8,
    archived: false,
  },
  // Income Categories
  {
    id: 'cat-income-freelance',
    name: 'Freelance & Gigs',
    icon: 'work',
    color: '#2E7D5B',
    kind: 'income',
    sortOrder: 9,
    archived: false,
  },
  {
    id: 'cat-income-trade',
    name: 'Trade & Sales',
    icon: 'storefront',
    color: '#2E7D5B',
    kind: 'income',
    sortOrder: 10,
    archived: false,
  },
  {
    id: 'cat-income-remittance',
    name: 'Gifts & Remittances',
    icon: 'volunteer_activism',
    color: '#2E7D5B',
    kind: 'income',
    sortOrder: 11,
    archived: false,
  },
  {
    id: 'cat-income-other',
    name: 'Other Earnings',
    icon: 'payments',
    color: '#2E7D5B',
    kind: 'income',
    sortOrder: 12,
    archived: false,
  },
];

export const DEFAULT_ACCOUNTS: Omit<Account, 'createdAt' | 'updatedAt'>[] = [
  {
    id: 'acc-momo',
    name: 'MTN MoMo',
    type: 'mobile_money',
    currency: 'GHS',
    openingBalanceMinor: 0,
    archived: false,
  },
  {
    id: 'acc-cash',
    name: 'Cash in Hand',
    type: 'cash',
    currency: 'GHS',
    openingBalanceMinor: 0,
    archived: false,
  },
  {
    id: 'acc-bank',
    name: 'Bank Account',
    type: 'bank',
    currency: 'GHS',
    openingBalanceMinor: 0,
    archived: false,
  },
  {
    id: 'acc-savings',
    name: 'Emergency Savings',
    type: 'savings',
    currency: 'GHS',
    openingBalanceMinor: 0,
    archived: false,
  },
];

/**
 * Initializes database with default seed categories, accounts, and settings if empty.
 */
export async function seedInitialDataIfNeeded(): Promise<void> {
  const categoryCount = await db.categories.count();
  const now = new Date().toISOString();

  if (categoryCount === 0) {
    const fullCategories: Category[] = DEFAULT_CATEGORIES.map((c) => ({
      ...c,
      createdAt: now,
      updatedAt: now,
    }));
    await db.categories.bulkAdd(fullCategories);
  }

  const accountCount = await db.accounts.count();
  if (accountCount === 0) {
    const fullAccounts: Account[] = DEFAULT_ACCOUNTS.map((a) => ({
      ...a,
      createdAt: now,
      updatedAt: now,
    }));
    await db.accounts.bulkAdd(fullAccounts);
  }

  // Ensure default settings exist
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    const existing = await db.settings.get(key);
    if (!existing) {
      await db.settings.put({ key, value });
    }
  }
}

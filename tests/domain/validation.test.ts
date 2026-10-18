import { describe, it, expect } from 'vitest';
import {
  AccountSchema,
  TransactionSchema,
  CategorySchema,
  BudgetSchema,
  GoalSchema,
  SettingsSchema,
  BackupPayloadSchema,
} from '@/domain/validation';

describe('Domain: Validation Schemas', () => {
  it('validates a valid Account', () => {
    const validAcc = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'MTN Mobile Money',
      type: 'mobile_money' as const,
      currency: 'GHS',
      openingBalanceMinor: 250000,
      archived: false,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };

    const res = AccountSchema.safeParse(validAcc);
    expect(res.success).toBe(true);
  });

  it('rejects invalid account data', () => {
    const invalidAcc = {
      id: 'not-a-uuid',
      name: '',
      type: 'crypto', // Invalid type
      currency: 'G',
      openingBalanceMinor: 12.5, // Not integer
      archived: false,
    };

    const res = AccountSchema.safeParse(invalidAcc);
    expect(res.success).toBe(false);
  });

  it('validates CategorySchema, BudgetSchema, GoalSchema, and SettingsSchema directly', () => {
    const cat = {
      id: 'cat-test',
      name: 'Groceries',
      icon: 'restaurant',
      color: '#2E7D5B',
      kind: 'expense' as const,
      sortOrder: 1,
      archived: false,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    expect(CategorySchema.safeParse(cat).success).toBe(true);

    const budget = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      categoryId: 'cat-test',
      period: 'month' as const,
      limitMinor: 10000,
      startsOn: '2026-03-01',
      createdAt: '2026-03-01T00:00:00.000Z',
      updatedAt: '2026-03-01T00:00:00.000Z',
    };
    expect(BudgetSchema.safeParse(budget).success).toBe(true);

    const goal = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'MacBook Fund',
      targetMinor: 1500000,
      currentMinor: 500000,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };
    expect(GoalSchema.safeParse(goal).success).toBe(true);

    const settings = {
      currency: 'GHS',
      locale: 'en-GH',
      incomeMode: 'fixed' as const,
      weekStart: 0 as const,
      essentialMonthlyMinor: 50000,
      savingsTargetMinor: 10000,
      lockEnabled: true,
      biometricEnabled: false,
      onboardingDone: true,
    };
    expect(SettingsSchema.safeParse(settings).success).toBe(true);
  });

  it('rejects negative or zero transaction amounts', () => {
    const negTxn = {
      id: '123e4567-e89b-12d3-a456-426614174000',
      type: 'expense' as const,
      amountMinor: -500, // Invalid
      currency: 'GHS',
      accountId: 'acc-1',
      date: '2026-03-15T12:00:00.000Z',
      createdAt: '2026-03-15T12:00:00.000Z',
      updatedAt: '2026-03-15T12:00:00.000Z',
    };

    expect(TransactionSchema.safeParse(negTxn).success).toBe(false);
  });

  it('validates a complete BackupPayload', () => {
    const payload = {
      version: 1,
      exportedAt: '2026-03-15T12:00:00.000Z',
      accounts: [],
      categories: [
        {
          id: 'cat-food',
          name: 'Food',
          icon: 'restaurant',
          color: '#2E7D5B',
          kind: 'expense' as const,
          sortOrder: 1,
          archived: false,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      transactions: [],
      journalEntries: [],
      budgets: [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          categoryId: 'cat-food',
          period: 'month' as const,
          limitMinor: 50000,
          startsOn: '2026-03-01',
          createdAt: '2026-03-01T00:00:00.000Z',
          updatedAt: '2026-03-01T00:00:00.000Z',
        },
      ],
      goals: [
        {
          id: '123e4567-e89b-12d3-a456-426614174000',
          name: 'Emergency Fund',
          targetMinor: 300000,
          currentMinor: 150000,
          targetDate: null,
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      settings: {
        currency: 'GHS',
        locale: 'en-GH',
        incomeMode: 'variable',
        weekStart: 1,
        essentialMonthlyMinor: 100000,
        savingsTargetMinor: 20000,
        lockEnabled: false,
        biometricEnabled: false,
        onboardingDone: true,
      },
    };

    const res = BackupPayloadSchema.safeParse(payload);
    expect(res.success).toBe(true);
  });
});

import { z } from 'zod';

export const AccountTypeSchema = z.enum(['cash', 'bank', 'mobile_money', 'savings']);
export const TransactionTypeSchema = z.enum(['income', 'expense', 'transfer']);
export const CategoryKindSchema = z.enum(['expense', 'income']);
export const JournalRatingSchema = z.enum(['worth_it', 'neutral', 'regret']).nullable();
export const BudgetPeriodSchema = z.enum(['week', 'month']);
export const IncomeModeSchema = z.enum(['fixed', 'variable']);
export const WeekStartSchema = z.union([z.literal(0), z.literal(1)]);

export const AccountSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, 'Account name is required'),
  type: AccountTypeSchema,
  currency: z.string().min(3).max(4),
  openingBalanceMinor: z.number().int(),
  archived: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const CategorySchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Category name is required'),
  icon: z.string(),
  color: z.string(),
  kind: CategoryKindSchema,
  sortOrder: z.number().int(),
  archived: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const TransactionSchema = z.object({
  id: z.string().uuid(),
  type: TransactionTypeSchema,
  amountMinor: z.number().int().positive('Amount must be positive'),
  currency: z.string().min(3).max(4),
  accountId: z.string(),
  transferAccountId: z.string().nullable().optional(),
  categoryId: z.string().nullable().optional(),
  date: z.string().datetime(),
  note: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  deletedAt: z.string().datetime().nullable().optional(),
});

export const JournalEntrySchema = z.object({
  id: z.string().uuid(),
  transactionId: z.string().nullable().optional(),
  body: z.string().min(1, 'Journal reflection cannot be empty'),
  rating: JournalRatingSchema.optional(),
  prompt: z.string().nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  deletedAt: z.string().datetime().nullable().optional(),
});

export const BudgetSchema = z.object({
  id: z.string().uuid(),
  categoryId: z.string(),
  period: BudgetPeriodSchema,
  limitMinor: z.number().int().nonnegative('Budget limit cannot be negative'),
  startsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'startsOn must be YYYY-MM-DD'),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  deletedAt: z.string().datetime().nullable().optional(),
});

export const GoalSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1, 'Goal name is required'),
  targetMinor: z.number().int().positive('Goal target must be positive'),
  currentMinor: z.number().int().nonnegative(),
  targetDate: z.string().nullable().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  deletedAt: z.string().datetime().nullable().optional(),
});

export const SettingsSchema = z.object({
  currency: z.string().min(3),
  locale: z.string(),
  incomeMode: IncomeModeSchema,
  weekStart: WeekStartSchema,
  essentialMonthlyMinor: z.number().int().nonnegative(),
  savingsTargetMinor: z.number().int().nonnegative(),
  passcodeHash: z.string().nullable().optional(),
  lockEnabled: z.boolean(),
  biometricEnabled: z.boolean(),
  lastBackupAt: z.string().nullable().optional(),
  onboardingDone: z.boolean(),
});

export const BackupPayloadSchema = z.object({
  version: z.number().int(),
  exportedAt: z.string().datetime(),
  accounts: z.array(AccountSchema),
  categories: z.array(CategorySchema),
  transactions: z.array(TransactionSchema),
  journalEntries: z.array(JournalEntrySchema),
  budgets: z.array(BudgetSchema),
  goals: z.array(GoalSchema),
  settings: z.record(z.any()),
});

export type BackupPayload = z.infer<typeof BackupPayloadSchema>;


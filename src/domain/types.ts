export type AccountType = 'cash' | 'bank' | 'mobile_money' | 'savings' | 'investment' | 'other';
export type TransactionType = 'income' | 'expense' | 'transfer';
export type CategoryKind = 'expense' | 'income';
export type JournalRating = 'worth_it' | 'neutral' | 'regret' | null;
export type BudgetPeriod = 'week' | 'month';
export type IncomeMode = 'fixed' | 'variable';
export type WeekStart = 0 | 1; // 0 = Sunday, 1 = Monday

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  currency: string;
  openingBalanceMinor: number;
  archived: boolean;
  createdAt: string; // ISO UTC
  updatedAt: string; // ISO UTC
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  kind: CategoryKind;
  sortOrder: number;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amountMinor: number; // Always positive integer
  currency: string;
  accountId: string;
  transferAccountId?: string | null | undefined;
  categoryId?: string | null | undefined;
  date: string; // ISO UTC
  note?: string | undefined;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null | undefined; // Soft delete
}

export interface JournalEntry {
  id: string;
  transactionId?: string | null | undefined;
  body: string;
  rating?: JournalRating | undefined;
  prompt?: string | null | undefined;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null | undefined;
}

export interface Budget {
  id: string;
  categoryId: string;
  period: BudgetPeriod;
  limitMinor: number;
  startsOn: string; // ISO date YYYY-MM-DD
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null | undefined;
}

export interface Goal {
  id: string;
  name: string;
  targetMinor: number;
  currentMinor: number;
  targetDate?: string | null | undefined;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null | undefined;
}

export interface Settings {
  currency: string;
  locale: string;
  incomeMode: IncomeMode;
  weekStart: WeekStart;
  essentialMonthlyMinor: number;
  savingsTargetMinor: number;
  passcodeHash?: string | null | undefined;
  lockEnabled: boolean;
  biometricEnabled: boolean;
  lastBackupAt?: string | null | undefined;
  onboardingDone: boolean;
}


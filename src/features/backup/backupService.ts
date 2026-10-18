import { db } from '@/db/database';
import { BackupPayloadSchema, type BackupPayload } from '@/domain/validation';
import { settingsRepo } from '@/db/repositories/settingsRepo';
import { accountsRepo } from '@/db/repositories/accountsRepo';
import { categoriesRepo } from '@/db/repositories/categoriesRepo';
import { transactionsRepo } from '@/db/repositories/transactionsRepo';
import { minorToDecimal } from '@/domain/money';

export interface RestoreSummary {
  accounts: number;
  categories: number;
  transactions: number;
  journalEntries: number;
  budgets: number;
  goals: number;
}

/**
 * Creates a complete, lossless BackupPayload from the local database.
 */
export async function createBackupPayload(): Promise<BackupPayload> {
  const [
    accounts,
    categories,
    transactions,
    journalEntries,
    budgets,
    goals,
    allSettings,
  ] = await Promise.all([
    db.accounts.toArray(),
    db.categories.toArray(),
    db.transactions.toArray(),
    db.journalEntries.toArray(),
    db.budgets.toArray(),
    db.goals.toArray(),
    db.settings.toArray(),
  ]);

  const settingsMap: Record<string, unknown> = {};
  for (const s of allSettings) {
    settingsMap[s.key] = s.value;
  }

  const rawPayload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    accounts,
    categories,
    transactions,
    journalEntries,
    budgets,
    goals,
    settings: settingsMap,
  };

  return BackupPayloadSchema.parse(rawPayload);
}

/**
 * Restores a validated BackupPayload into the local IndexedDB database.
 * Supports 'replace' (clears all local tables) and 'merge' (bulkPut by id).
 */
export async function restoreBackup(
  payload: BackupPayload,
  mode: 'replace' | 'merge'
): Promise<RestoreSummary> {
  const validated = BackupPayloadSchema.parse(payload);

  if (mode === 'replace') {
    await db.transaction(
      'rw',
      [
        db.accounts,
        db.categories,
        db.transactions,
        db.journalEntries,
        db.budgets,
        db.goals,
        db.settings,
      ],
      async () => {
        await Promise.all([
          db.accounts.clear(),
          db.categories.clear(),
          db.transactions.clear(),
          db.journalEntries.clear(),
          db.budgets.clear(),
          db.goals.clear(),
          db.settings.clear(),
        ]);

        await Promise.all([
          db.accounts.bulkAdd(validated.accounts),
          db.categories.bulkAdd(validated.categories),
          db.transactions.bulkAdd(validated.transactions),
          db.journalEntries.bulkAdd(validated.journalEntries),
          db.budgets.bulkAdd(validated.budgets),
          db.goals.bulkAdd(validated.goals),
        ]);

        for (const [key, value] of Object.entries(validated.settings)) {
          await db.settings.put({ key, value });
        }
      }
    );
  } else {
    // Merge mode: bulkPut merges by primary key
    await db.transaction(
      'rw',
      [
        db.accounts,
        db.categories,
        db.transactions,
        db.journalEntries,
        db.budgets,
        db.goals,
        db.settings,
      ],
      async () => {
        await Promise.all([
          db.accounts.bulkPut(validated.accounts),
          db.categories.bulkPut(validated.categories),
          db.transactions.bulkPut(validated.transactions),
          db.journalEntries.bulkPut(validated.journalEntries),
          db.budgets.bulkPut(validated.budgets),
          db.goals.bulkPut(validated.goals),
        ]);

        for (const [key, value] of Object.entries(validated.settings)) {
          await db.settings.put({ key, value });
        }
      }
    );
  }

  // Update lastBackupAt timestamp
  await settingsRepo.set('lastBackupAt', new Date().toISOString());

  return {
    accounts: validated.accounts.length,
    categories: validated.categories.length,
    transactions: validated.transactions.length,
    journalEntries: validated.journalEntries.length,
    budgets: validated.budgets.length,
    goals: validated.goals.length,
  };
}

/**
 * Escapes a cell value for standard CSV compatibility (Excel & Google Sheets).
 */
function escapeCsv(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '""';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

/**
 * Generates an RFC 4180 compliant CSV export for transactions with sign and major units.
 */
export async function exportTransactionsCsv(): Promise<string> {
  const [transactions, accounts, categories] = await Promise.all([
    transactionsRepo.getAll(),
    accountsRepo.getAll(),
    categoriesRepo.getAll(),
  ]);

  const accountMap = new Map(accounts.map((a) => [a.id, a.name]));
  const categoryMap = new Map(categories.map((c) => [c.id, c.name]));

  // Sort newest first
  const sorted = [...transactions].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const headers = ['Date', 'Type', 'Account', 'Category', 'Amount', 'Currency', 'Note'];
  const rows: string[] = [headers.join(',')];

  for (const t of sorted) {
    const accountName = accountMap.get(t.accountId) ?? 'Unknown Account';
    const categoryName = t.categoryId ? categoryMap.get(t.categoryId) ?? 'Uncategorized' : '';
    const decimalAmount = minorToDecimal(t.amountMinor).toFixed(2);

    let signedAmount: string;
    if (t.type === 'expense') {
      signedAmount = `-${decimalAmount}`;
    } else if (t.type === 'income') {
      signedAmount = `+${decimalAmount}`;
    } else {
      // transfer
      const transferAccountName = t.transferAccountId
        ? accountMap.get(t.transferAccountId) ?? 'Unknown Account'
        : 'Unknown Account';
      signedAmount = `${decimalAmount} (to ${transferAccountName})`;
    }

    const row = [
      escapeCsv(t.date),
      escapeCsv(t.type),
      escapeCsv(accountName),
      escapeCsv(categoryName),
      escapeCsv(signedAmount),
      escapeCsv(t.currency),
      escapeCsv(t.note ?? ''),
    ];

    rows.push(row.join(','));
  }

  return rows.join('\r\n');
}

/**
 * Helper to trigger a browser file download for text/json/csv content.
 */
export function triggerFileDownload(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

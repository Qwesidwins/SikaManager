import { describe, it, expect, beforeEach } from 'vitest';
import { encryptBackup, decryptBackup } from '@/crypto/encryption';
import { hashPasscode, verifyPasscode } from '@/crypto/passcode';
import {
  createBackupPayload,
  restoreBackup,
  exportTransactionsCsv,
} from '@/features/backup/backupService';
import { clearAllDatabaseData } from '@/db/database';
import { seedInitialDataIfNeeded } from '@/db/seed';
import { accountsRepo, transactionsRepo } from '@/db';
import type { BackupPayload } from '@/domain/validation';

describe('Crypto & Backup Layer', () => {
  beforeEach(async () => {
    await clearAllDatabaseData();
    await seedInitialDataIfNeeded();
  });

  describe('Passcode Hashing & Verification', () => {
    it('hashes a passcode with PBKDF2 and verifies valid passcode', async () => {
      const passcode = '1234';
      const hash = await hashPasscode(passcode);

      expect(hash).toMatch(/^pbkdf2:sha256:100000:[A-Za-z0-9+/=]+:[A-Za-z0-9+/=]+$/);

      const isValid = await verifyPasscode('1234', hash);
      expect(isValid).toBe(true);

      const isInvalid = await verifyPasscode('9999', hash);
      expect(isInvalid).toBe(false);
    });

    it('rejects malformed hashes gracefully without throwing', async () => {
      expect(await verifyPasscode('1234', 'malformed_hash')).toBe(false);
      expect(await verifyPasscode('1234', 'pbkdf2:invalid')).toBe(false);
      expect(await verifyPasscode('', 'valid_looking:hash')).toBe(false);
    });
  });

  describe('Web Crypto Backup Encryption & Decryption', () => {
    const mockPayload: BackupPayload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      accounts: [
        {
          id: '11111111-1111-4111-8111-111111111111',
          name: 'MTN Mobile Money',
          type: 'mobile_money',
          currency: 'GHS',
          openingBalanceMinor: 25000,
          archived: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      categories: [
        {
          id: 'cat-food',
          name: 'Food & Groceries',
          icon: 'utensils',
          color: '#e76f51',
          kind: 'expense',
          sortOrder: 1,
          archived: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      transactions: [
        {
          id: '22222222-2222-4222-8222-222222222222',
          type: 'expense',
          amountMinor: 4500,
          currency: 'GHS',
          accountId: '11111111-1111-4111-8111-111111111111',
          categoryId: 'cat-food',
          date: new Date().toISOString(),
          note: 'Waakye and eggs, lunch',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      journalEntries: [
        {
          id: '33333333-3333-4333-8333-333333333333',
          body: 'Mindful decision to get lunch instead of skipping',
          rating: 'worth_it',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      budgets: [],
      goals: [],
      settings: {
        currency: 'GHS',
        incomeMode: 'variable',
      },
    };

    it('performs lossless encryption and decryption round-trip with correct passphrase', async () => {
      const passphrase = 'SuperSecretPassphrase#2026';
      const encryptedJson = await encryptBackup(mockPayload, passphrase);

      expect(typeof encryptedJson).toBe('string');
      const parsedEnvelope = JSON.parse(encryptedJson);
      expect(parsedEnvelope.format).toBe('sikamanger-backup');
      expect(parsedEnvelope.version).toBe(1);
      expect(parsedEnvelope.kdf.iterations).toBe(600_000);
      expect(parsedEnvelope.cipher.data).toBeDefined();

      const decrypted = (await decryptBackup(encryptedJson, passphrase)) as BackupPayload;
      expect(decrypted.version).toBe(mockPayload.version);
      expect(decrypted.accounts.length).toBe(1);
      expect(decrypted.accounts[0]?.name).toBe('MTN Mobile Money');
      expect(decrypted.transactions[0]?.amountMinor).toBe(4500);
      expect(decrypted.transactions[0]?.note).toBe('Waakye and eggs, lunch');
      expect(decrypted.journalEntries[0]?.rating).toBe('worth_it');
    });

    it('fails decryption with wrong passphrase and returns descriptive error', async () => {
      const encrypted = await encryptBackup(mockPayload, 'CorrectPassword123');
      await expect(decryptBackup(encrypted, 'WrongPassword456')).rejects.toThrow(
        /Decryption failed/i
      );
    });

    it('rejects tampered or corrupt files', async () => {
      await expect(decryptBackup('not-a-json', 'pass')).rejects.toThrow(/not valid JSON/i);

      const invalidFormatEnvelope = JSON.stringify({ format: 'other-app', version: 1 });
      await expect(decryptBackup(invalidFormatEnvelope, 'pass')).rejects.toThrow(
        /Unsupported file/i
      );
    });
  });

  describe('Database Backup & Restore Service', () => {
    it('creates a complete, schema-valid BackupPayload from database', async () => {
      const payload = await createBackupPayload();

      expect(payload.version).toBe(1);
      expect(payload.accounts.length).toBeGreaterThan(0);
      expect(payload.categories.length).toBeGreaterThan(0);
      expect(payload.settings).toBeDefined();
    });

    it('restores backup with "replace" mode', async () => {
      // Add a test transaction
      const accounts = await accountsRepo.getAll();
      const accountId = accounts[0]?.id ?? 'test-acc';
      await transactionsRepo.create({
        type: 'expense',
        amountMinor: 3000,
        currency: 'GHS',
        accountId,
        date: new Date().toISOString(),
        note: 'Before backup',
      });

      const backup = await createBackupPayload();
      expect(backup.transactions.length).toBe(1);

      // Now add a second transaction
      await transactionsRepo.create({
        type: 'expense',
        amountMinor: 7000,
        currency: 'GHS',
        accountId,
        date: new Date().toISOString(),
        note: 'After backup',
      });

      const currentTxs = await transactionsRepo.getAll();
      expect(currentTxs.length).toBe(2);

      // Replace with original backup
      const summary = await restoreBackup(backup, 'replace');
      expect(summary.transactions).toBe(1);

      const restoredTxs = await transactionsRepo.getAll();
      expect(restoredTxs.length).toBe(1);
      expect(restoredTxs[0]?.note).toBe('Before backup');
    });

    it('restores backup with "merge" mode', async () => {
      const backup = await createBackupPayload();

      const summary = await restoreBackup(backup, 'merge');
      expect(summary.accounts).toBe(backup.accounts.length);
    });

    it('exports RFC 4180 compliant CSV formatted for Excel and Google Sheets', async () => {
      const accounts = await accountsRepo.getAll();
      const accountId = accounts[0]?.id ?? 'test-acc';

      await transactionsRepo.create({
        type: 'expense',
        amountMinor: 1550, // 15.50
        currency: 'GHS',
        accountId,
        date: '2026-10-18T14:30:00.000Z',
        note: 'Banku, grilled tilapia and shito',
      });

      await transactionsRepo.create({
        type: 'income',
        amountMinor: 350000, // 3500.00
        currency: 'GHS',
        accountId,
        date: '2026-10-18T10:00:00.000Z',
        note: 'Freelance web development payment',
      });

      const csv = await exportTransactionsCsv();
      const lines = csv.split('\r\n');

      expect(lines[0]).toBe('Date,Type,Account,Category,Amount,Currency,Note');
      expect(csv).toContain('"-15.50"');
      expect(csv).toContain('"+3500.00"');
      expect(csv).toContain('"Banku, grilled tilapia and shito"');
    });
  });
});

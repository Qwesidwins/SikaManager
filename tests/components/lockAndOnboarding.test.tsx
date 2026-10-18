import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LockScreen } from '@/features/lock/LockScreen';
import { OnboardingFlow } from '@/features/onboarding/OnboardingFlow';
import { hashPasscode } from '@/crypto/passcode';
import { clearAllDatabaseData } from '@/db/database';
import { seedInitialDataIfNeeded } from '@/db/seed';
import { settingsRepo } from '@/db';

describe('Component: LockScreen & OnboardingFlow', () => {
  beforeEach(async () => {
    await clearAllDatabaseData();
    await seedInitialDataIfNeeded();
  });

  describe('LockScreen', () => {
    it('unlocks when correct passcode is keyed in', async () => {
      const handleUnlock = vi.fn();
      const hash = await hashPasscode('1234');

      render(<LockScreen onUnlock={handleUnlock} passcodeHash={hash} />);

      expect(screen.getByText('SikaManger')).toBeInTheDocument();
      expect(screen.getByText('Enter your passcode to unlock your finances')).toBeInTheDocument();

      // Click 1, 2, 3, 4
      fireEvent.click(screen.getByRole('button', { name: '1' }));
      fireEvent.click(screen.getByRole('button', { name: '2' }));
      fireEvent.click(screen.getByRole('button', { name: '3' }));
      fireEvent.click(screen.getByRole('button', { name: '4' }));

      await waitFor(() => {
        expect(handleUnlock).toHaveBeenCalled();
      });
    });

    it('displays error and remaining attempts on incorrect code', async () => {
      const handleUnlock = vi.fn();
      const hash = await hashPasscode('1234');

      render(<LockScreen onUnlock={handleUnlock} passcodeHash={hash} />);

      // Click 9, 9, 9, 9
      fireEvent.click(screen.getByRole('button', { name: '9' }));
      fireEvent.click(screen.getByRole('button', { name: '9' }));
      fireEvent.click(screen.getByRole('button', { name: '9' }));
      fireEvent.click(screen.getByRole('button', { name: '9' }));

      await waitFor(() => {
        expect(screen.getByText(/Incorrect passcode/i)).toBeInTheDocument();
        expect(handleUnlock).not.toHaveBeenCalled();
      });
    });
  });

  describe('OnboardingFlow', () => {
    it('allows stepping through and completes onboarding', async () => {
      const handleComplete = vi.fn();

      render(<OnboardingFlow onComplete={handleComplete} />);

      expect(screen.getByText('Welcome to SikaManger')).toBeInTheDocument();

      // Step 1 -> Next
      const nextBtn = screen.getByRole('button', { name: /Next/i });
      fireEvent.click(nextBtn);

      // Step 2: Starting Balances
      await waitFor(() => {
        expect(screen.getByText('Starting Balances')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByRole('button', { name: /Next/i }));

      // Step 3: How Do You Earn?
      await waitFor(() => {
        expect(screen.getByText('How Do You Earn?')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByRole('button', { name: /Next/i }));

      // Step 4: Safety & Essentials
      await waitFor(() => {
        expect(screen.getByText('Safety & Essentials')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByRole('button', { name: /Next/i }));

      // Step 5: Complete Setup
      await waitFor(() => {
        expect(screen.getByText('App Security & Storage')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByRole('button', { name: /Complete Setup/i }));

      await waitFor(async () => {
        expect(handleComplete).toHaveBeenCalled();
        const settings = await settingsRepo.getAll();
        expect(settings.onboardingDone).toBe(true);
      });
    });

    it('allows skipping setup immediately', async () => {
      const handleComplete = vi.fn();

      render(<OnboardingFlow onComplete={handleComplete} />);

      const skipBtn = screen.getByRole('button', { name: /Skip Setup/i });
      fireEvent.click(skipBtn);

      await waitFor(async () => {
        expect(handleComplete).toHaveBeenCalled();
        const settings = await settingsRepo.getAll();
        expect(settings.onboardingDone).toBe(true);
      });
    });
  });
});

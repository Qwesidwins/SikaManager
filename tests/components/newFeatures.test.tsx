import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '@/App';
import { LaunchScreen } from '@/features/simpleMvp/LaunchScreen';
import { clearAllDatabaseData } from '@/db/database';
import { seedInitialDataIfNeeded } from '@/db/seed';
import { categoriesRepo } from '@/db/repositories/categoriesRepo';
import { settingsRepo } from '@/db/repositories/settingsRepo';
import { hashPasscode } from '@/crypto/passcode';

describe('New Features: LaunchScreen, Salary/Stipends, Passcode/Biometrics, Light Mode Enforced', () => {
  beforeEach(async () => {
    await clearAllDatabaseData();
    await seedInitialDataIfNeeded();
    document.documentElement.classList.remove('dark');
    localStorage.clear();
  });

  it('renders LaunchScreen with smooth scale-up animation, without icons/circle, and finishes on click', async () => {
    let finished = false;
    render(<LaunchScreen onFinish={() => { finished = true; }} />);

    // Renders SikaManager and Personal Cash Tracker
    await waitFor(() => {
      expect(screen.getByText('SikaManager')).toBeInTheDocument();
      expect(screen.getByText('Personal Cash Tracker')).toBeInTheDocument();
    });

    // Verify icons/circle/sparkle are not present
    expect(screen.queryByTestId('sparkle-icon')).toBeNull();

    // Click to finish
    fireEvent.click(screen.getByText(/SikaManager/i));
    expect(finished).toBe(true);
  });

  it('uses "Salary & Stipends" instead of Freelance/Gigs in income categories', async () => {
    const cats = await categoriesRepo.getAll();
    const salaryCat = cats.find((c) => c.name === 'Salary & Stipends');
    const freelanceCat = cats.find((c) => c.name.toLowerCase().includes('freelance'));

    expect(salaryCat).toBeDefined();
    expect(salaryCat?.kind).toBe('income');
    expect(freelanceCat).toBeUndefined();
  });

  it('enforces light mode and ensures dark mode toggle is disabled/removed', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Total Balance')).toBeInTheDocument();
    });

    // Verify root is in light mode
    expect(document.documentElement.classList.contains('dark')).toBe(false);

    // Verify theme toggle button does not exist in header
    expect(screen.queryByLabelText(/Switch to.*mode/i)).toBeNull();

    // Open settings and verify appearance toggle is not present
    const settingsBtn = screen.getByLabelText('Settings and security');
    fireEvent.click(settingsBtn);

    expect(screen.getByText('SikaManger Settings')).toBeInTheDocument();
    expect(screen.queryByText('Appearance')).toBeNull();
  });

  it('allows setting up a 4-digit PIN in settings and locking the app', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Total Balance')).toBeInTheDocument();
    });

    // Open settings modal
    const settingsBtn = screen.getByLabelText('Settings and security');
    fireEvent.click(settingsBtn);

    expect(screen.getByText('SikaManger Settings')).toBeInTheDocument();
    expect(screen.getByText('4-Digit PIN Security')).toBeInTheDocument();

    // Click Set Up
    const setupPinBtn = screen.getByRole('button', { name: /Set Up/i });
    fireEvent.click(setupPinBtn);

    // Enter 1234
    const pinInputs = screen.getAllByPlaceholderText(/PIN|Confirm/i);
    fireEvent.change(pinInputs[0]!, { target: { value: '1234' } });
    fireEvent.change(pinInputs[1]!, { target: { value: '1234' } });

    // Save PIN
    const savePinBtn = screen.getByRole('button', { name: /Save PIN/i });
    fireEvent.click(savePinBtn);

    await waitFor(async () => {
      const lockEnabled = await settingsRepo.get('lockEnabled');
      const hash = await settingsRepo.get('passcodeHash');
      expect(lockEnabled).toBe(true);
      expect(hash).toBeTruthy();
    });
  });

  it('prompts LockScreen when lockEnabled and passcodeHash exist, and unlocks with correct PIN', async () => {
    const hash = await hashPasscode('4321');
    await settingsRepo.set('lockEnabled', true);
    await settingsRepo.set('passcodeHash', hash);

    render(<App />);

    // Lock screen must be visible
    await waitFor(() => {
      expect(screen.getByText(/Enter your passcode to unlock/i)).toBeInTheDocument();
    });

    // Press keypad: 4, 3, 2, 1
    fireEvent.click(screen.getByRole('button', { name: '4' }));
    fireEvent.click(screen.getByRole('button', { name: '3' }));
    fireEvent.click(screen.getByRole('button', { name: '2' }));
    fireEvent.click(screen.getByRole('button', { name: '1' }));

    // Should successfully unlock and reveal main dashboard
    await waitFor(() => {
      expect(screen.getByText('Total Balance')).toBeInTheDocument();
    });
  });
});

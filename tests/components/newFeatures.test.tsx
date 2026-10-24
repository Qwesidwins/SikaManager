import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import App from '@/App';
import { LaunchScreen } from '@/features/simpleMvp/LaunchScreen';
import { clearAllDatabaseData } from '@/db/database';
import { seedInitialDataIfNeeded } from '@/db/seed';
import { categoriesRepo } from '@/db/repositories/categoriesRepo';
import { settingsRepo } from '@/db/repositories/settingsRepo';
import { hashPasscode } from '@/crypto/passcode';

describe('New Features: LaunchScreen, Salary/Stipends, Passcode/Biometrics, Dark/Light Mode', () => {
  beforeEach(async () => {
    await clearAllDatabaseData();
    await seedInitialDataIfNeeded();
    document.documentElement.classList.remove('dark');
    localStorage.clear();
  });

  it('renders LaunchScreen with morphing emblem and brand text, and finishes on click', () => {
    let finished = false;
    render(<LaunchScreen onFinish={() => { finished = true; }} />);

    expect(screen.getByText('SikaManger')).toBeInTheDocument();
    expect(screen.getByText('Personal Cash Tracker')).toBeInTheDocument();

    // Click to finish
    fireEvent.click(screen.getByText('SikaManger'));
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

  it('toggles Dark and Light mode from header button and updates html root class', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Total Balance')).toBeInTheDocument();
    });

    const themeBtn = screen.getByLabelText(/Switch to/i);
    expect(document.documentElement.classList.contains('dark')).toBe(false);

    // Toggle to dark mode
    fireEvent.click(themeBtn);
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem('sikamanger-theme')).toBe('dark');

    // Toggle back to light mode
    fireEvent.click(themeBtn);
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(localStorage.getItem('sikamanger-theme')).toBe('light');
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

import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '@/App';
import { clearAllDatabaseData } from '@/db/database';
import { seedInitialDataIfNeeded } from '@/db/seed';
import { settingsRepo } from '@/db';

describe('Component: App Root & Navigation Shell', () => {
  beforeEach(async () => {
    await clearAllDatabaseData();
    await seedInitialDataIfNeeded();
  });

  it('renders onboarding on fresh install and proceeds to home when skipped', async () => {
    render(<App />);

    // Should detect onboarding not completed and show OnboardingFlow
    await waitFor(() => {
      expect(screen.getByText('Welcome to SikaManger')).toBeInTheDocument();
    });

    // Skip onboarding
    const skipBtn = screen.getByRole('button', { name: /Skip Setup/i });
    fireEvent.click(skipBtn);

    // Should land on Home dashboard
    await waitFor(() => {
      expect(screen.getByText(/Safe to spend today/i)).toBeInTheDocument();
      expect(screen.getByText(/Runway/i)).toBeInTheDocument();
    });
  });

  it('navigates across bottom tabs and opens quick-add sheet', async () => {
    // Mark onboarding done
    await settingsRepo.set('onboardingDone', true);

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Safe to spend today/i)).toBeInTheDocument();
    });

    // Tap Activity tab
    const activityTab = screen.getByRole('button', { name: /Activity/i });
    fireEvent.click(activityTab);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Toggle running balance/i })).toBeInTheDocument();
    });

    // Tap Journal tab
    const journalTab = screen.getByRole('button', { name: /Journal/i });
    fireEvent.click(journalTab);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Write/i })).toBeInTheDocument();
    });

    // Tap center Add button
    const addBtn = screen.getByLabelText(/Add Transaction/i);
    fireEvent.click(addBtn);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Save GH₵/i })).toBeInTheDocument();
    });
  });
});

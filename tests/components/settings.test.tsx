import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SettingsView } from '@/features/settings/SettingsView';
import { clearAllDatabaseData } from '@/db/database';
import { seedInitialDataIfNeeded } from '@/db/seed';
import { settingsRepo } from '@/db';

describe('Component: SettingsView', () => {
  beforeEach(async () => {
    await clearAllDatabaseData();
    await seedInitialDataIfNeeded();
  });

  it('renders settings options, updates income mode, and triggers toast', async () => {
    const handleShowToast = vi.fn();
    const handleBack = vi.fn();

    render(<SettingsView onBack={handleBack} onShowToast={handleShowToast} />);

    // Wait for settings to load
    await waitFor(() => {
      expect(screen.getByText('Currency & Region')).toBeInTheDocument();
    });

    expect(screen.getByText('Income & Budget Calibration')).toBeInTheDocument();
    expect(screen.getByText('App Lock & Security')).toBeInTheDocument();
    expect(screen.getByText('Encrypted Backup & Data')).toBeInTheDocument();

    // Click "Fixed (Salary)" button
    const fixedButton = screen.getByRole('button', { name: /Fixed \(Salary\)/i });
    fireEvent.click(fixedButton);

    // Save calibration preferences
    const saveButton = screen.getByRole('button', { name: /Save Calibration Preferences/i });
    fireEvent.click(saveButton);

    await waitFor(async () => {
      expect(handleShowToast).toHaveBeenCalledWith('Settings saved successfully');
      const updated = await settingsRepo.getAll();
      expect(updated.incomeMode).toBe('fixed');
    });
  });

  it('validates delete all data dialog requiring typing "DELETE"', async () => {
    const handleShowToast = vi.fn();
    const handleBack = vi.fn();

    render(<SettingsView onBack={handleBack} onShowToast={handleShowToast} />);

    await waitFor(() => {
      expect(screen.getByText('Danger Zone')).toBeInTheDocument();
    });

    const deleteButton = screen.getByRole('button', { name: /Delete All Data/i });
    fireEvent.click(deleteButton);

    expect(screen.getByText('Delete All Data?')).toBeInTheDocument();
    const confirmButton = screen.getByRole('button', { name: /Confirm Wipe/i });
    expect(confirmButton).toBeDisabled();

    // Type something other than DELETE
    const input = screen.getByPlaceholderText('Type DELETE');
    fireEvent.change(input, { target: { value: 'del' } });
    expect(confirmButton).toBeDisabled();

    // Type DELETE
    fireEvent.change(input, { target: { value: 'DELETE' } });
    expect(confirmButton).not.toBeDisabled();
  });
});

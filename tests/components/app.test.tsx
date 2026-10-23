import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '@/App';
import { clearAllDatabaseData } from '@/db/database';
import { seedInitialDataIfNeeded } from '@/db/seed';

describe('Component: App Root & Navigation Shell', () => {
  beforeEach(async () => {
    await clearAllDatabaseData();
    await seedInitialDataIfNeeded();
  });

  it('renders simple MVP dashboard on launch', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('SikaManger')).toBeInTheDocument();
      expect(screen.getByText('Total Balance')).toBeInTheDocument();
    });
  });

  it('navigates across simple MVP tabs', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Total Balance')).toBeInTheDocument();
    });

    // Tap Insights tab
    const insightsTab = screen.getByRole('button', { name: /Insights/i });
    fireEvent.click(insightsTab);

    await waitFor(() => {
      expect(screen.getByText('Net Savings')).toBeInTheDocument();
      expect(screen.getByText('No chart data yet')).toBeInTheDocument();
    });
  });
});

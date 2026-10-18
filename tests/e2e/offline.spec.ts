import { test, expect } from '@playwright/test';

test.describe('Offline-First Persistence E2E', () => {
  test('logs an expense, goes offline, reloads, and verifies offline persistence', async ({
    page,
    context,
  }) => {
    // 1. Open app
    await page.goto('/');

    // 2. Skip onboarding if on first run
    const skipButton = page.getByRole('button', { name: /Skip Setup/i });
    if (await skipButton.isVisible({ timeout: 4000 }).catch(() => false)) {
      await skipButton.click();
    }

    // 3. Verify Home loaded
    await expect(page.getByText(/Safe to spend today/i)).toBeVisible({ timeout: 5000 });

    // 4. Open Quick-Add Sheet via center button
    const addButton = page.getByLabel('Add Transaction');
    await addButton.click();

    // 5. Enter 50 using custom tactile keypad
    await page.getByRole('button', { name: '5', exact: true }).click();
    await page.getByRole('button', { name: '0', exact: true }).click();

    // 6. Select category chip (Food & Groceries)
    const foodChip = page.getByRole('button', { name: /Food & Groceries/i }).first();
    if (await foodChip.isVisible().catch(() => false)) {
      await foodChip.click();
    }

    // 7. Save transaction
    const saveButton = page.getByRole('button', { name: /Save GH₵/i });
    await expect(saveButton).toBeEnabled();
    await saveButton.click();

    // 8. Verify success toast appears
    await expect(page.getByText(/Transaction recorded/i)).toBeVisible();

    // 9. Go to Activity view to see the entry
    const activityTab = page.getByRole('button', { name: /Activity/i });
    await activityTab.click();
    await expect(page.getByText(/50\.00/i)).toBeVisible();

    // 10. Simulate Offline network condition
    await context.setOffline(true);

    // 11. Reload page while offline
    await page.reload();

    // 12. Verify offline persistence in Activity view
    await expect(page.getByText(/Activity/i).first()).toBeVisible();
    await expect(page.getByText(/50\.00/i)).toBeVisible();

    // Restore online state
    await context.setOffline(false);
  });
});

import { test, expect } from '@playwright/test';

test.describe('Offline-First Persistence E2E', () => {
  test('logs an expense, goes offline, logs another expense offline, and verifies full offline operation', async ({
    page,
    context,
  }) => {
    // 1. Open app
    await page.goto('/');

    // 2. Wait for onboarding or home
    const skipButton = page.getByRole('button', { name: /Skip Setup/i });
    const heroCard = page.getByText(/Safe to spend today/i);

    try {
      await skipButton.waitFor({ timeout: 6000 });
      await skipButton.click();
    } catch {
      // Already past onboarding
    }

    // 3. Verify Home loaded
    await expect(heroCard).toBeVisible({ timeout: 10000 });

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
    const activityTab = page.locator('nav').getByRole('button', { name: /Activity/i });
    await activityTab.click();
    await expect(page.getByText(/50\.00/i).first()).toBeVisible();

    // 10. Cut off all network (Simulate 100% Offline mode)
    await context.setOffline(true);

    // 11. While fully offline, log a second transaction
    await addButton.click();
    await page.getByRole('button', { name: '2', exact: true }).click();
    await page.getByRole('button', { name: '5', exact: true }).click();
    await saveButton.click();
    await expect(page.getByText(/Transaction recorded/i)).toBeVisible();

    // 12. Verify both 50.00 and 25.00 are persisted and visible in Activity while completely offline
    await activityTab.click();
    await expect(page.getByText(/50\.00/i).first()).toBeVisible();
    await expect(page.getByText(/25\.00/i).first()).toBeVisible();

    // Restore online state
    await context.setOffline(false);
  });
});

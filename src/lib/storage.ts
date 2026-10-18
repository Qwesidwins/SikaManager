/**
 * Helper to request and inspect persistent storage in Progressive Web Apps.
 * Ensures mobile browsers (Safari, Chrome, Firefox) don't evict local IndexedDB data
 * during device storage pressure.
 */
export async function checkAndPersistStorage(): Promise<{
  persisted: boolean;
  usageBytes?: number | undefined;
  quotaBytes?: number | undefined;
}> {
  if (typeof navigator === 'undefined' || !navigator.storage) {
    return { persisted: false };
  }

  let persisted = false;
  try {
    if (navigator.storage.persisted) {
      persisted = await navigator.storage.persisted();
    }
    if (!persisted && navigator.storage.persist) {
      persisted = await navigator.storage.persist();
    }
  } catch {
    persisted = false;
  }

  let usageBytes: number | undefined;
  let quotaBytes: number | undefined;

  try {
    if (navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      usageBytes = estimate.usage;
      quotaBytes = estimate.quota;
    }
  } catch {
    // Continue without estimate
  }

  return { persisted, usageBytes, quotaBytes };
}

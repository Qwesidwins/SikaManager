/**
 * Trigger short tactile haptic feedback on supported mobile devices
 */
export function triggerHaptic(duration = 15): void {
  try {
    if (typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in navigator) {
      navigator.vibrate(duration);
    }
  } catch {
    // Graceful fallback when permissions or platform block vibration
  }
}

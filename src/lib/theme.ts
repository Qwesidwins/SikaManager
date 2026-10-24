export type Theme = 'light';

export function applyLightMode(): void {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.remove('dark');
  try {
    localStorage.removeItem('sikamanger-theme');
  } catch {
    // Ignore storage errors
  }
}

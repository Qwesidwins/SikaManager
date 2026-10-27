import { describe, it, expect, beforeEach } from 'vitest';
import { getInitialTheme, applyTheme } from '@/lib/theme';

describe('Theme management (Dark & Light mode)', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  it('defaults to light when nothing is stored', () => {
    expect(getInitialTheme()).toBe('light');
  });

  it('loads dark mode when stored in localStorage', () => {
    localStorage.setItem('sikamanger-theme', 'dark');
    expect(getInitialTheme()).toBe('dark');
  });

  it('applies dark class to document.documentElement and persists to storage', () => {
    applyTheme('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem('sikamanger-theme')).toBe('dark');
  });

  it('removes dark class from document.documentElement when switching to light', () => {
    applyTheme('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    applyTheme('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(localStorage.getItem('sikamanger-theme')).toBe('light');
  });
});

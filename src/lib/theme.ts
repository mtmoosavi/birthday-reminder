export type ThemeMode = 'light' | 'dark';

const KEY = 'birthday-reminder-theme';

/** Preferred theme, falling back to the OS setting on first launch. */
export function loadTheme(): ThemeMode {
  try {
    const stored = localStorage.getItem(KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    /* storage unavailable — fall through to system preference */
  }
  if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

export function saveTheme(mode: ThemeMode) {
  try {
    localStorage.setItem(KEY, mode);
  } catch {
    /* storage full / private mode — non-fatal */
  }
}

/** Toggle the `dark` class on <html> so Tailwind's class strategy kicks in. */
export function applyTheme(mode: ThemeMode) {
  const root = document.documentElement;
  root.classList.toggle('dark', mode === 'dark');
  root.style.colorScheme = mode;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute('content', mode === 'dark' ? '#0f172a' : '#F43F5E');
  }
}

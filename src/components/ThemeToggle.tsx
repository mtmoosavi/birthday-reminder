import { Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ThemeMode } from '@/lib/theme';

interface ThemeToggleProps {
  mode: ThemeMode;
  onToggle: () => void;
  className?: string;
}

/** Minimal icon-only night-mode toggle: a moon in light mode, a sun in dark mode. */
export function ThemeToggle({ mode, onToggle, className }: ThemeToggleProps) {
  const isDark = mode === 'dark';
  return (
    <button
      type="button"
      onClick={onToggle}
      role="switch"
      aria-checked={isDark}
      aria-label={isDark ? 'حالت روز' : 'حالت شب'}
      title={isDark ? 'حالت روز' : 'حالت شب'}
      className={cn(
        'inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-white/70 dark:bg-slate-900/70 backdrop-blur shadow-sm transition-colors active:scale-95',
        className
      )}
    >
      {isDark ? (
        <Sun className="w-5 h-5 text-amber-400 transition-transform duration-300" />
      ) : (
        <Moon className="w-5 h-5 text-slate-500 transition-transform duration-300" />
      )}
    </button>
  );
}

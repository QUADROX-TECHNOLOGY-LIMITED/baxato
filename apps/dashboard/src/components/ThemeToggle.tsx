'use client';

import { useEffect, useState } from 'react';
import { Sun, Moon, Laptop } from 'lucide-react';

type ThemeMode = 'light' | 'dark' | 'system';

export default function ThemeToggle() {
  const [themeMode, setThemeMode] = useState<ThemeMode>('system');

  useEffect(() => {
    const stored = (localStorage.getItem('baxato_theme') as ThemeMode) || 'system';
    setThemeMode(stored);
  }, []);

  const setTheme = (mode: ThemeMode) => {
    setThemeMode(mode);
    localStorage.setItem('baxato_theme', mode);

    const root = document.documentElement;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = mode === 'dark' || (mode === 'system' && prefersDark);

    if (isDark) {
      root.classList.add('dark');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }

    const meta =
      (document.getElementById('meta-theme-color') as HTMLMetaElement | null) ||
      document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute('content', isDark ? '#070D18' : '#ffffff');
    }
  };

  return (
    <div className="flex items-center p-0.5 rounded-xl bg-slate-100 dark:bg-[#0E1B2E] border border-slate-200 dark:border-slate-800">
      <button
        type="button"
        onClick={() => setTheme('light')}
        title="Light theme"
        aria-label="Light theme"
        className={`p-1.5 rounded-lg transition-all ${
          themeMode === 'light'
            ? 'bg-white dark:bg-[#1A2E4C] text-amber-500 shadow-sm'
            : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
        }`}
      >
        <Sun className="w-3.5 h-3.5" />
      </button>

      <button
        type="button"
        onClick={() => setTheme('system')}
        title="System (follows phone/device OS)"
        aria-label="System theme"
        className={`p-1.5 rounded-lg transition-all ${
          themeMode === 'system'
            ? 'bg-white dark:bg-[#1A2E4C] text-[#126BEB] dark:text-[#38BDF8] shadow-sm'
            : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
        }`}
      >
        <Laptop className="w-3.5 h-3.5" />
      </button>

      <button
        type="button"
        onClick={() => setTheme('dark')}
        title="Dark theme"
        aria-label="Dark theme"
        className={`p-1.5 rounded-lg transition-all ${
          themeMode === 'dark'
            ? 'bg-white dark:bg-[#1A2E4C] text-blue-400 shadow-sm'
            : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
        }`}
      >
        <Moon className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

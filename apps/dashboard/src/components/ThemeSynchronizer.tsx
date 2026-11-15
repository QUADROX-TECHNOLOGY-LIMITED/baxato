'use client';

import { useEffect } from 'react';
import { applyThemeChrome, resolveIsDark } from '@/lib/theme-sync';

export default function ThemeSynchronizer() {
  useEffect(() => {
    const syncFromPreference = () => {
      applyThemeChrome(resolveIsDark());
    };

    syncFromPreference();

    const observer = new MutationObserver(() => {
      const isDark = document.documentElement.classList.contains('dark');
      applyThemeChrome(isDark);
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleMediaChange = () => {
      const stored = localStorage.getItem('baxato_theme');
      if (!stored || stored === 'system') {
        syncFromPreference();
      }
    };
    mediaQuery.addEventListener('change', handleMediaChange);

    // Mobile OS theme flips via notification shade often settle on focus/visibility return
    const handleResumeSync = () => {
      if (document.visibilityState === 'visible') {
        syncFromPreference();
      }
    };
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'baxato_theme') {
        syncFromPreference();
      }
    };

    window.addEventListener('focus', syncFromPreference);
    document.addEventListener('visibilitychange', handleResumeSync);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener('change', handleMediaChange);
      window.removeEventListener('focus', syncFromPreference);
      document.removeEventListener('visibilitychange', handleResumeSync);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  return null;
}

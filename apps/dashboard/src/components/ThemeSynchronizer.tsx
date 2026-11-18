'use client';

import { useEffect } from 'react';
import { applyThemeChrome, resolveIsDark } from '@/lib/theme-sync';

export default function ThemeSynchronizer() {
  useEffect(() => {
    const settleTimers: Array<ReturnType<typeof setTimeout>> = [];
    const clearSettleTimers = () => {
      while (settleTimers.length > 0) {
        const t = settleTimers.pop();
        if (t !== undefined) clearTimeout(t);
      }
    };

    const syncFromPreference = (withSettlePass = false) => {
      applyThemeChrome(resolveIsDark(), undefined, { forceMetaRefresh: withSettlePass });
      if (withSettlePass) {
        clearSettleTimers();
        // Mobile Control Center / Notification Shade transitions finish ~120-320ms after matchMedia fires
        settleTimers.push(
          setTimeout(() => applyThemeChrome(resolveIsDark(), undefined, { forceMetaRefresh: true }), 120),
          setTimeout(() => applyThemeChrome(resolveIsDark(), undefined, { forceMetaRefresh: true }), 320),
        );
      }
    };

    syncFromPreference(true);

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
        syncFromPreference(true);
      }
    };
    mediaQuery.addEventListener('change', handleMediaChange);

    // Mobile OS theme flips via notification shade often settle on focus/visibility return
    const handleResumeSync = () => {
      if (document.visibilityState === 'visible') {
        syncFromPreference(true);
      }
    };
    const handleFocusSync = () => {
      syncFromPreference(true);
    };
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'baxato_theme') {
        syncFromPreference(true);
      }
    };

    window.addEventListener('focus', handleFocusSync);
    window.addEventListener('pageshow', handleFocusSync);
    document.addEventListener('visibilitychange', handleResumeSync);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      clearSettleTimers();
      observer.disconnect();
      mediaQuery.removeEventListener('change', handleMediaChange);
      window.removeEventListener('focus', handleFocusSync);
      window.removeEventListener('pageshow', handleFocusSync);
      document.removeEventListener('visibilitychange', handleResumeSync);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  return null;
}

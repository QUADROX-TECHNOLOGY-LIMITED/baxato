'use client';

import { useEffect } from 'react';

const DARK_COLOR = '#070D18';
const LIGHT_COLOR = '#ffffff';

export default function ThemeSynchronizer() {
  useEffect(() => {
    const updateThemeMeta = (isDark: boolean) => {
      // 1. Update <meta name="theme-color">
      let meta = document.getElementById('meta-theme-color') as HTMLMetaElement | null;
      if (!meta) {
        meta = document.querySelector('meta[name="theme-color"]');
      }
      if (!meta) {
        meta = document.createElement('meta');
        meta.name = 'theme-color';
        meta.id = 'meta-theme-color';
        document.head.appendChild(meta);
      }
      meta.setAttribute('content', isDark ? DARK_COLOR : LIGHT_COLOR);

      // 2. Set CSS color-scheme so mobile OS status bar icons (clock, battery, wifi) switch appropriately
      document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
    };

    // Initial sync
    const initialIsDark = document.documentElement.classList.contains('dark');
    updateThemeMeta(initialIsDark);

    // Watch for class changes on <html> (e.g. when toggled anywhere in the app)
    const observer = new MutationObserver(() => {
      const isDark = document.documentElement.classList.contains('dark');
      updateThemeMeta(isDark);
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    // Listen for OS system theme changes if no explicit user override exists
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleMediaChange = (e: MediaQueryListEvent) => {
      const stored = localStorage.getItem('baxato_theme');
      if (!stored) {
        if (e.matches) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
    };
    mediaQuery.addEventListener('change', handleMediaChange);

    // Listen for storage events across browser tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'baxato_theme') {
        if (e.newValue === 'dark') {
          document.documentElement.classList.add('dark');
        } else if (e.newValue === 'light') {
          document.documentElement.classList.remove('dark');
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      observer.disconnect();
      mediaQuery.removeEventListener('change', handleMediaChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  return null;
}

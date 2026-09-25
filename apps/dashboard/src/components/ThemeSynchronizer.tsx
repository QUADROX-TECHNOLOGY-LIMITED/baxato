'use client';

import { useEffect } from 'react';

const DARK_COLOR = '#070D18';
const LIGHT_COLOR = '#ffffff';

export default function ThemeSynchronizer() {
  useEffect(() => {
    const updateThemeMeta = (isDark: boolean) => {
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
      document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
    };

    const applyTheme = () => {
      const stored = localStorage.getItem('baxato_theme');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const isDark = stored === 'dark' || ((!stored || stored === 'system') && prefersDark);

      if (isDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      updateThemeMeta(isDark);
    };

    // Initial sync
    applyTheme();

    // Watch for class changes on <html>
    const observer = new MutationObserver(() => {
      const isDark = document.documentElement.classList.contains('dark');
      updateThemeMeta(isDark);
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    // Listen for OS system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleMediaChange = () => {
      const stored = localStorage.getItem('baxato_theme');
      if (!stored || stored === 'system') {
        applyTheme();
      }
    };
    mediaQuery.addEventListener('change', handleMediaChange);

    // Listen for storage events across tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'baxato_theme') {
        applyTheme();
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

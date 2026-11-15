export type ThemeMode = 'light' | 'dark' | 'system';

export const THEME_DARK_BG = '#070D18';
export const THEME_LIGHT_BG = '#ffffff';

export function resolveThemeMode(mode?: string | null): ThemeMode {
  if (mode === 'light' || mode === 'dark') {
    return mode;
  }
  return 'system';
}

export function resolveIsDark(mode?: string | null): boolean {
  const effective =
    mode ?? (typeof localStorage !== 'undefined' ? localStorage.getItem('baxato_theme') : null);
  const prefersDark =
    typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
  return effective === 'dark' || ((!effective || effective === 'system') && prefersDark);
}

/**
 * Synchronizes root document chrome (`dark` class, `<meta name="color-scheme">`,
 * root canvas background, and `<meta name="theme-color">`) strictly with the active theme.
 */
export function applyThemeChrome(isDark: boolean, explicitMode?: ThemeMode): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const baseBg = isDark ? THEME_DARK_BG : THEME_LIGHT_BG;
  const stored =
    explicitMode ??
    resolveThemeMode(typeof localStorage !== 'undefined' ? localStorage.getItem('baxato_theme') : null);
  const schemeValue = stored === 'system' ? 'light dark' : stored;

  root.classList.toggle('dark', isDark);

  let metaScheme =
    (document.getElementById('meta-color-scheme') as HTMLMetaElement | null) ||
    (document.querySelector('meta[name="color-scheme"]') as HTMLMetaElement | null);
  if (!metaScheme) {
    metaScheme = document.createElement('meta');
    metaScheme.name = 'color-scheme';
    metaScheme.id = 'meta-color-scheme';
    document.head.prepend(metaScheme);
  }
  if (metaScheme.getAttribute('content') !== schemeValue) {
    metaScheme.setAttribute('content', schemeValue);
  }

  // Fallback for browsers without :root:has(> head > meta[name="color-scheme"]) support
  if (typeof window === 'undefined' || !window.CSS?.supports?.('selector(:has(*))')) {
    root.style.colorScheme = schemeValue;
  } else if (root.style.colorScheme) {
    root.style.removeProperty('color-scheme');
  }

  root.style.backgroundColor = baseBg;
  if (document.body) {
    document.body.style.backgroundColor = baseBg;
  }

  let existing =
    (document.getElementById('meta-theme-color') as HTMLMetaElement | null) ||
    (document.querySelector('meta[name="theme-color"]') as HTMLMetaElement | null);

  if (!existing) {
    existing = document.createElement('meta');
    existing.name = 'theme-color';
    existing.id = 'meta-theme-color';
    document.head.appendChild(existing);
  }

  if (existing.getAttribute('content')?.toLowerCase() !== baseBg.toLowerCase()) {
    existing.setAttribute('content', baseBg);
  }
}

/**
 * Legacy helper kept as a synchronized no-op while remaining call sites finish migrating
 * to native top-layer `<dialog>` modals whose `::backdrop` derives directly from theme tokens.
 */
export function registerModalOverlay(): () => void {
  applyThemeChrome(resolveIsDark());
  return () => {
    applyThemeChrome(resolveIsDark());
  };
}

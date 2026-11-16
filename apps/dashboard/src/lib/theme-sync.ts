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

export interface ApplyThemeOptions {
  forceMetaRefresh?: boolean;
  silent?: boolean;
}

function replaceThemeColorMetas(isDark: boolean, mode: ThemeMode): void {
  if (typeof document === 'undefined' || !document.head) return;

  const oldMetas = Array.from(document.querySelectorAll('meta[name="theme-color"]'));
  for (const el of oldMetas) {
    el.remove();
  }

  if (mode === 'system') {
    const lightMeta = document.createElement('meta');
    lightMeta.name = 'theme-color';
    lightMeta.media = '(prefers-color-scheme: light)';
    lightMeta.content = THEME_LIGHT_BG;
    lightMeta.dataset.baxatoThemeColor = 'system-light';

    const darkMeta = document.createElement('meta');
    darkMeta.name = 'theme-color';
    darkMeta.media = '(prefers-color-scheme: dark)';
    darkMeta.content = THEME_DARK_BG;
    darkMeta.dataset.baxatoThemeColor = 'system-dark';

    // Append the currently active scheme meta first so WebKit/Blink immediately resolve it on insertion
    if (isDark) {
      document.head.appendChild(darkMeta);
      document.head.appendChild(lightMeta);
    } else {
      document.head.appendChild(lightMeta);
      document.head.appendChild(darkMeta);
    }
    return;
  }

  const singleMeta = document.createElement('meta');
  singleMeta.name = 'theme-color';
  singleMeta.id = 'meta-theme-color';
  singleMeta.content = isDark ? THEME_DARK_BG : THEME_LIGHT_BG;
  document.head.appendChild(singleMeta);
}

/**
 * Synchronizes root document chrome (`dark` class, `<meta name="color-scheme">`,
 * root canvas background, and `<meta name="theme-color">`) strictly with the active theme.
 */
export function applyThemeChrome(
  isDark: boolean,
  explicitMode?: ThemeMode,
  options: ApplyThemeOptions = {},
): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const baseBg = isDark ? THEME_DARK_BG : THEME_LIGHT_BG;
  const stored =
    explicitMode ??
    resolveThemeMode(typeof localStorage !== 'undefined' ? localStorage.getItem('baxato_theme') : null);
  const schemeValue = stored === 'system' ? 'light dark' : stored;
  const signature = `${stored}:${isDark ? 'dark' : 'light'}`;
  const prevSignature = root.dataset.baxatoThemeSig;
  const signatureChanged = prevSignature !== signature;

  root.dataset.baxatoThemeSig = signature;
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

  if (signatureChanged || options.forceMetaRefresh) {
    replaceThemeColorMetas(isDark, stored);
  }

  if (typeof window !== 'undefined' && !options.silent && signatureChanged) {
    window.dispatchEvent(
      new CustomEvent('baxato:theme-changed', {
        detail: { isDark, mode: stored },
      }),
    );
  }
}

/**
 * Synchronizes mobile status/navigation chrome theme-color when overlays open or close.
 */
export function registerModalOverlay(): () => void {
  applyThemeChrome(resolveIsDark(), undefined, { forceMetaRefresh: true });
  return () => {
    applyThemeChrome(resolveIsDark(), undefined, { forceMetaRefresh: true });
  };
}

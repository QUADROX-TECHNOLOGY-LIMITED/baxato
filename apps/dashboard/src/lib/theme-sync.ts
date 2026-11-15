export type ThemeMode = 'light' | 'dark' | 'system';

export const THEME_DARK_BG = '#070D18';
export const THEME_LIGHT_BG = '#ffffff';
export const THEME_DARK_MODAL_BG = '#020407';
export const THEME_LIGHT_MODAL_BG = '#abaeb4';

let activeModalCount = 0;

export function resolveIsDark(mode?: string | null): boolean {
  const effective =
    mode ?? (typeof localStorage !== 'undefined' ? localStorage.getItem('baxato_theme') : null);
  const prefersDark =
    typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
  return effective === 'dark' || ((!effective || effective === 'system') && prefersDark);
}

/**
 * Synchronizes root document chrome (`dark` class, `color-scheme`, background,
 * and `<meta name="theme-color">`) with theme mode and active dimmed modal overlays.
 */
export function applyThemeChrome(isDark: boolean): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const baseBg = isDark ? THEME_DARK_BG : THEME_LIGHT_BG;
  const chromeColor =
    activeModalCount > 0 ? (isDark ? THEME_DARK_MODAL_BG : THEME_LIGHT_MODAL_BG) : baseBg;

  root.classList.toggle('dark', isDark);
  root.style.colorScheme = isDark ? 'dark' : 'light';
  root.style.backgroundColor = chromeColor;
  if (document.body) {
    document.body.style.backgroundColor = chromeColor;
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

  if (existing.getAttribute('content')?.toLowerCase() !== chromeColor.toLowerCase()) {
    existing.setAttribute('content', chromeColor);
  }
}

/**
 * Tracks open modal backdrops so mobile browser/OS status and navigation bars
 * continuously match the dimmed viewport scrim across both light and dark modes.
 */
export function registerModalOverlay(): () => void {
  activeModalCount += 1;
  applyThemeChrome(resolveIsDark());
  let released = false;

  return () => {
    if (released) return;
    released = true;
    activeModalCount = Math.max(0, activeModalCount - 1);
    applyThemeChrome(resolveIsDark());
  };
}

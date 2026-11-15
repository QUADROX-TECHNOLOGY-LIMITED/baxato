export type ThemeMode = 'light' | 'dark' | 'system';

export const THEME_DARK_BG = '#070D18';
export const THEME_LIGHT_BG = '#ffffff';

/**
 * Resolves whether dark mode should currently be active from storage and OS preference.
 */
export function resolveIsDark(mode?: string | null): boolean {
  const effective =
    mode ?? (typeof localStorage !== 'undefined' ? localStorage.getItem('baxato_theme') : null);
  const prefersDark =
    typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
  return effective === 'dark' || ((!effective || effective === 'system') && prefersDark);
}

/**
 * Synchronizes document root class, color-scheme, canvas background, and theme-color meta tag.
 * Replaces the meta element when color changes so mobile browsers immediately repaint chrome bars
 * even while a full-viewport modal is open.
 */
export function applyThemeChrome(isDark: boolean): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const targetColor = isDark ? THEME_DARK_BG : THEME_LIGHT_BG;

  root.classList.toggle('dark', isDark);
  root.style.colorScheme = isDark ? 'dark' : 'light';
  root.style.backgroundColor = targetColor;

  const existing =
    (document.getElementById('meta-theme-color') as HTMLMetaElement | null) ||
    document.querySelector('meta[name="theme-color"]');

  if (existing && existing.getAttribute('content')?.toLowerCase() === targetColor.toLowerCase()) {
    return;
  }

  const nextMeta = document.createElement('meta');
  nextMeta.name = 'theme-color';
  nextMeta.id = 'meta-theme-color';
  nextMeta.content = targetColor;

  if (existing && existing.parentNode) {
    existing.parentNode.replaceChild(nextMeta, existing);
  } else {
    document.head.appendChild(nextMeta);
  }
}


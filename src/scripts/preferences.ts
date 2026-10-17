import { navigate } from 'astro:transitions/client';

// The first-paint theme script must use these same keys and { value, expires } format.
// Only explicit choices are saved. A fixed 180-day lifetime avoids indefinite retention;
// reading a preference never extends it. There are at most two site-owned storage entries.
const THEME_KEY = 'skloservis-theme';
const LANGUAGE_KEY = 'skloservis-language';
const PREFERENCE_LIFETIME = 180 * 24 * 60 * 60 * 1000;

type Theme = 'light' | 'dark';
type Language = 'cs' | 'en';
type Preference<T extends string> = { value: T; expires: number };

function isTheme(value: unknown): value is Theme {
  return value === 'light' || value === 'dark';
}

function isLanguage(value: unknown): value is Language {
  return value === 'cs' || value === 'en';
}

function readPreference<T extends string>(
  key: string,
  valid: (value: unknown) => value is T,
): Preference<T> | undefined {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return;
    const stored: unknown = JSON.parse(raw);
    if (
      stored &&
      typeof stored === 'object' &&
      'value' in stored &&
      valid(stored.value) &&
      'expires' in stored &&
      typeof stored.expires === 'number' &&
      Number.isFinite(stored.expires) &&
      stored.expires > Date.now() &&
      stored.expires <= Date.now() + PREFERENCE_LIFETIME
    ) {
      return { value: stored.value, expires: stored.expires };
    }
    localStorage.removeItem(key);
  } catch {
    // Storage may be unavailable, denied, full or contain invalid JSON.
    try {
      localStorage.removeItem(key);
    } catch {
      // Preference controls still work in memory for this page.
    }
  }
}

function savePreference<T extends string>(key: string, value: T): Preference<T> {
  const preference = { value, expires: Date.now() + PREFERENCE_LIFETIME };
  try {
    localStorage.setItem(key, JSON.stringify(preference));
  } catch {
    // A manual choice still applies for this page when persistence is unavailable.
  }
  return preference;
}

const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');
let manualTheme = readPreference(THEME_KEY, isTheme);
let manualLanguage = readPreference(LANGUAGE_KEY, isLanguage);
let languageScroll: { left: number; top: number } | undefined;

function unexpired<T extends string>(preference: Preference<T> | undefined): T | undefined {
  return preference && preference.expires > Date.now() ? preference.value : undefined;
}

function currentTheme(): Theme {
  return unexpired(manualTheme) ?? (systemTheme.matches ? 'dark' : 'light');
}

function applyTheme(target = document) {
  const theme = currentTheme();
  const root = target.documentElement;
  root.dataset.theme = theme;
  root.style.colorScheme = theme;
  target
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', theme === 'dark' ? '#071e28' : '#ffffff');
  target.querySelectorAll<HTMLButtonElement>('[data-theme-toggle]').forEach((button) => {
    button.hidden = false;
    button.setAttribute('aria-pressed', String(theme === 'dark'));
  });
  target.querySelectorAll<HTMLButtonElement>('[data-theme-system]').forEach((button) => {
    button.hidden = !unexpired(manualTheme);
  });
}

function preferredLanguage(): Language | undefined {
  const manual = unexpired(manualLanguage);
  if (manual) return manual;
  const locale = navigator.languages?.[0] || navigator.language;
  if (locale) return locale.toLowerCase().split('-')[0] === 'cs' ? 'cs' : 'en';
}

function selectInitialBrowserLanguage() {
  const root = document.documentElement;
  if (
    root.dataset.page !== 'home' ||
    root.dataset.language !== 'cs' ||
    preferredLanguage() !== 'en' ||
    location.search ||
    location.hash
  ) {
    return;
  }
  const navigation = performance.getEntriesByType('navigation')[0] as
    PerformanceNavigationTiming | undefined;
  if (navigation?.type === 'back_forward') return;
  if (document.referrer && new URL(document.referrer).origin === location.origin) return;
  const link = document.querySelector<HTMLAnchorElement>('.language-nav a[data-language="en"]');
  if (!link) return;
  const target = new URL(link.href, location.href);
  const currentPath = location.pathname.endsWith('/') ? location.pathname : `${location.pathname}/`;
  // Only the equivalent English homepage is eligible; never an arbitrary suggestion URL.
  if (target.origin === location.origin && target.pathname === `${currentPath}en/`) {
    void navigate(target.href, { history: 'replace' });
  }
}

function initializePreferences() {
  applyTheme();
}

document.addEventListener(
  'click',
  (event) => {
    if (!(event.target instanceof Element) || event.defaultPrevented || event.button !== 0) return;
    const themeButton = event.target.closest<HTMLButtonElement>('button[data-theme-toggle]');
    if (themeButton && !themeButton.disabled) {
      manualTheme = savePreference(THEME_KEY, currentTheme() === 'dark' ? 'light' : 'dark');
      applyTheme();
    }
    if (event.target.closest('button[data-theme-system]')) {
      manualTheme = undefined;
      try {
        localStorage.removeItem(THEME_KEY);
      } catch {
        // Reset applies for this page even when storage is unavailable.
      }
      applyTheme();
    }
    const languageLink = event.target.closest<HTMLAnchorElement>('a[data-language]');
    const language = languageLink?.dataset.language;
    if (isLanguage(language)) {
      manualLanguage = savePreference(LANGUAGE_KEY, language);
    }
  },
  { capture: true },
);

systemTheme.addEventListener('change', () => applyTheme());
document.addEventListener('astro:before-swap', (event) => {
  // Keep incoming HTML in the current theme before Astro replaces the root attributes.
  applyTheme(event.newDocument);
  // Skipping the visual transition intentionally rejects its ready promise.
  void event.viewTransition.ready.catch((error: unknown) => {
    if (!(error instanceof DOMException) || error.name !== 'AbortError') throw error;
  });
  event.viewTransition.skipTransition();
  const language =
    event.sourceElement?.closest<HTMLAnchorElement>('a[data-language]')?.dataset.language;
  languageScroll =
    isLanguage(language) && event.navigationType !== 'traverse'
      ? { left: scrollX, top: scrollY }
      : undefined;
});
document.addEventListener('astro:after-swap', () => {
  initializePreferences();
  const focusTarget = languageScroll ? '.language-nav [aria-current="page"]' : '#main';
  if (languageScroll) window.scrollTo({ ...languageScroll, behavior: 'instant' });
  document.querySelector<HTMLElement>(focusTarget)?.focus({ preventScroll: true });
  languageScroll = undefined;
});
window.addEventListener('storage', (event) => {
  if (event.key === THEME_KEY || event.key === null) {
    manualTheme = readPreference(THEME_KEY, isTheme);
  }
  if (event.key === LANGUAGE_KEY || event.key === null) {
    manualLanguage = readPreference(LANGUAGE_KEY, isLanguage);
  }
  initializePreferences();
});
window.addEventListener('pageshow', initializePreferences);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') initializePreferences();
});
document.addEventListener('astro:page-load', initializePreferences);
initializePreferences();
selectInitialBrowserLanguage();

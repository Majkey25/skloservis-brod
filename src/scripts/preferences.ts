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
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
let manualTheme = readPreference(THEME_KEY, isTheme);
let manualLanguage = readPreference(LANGUAGE_KEY, isLanguage);
let languageSuggestionDismissed = false;
let transition: ReturnType<typeof document.startViewTransition> | undefined;

function unexpired<T extends string>(preference: Preference<T> | undefined): T | undefined {
  return preference && preference.expires > Date.now() ? preference.value : undefined;
}

function currentTheme(): Theme {
  return unexpired(manualTheme) ?? (systemTheme.matches ? 'dark' : 'light');
}

function applyTheme(animate = false, trigger?: HTMLElement) {
  const theme = currentTheme();
  const root = document.documentElement;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', theme === 'dark' ? '#071e28' : '#ffffff');
  document.querySelectorAll<HTMLButtonElement>('[data-theme-toggle]').forEach((button) => {
    button.hidden = false;
    button.setAttribute('aria-pressed', String(theme === 'dark'));
  });
  document.querySelectorAll<HTMLButtonElement>('[data-theme-system]').forEach((button) => {
    button.hidden = !unexpired(manualTheme);
  });
  transition?.skipTransition();
  root.classList.remove('theme-switching');
  if (root.dataset.theme === theme) {
    root.style.colorScheme = theme;
    return;
  }
  const update = () => {
    // Transition callbacks can run after a newer click or a system-theme change.
    const latest = currentTheme();
    document.documentElement.dataset.theme = latest;
    document.documentElement.style.colorScheme = latest;
  };
  if (animate && !reducedMotion.matches && typeof document.startViewTransition === 'function') {
    try {
      const rect = trigger?.getBoundingClientRect();
      const x = rect ? rect.x + rect.width / 2 : innerWidth / 2;
      const y = rect ? rect.y + rect.height / 2 : innerHeight / 2;
      root.style.setProperty('--vt-x', `${x}px`);
      root.style.setProperty('--vt-y', `${y}px`);
      root.style.setProperty(
        '--vt-r',
        `${Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))}px`,
      );
      root.classList.add('theme-switching');
      transition = document.startViewTransition(update);
      const current = transition;
      void transition.ready.catch(() => undefined);
      void transition.finished
        .catch(() => undefined)
        .then(() => {
          if (transition === current) {
            root.classList.remove('theme-switching');
            transition = undefined;
          }
        });
      return;
    } catch {
      root.classList.remove('theme-switching');
      // Unsupported or interrupted transitions must not prevent a theme change.
    }
  }
  update();
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
    unexpired(manualLanguage) ||
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
  const link = document.querySelector<HTMLAnchorElement>(
    '[data-language-suggestion] a[data-language="en"]',
  );
  if (!link) return;
  const target = new URL(link.href, location.href);
  const currentPath = location.pathname.endsWith('/') ? location.pathname : `${location.pathname}/`;
  // Only the equivalent English homepage is eligible; never an arbitrary suggestion URL.
  if (target.origin === location.origin && target.pathname === `${currentPath}en/`) {
    location.replace(target.href);
  }
}

function updateLanguageSuggestion() {
  const root = document.documentElement;
  const preferred = preferredLanguage();
  document.querySelectorAll<HTMLElement>('[data-language-suggestion]').forEach((suggestion) => {
    const hasLink = preferred && suggestion.querySelector(`a[data-language="${preferred}"]`);
    suggestion.hidden = !(
      !languageSuggestionDismissed &&
      root.dataset.page === 'home' &&
      preferred &&
      preferred !== root.dataset.language &&
      hasLink
    );
  });
}

function initializePreferences() {
  applyTheme();
  updateLanguageSuggestion();
}

document.addEventListener('click', (event) => {
  if (!(event.target instanceof Element) || event.defaultPrevented || event.button !== 0) return;
  if (event.target.closest('[data-language-suggestion-dismiss]')) {
    languageSuggestionDismissed = true;
    updateLanguageSuggestion();
  }
  const themeButton = event.target.closest<HTMLButtonElement>('button[data-theme-toggle]');
  if (themeButton && !themeButton.disabled) {
    manualTheme = savePreference(THEME_KEY, currentTheme() === 'dark' ? 'light' : 'dark');
    applyTheme(true, themeButton);
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
    // Native navigation keeps the link's equivalent route, query and fragment intact.
    updateLanguageSuggestion();
  }
});

systemTheme.addEventListener('change', () => applyTheme());
reducedMotion.addEventListener('change', () => {
  if (reducedMotion.matches) transition?.skipTransition();
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

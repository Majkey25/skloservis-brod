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
type Visual = { kind: 'theme' | 'language'; transition?: ViewTransition };
type Navigation = {
  signal: AbortSignal;
  language?: Language;
  visual?: Visual;
  scroll?: { left: number; top: number };
  dispose: () => void;
};
let visual: Visual | undefined;
let navigation: Navigation | undefined;
let clickedLanguage: HTMLAnchorElement | undefined;

function reportTransitionError(error: unknown) {
  if (!(error instanceof DOMException && error.name === 'AbortError')) {
    console.error('View transition failed:', error);
  }
}

function clearVisual(effect: Visual | undefined = visual) {
  if (!effect || visual !== effect) return;
  visual = undefined;
  const root = document.documentElement;
  delete root.dataset.preferenceTransition;
  for (const property of ['--theme-x', '--theme-y', '--theme-radius', '--lang-sign']) {
    root.style.removeProperty(property);
  }
}

function stopVisual() {
  const effect = visual;
  effect?.transition?.skipTransition();
  clearVisual(effect);
}

function observeTransition(transition: ViewTransition, finish: () => void) {
  // skipTransition rejects ready with AbortError, while finished still awaits the DOM update.
  void transition.ready.catch(reportTransitionError);
  void transition.updateCallbackDone.catch(reportTransitionError);
  void transition.finished.then(finish, (error: unknown) => {
    reportTransitionError(error);
    finish();
  });
}

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

function initializePreferences() {
  applyTheme();
}

function changeTheme(button: HTMLButtonElement, update: () => void) {
  stopVisual();
  update();
  // System/storage updates and themes changed during a route swap never create another transition.
  if (reducedMotion.matches || typeof document.startViewTransition !== 'function' || navigation) {
    applyTheme();
    return;
  }
  const { left, top, width, height } = button.getBoundingClientRect();
  const x = left + width / 2;
  const y = top + height / 2;
  const root = document.documentElement;
  root.style.setProperty('--theme-x', `${x}px`);
  root.style.setProperty('--theme-y', `${y}px`);
  root.style.setProperty(
    '--theme-radius',
    `${Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y))}px`,
  );
  const effect: Visual = { kind: 'theme' };
  visual = effect;
  root.dataset.preferenceTransition = effect.kind;
  try {
    effect.transition = document.startViewTransition(() => applyTheme());
    observeTransition(effect.transition, () => clearVisual(effect));
  } catch (error) {
    reportTransitionError(error);
    clearVisual(effect);
    applyTheme();
  }
}

document.addEventListener(
  'click',
  (event) => {
    if (!(event.target instanceof Element) || event.defaultPrevented || event.button !== 0) return;
    clickedLanguage = undefined;
    const themeButton = event.target.closest<HTMLButtonElement>('button[data-theme-toggle]');
    if (themeButton && !themeButton.disabled) {
      changeTheme(themeButton, () => {
        manualTheme = savePreference(THEME_KEY, currentTheme() === 'dark' ? 'light' : 'dark');
      });
    }
    const resetButton = event.target.closest<HTMLButtonElement>('button[data-theme-system]');
    if (resetButton && !resetButton.disabled) {
      // applyTheme hides this button, which would drop keyboard focus to the body.
      const hadFocus = document.activeElement === resetButton;
      changeTheme(resetButton, () => {
        manualTheme = undefined;
        try {
          localStorage.removeItem(THEME_KEY);
        } catch {
          // Reset applies for this page even when storage is unavailable.
        }
      });
      // Move focus before the transition's update callback hides the reset button.
      if (hadFocus)
        document
          .querySelector<HTMLAnchorElement>('.site-footer nav a')
          ?.focus({ preventScroll: true });
    }
    const languageLink = event.target.closest<HTMLAnchorElement>('a[data-language]');
    const language = languageLink?.dataset.language;
    if (isLanguage(language)) {
      savePreference(LANGUAGE_KEY, language);
      if (
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey &&
        !event.shiftKey &&
        languageLink &&
        !languageLink.hasAttribute('download') &&
        (!languageLink.target || languageLink.target === '_self') &&
        !languageLink.hasAttribute('data-astro-reload') &&
        new URL(languageLink.href).origin === location.origin
      ) {
        clickedLanguage = languageLink;
        // A trusted click can run microtasks between listeners. Keep the marker through bubbling.
        window.setTimeout(() => {
          if (clickedLanguage === languageLink) clickedLanguage = undefined;
        }, 0);
      }
    }
  },
  { capture: true },
);

systemTheme.addEventListener('change', () => {
  if (!unexpired(manualTheme)) stopVisual();
  applyTheme();
});
reducedMotion.addEventListener('change', () => {
  if (reducedMotion.matches) stopVisual();
});

document.addEventListener('astro:before-preparation', (event) => {
  const previousUpdate = visual?.transition?.updateCallbackDone.catch(reportTransitionError);
  stopVisual();
  navigation?.dispose();
  const link = event.sourceElement?.closest<HTMLAnchorElement>('a[data-language]');
  const language = link?.dataset.language;
  const state: Navigation = {
    signal: event.signal,
    language:
      event.navigationType !== 'traverse' &&
      link === clickedLanguage &&
      link?.href === event.to.href &&
      isLanguage(language)
        ? language
        : undefined,
    dispose: () => {
      event.signal.removeEventListener('abort', state.dispose);
      if (navigation !== state) return;
      if (visual === state.visual) stopVisual();
      navigation = undefined;
    },
  };
  clickedLanguage = undefined;
  navigation = state;
  event.signal.addEventListener('abort', state.dispose, { once: true });
  if (
    state.language &&
    !reducedMotion.matches &&
    typeof document.startViewTransition === 'function'
  ) {
    state.visual = { kind: 'language' };
    visual = state.visual;
    // This runs BEFORE Astro calls startViewTransition and captures the old page.
    document.documentElement.dataset.preferenceTransition = 'language';
    document.documentElement.style.setProperty('--lang-sign', state.language === 'en' ? '1' : '-1');
  }
  const load = event.loader;
  event.loader = async () => {
    try {
      await load();
      // An interrupted transition may still be replacing the root attributes.
      await previousUpdate;
      if (navigation === state && visual === state.visual && state.visual) {
        document.documentElement.dataset.preferenceTransition = 'language';
        document.documentElement.style.setProperty(
          '--lang-sign',
          state.language === 'en' ? '1' : '-1',
        );
      }
    } catch (error) {
      reportTransitionError(error);
      event.preventDefault();
    } finally {
      if (event.defaultPrevented || event.signal.aborted) state.dispose();
    }
  };
});

document.addEventListener('astro:before-swap', (event) => {
  // Keep incoming HTML in the current theme before Astro replaces the root attributes.
  applyTheme(event.newDocument);
  const state = navigation?.signal === event.signal ? navigation : undefined;
  observeTransition(event.viewTransition, () => state?.dispose());
  if (state?.language) state.scroll = { left: scrollX, top: scrollY };
  if (state?.visual && visual === state.visual && !reducedMotion.matches) {
    state.visual.transition = event.viewTransition;
    const root = event.newDocument.documentElement;
    root.dataset.preferenceTransition = 'language';
    root.style.setProperty('--lang-sign', state.language === 'en' ? '1' : '-1');
  } else {
    // Astro creates its own transition even for ordinary routes; never give it a root snapshot.
    event.viewTransition.skipTransition();
  }
});
document.addEventListener('astro:after-swap', () => {
  initializePreferences();
  const position = navigation?.scroll;
  const focusTarget = position ? '.language-nav [aria-current="page"]' : '#main';
  if (position) window.scrollTo({ ...position, behavior: 'instant' });
  document.querySelector<HTMLElement>(focusTarget)?.focus({ preventScroll: true });
  if (navigation) navigation.scroll = undefined;
});
window.addEventListener('storage', (event) => {
  if (event.key === THEME_KEY || event.key === null) {
    stopVisual();
    manualTheme = readPreference(THEME_KEY, isTheme);
  }
  initializePreferences();
});
window.addEventListener('pagehide', () => {
  stopVisual();
  navigation?.dispose();
  clickedLanguage = undefined;
});
window.addEventListener('pageshow', initializePreferences);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') initializePreferences();
});
document.addEventListener('astro:page-load', initializePreferences);
initializePreferences();
export {};

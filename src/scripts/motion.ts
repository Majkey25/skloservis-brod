const motionQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
const revealed = new WeakSet<Element>();
const pending = new Set<HTMLElement>();
// Running animations and count loops, keyed by element. cancel() puts the element back.
const active = new Map<HTMLElement, { cancel(): void }>();
const EASE = 'cubic-bezier(.16,1,.3,1)';
const REVEAL_SELECTOR = [
  "main [data-reveal='photo']",
  'main .home-product__media picture',
  'main .gallery-card__image-wrap picture',
  "main [data-reveal='rise']",
  "main [data-reveal='line']",
  "main [data-reveal='count']",
  "main [data-reveal='draw']",
].join(', ');
let observer: IntersectionObserver | undefined;
let page: HTMLElement | undefined;

function stopMotion() {
  observer?.disconnect();
  observer = undefined;
  pending.clear();
  for (const item of active.values()) item.cancel();
  active.clear();
  page = undefined;
}

function track(element: HTMLElement, animation: Animation) {
  active.set(element, animation);
  animation.onfinish = () => {
    active.delete(element);
  };
}

// Counts up to four numbers in one container with a single frame loop.
function countUp(container: HTMLElement) {
  const formatter = new Intl.NumberFormat(document.documentElement.lang);
  const counts = Array.from(container.querySelectorAll<HTMLElement>('[data-count-number]'))
    .slice(0, 4)
    .map((span) => ({
      span,
      text: span.textContent,
      value: Number(span.dataset.countNumber),
      width: span.getBoundingClientRect().width,
    }))
    .filter(({ value }) => Number.isFinite(value));
  if (!counts.length) return;

  let frame = 0;
  const restore = () => {
    cancelAnimationFrame(frame);
    for (const { span, text } of counts) {
      span.textContent = text;
      span.style.display = '';
      span.style.minWidth = '';
    }
  };
  // Reserve the final width so the digits do not shift while counting.
  for (const { span, width } of counts) {
    span.style.display = 'inline-block';
    span.style.minWidth = `${width}px`;
  }

  const start = performance.now();
  const step = (now: number) => {
    const progress = Math.min((now - start) / 1600, 1);
    const eased = progress === 1 ? 1 : 1 - 2 ** (-10 * progress);
    for (const { span, value } of counts) {
      span.textContent = formatter.format(Math.round(value * eased));
    }
    if (progress < 1) {
      frame = requestAnimationFrame(step);
      return;
    }
    restore();
    active.delete(container);
  };
  active.set(container, { cancel: restore });
  step(start);
}

function reveal(element: HTMLElement, delay: number) {
  const timing: KeyframeAnimationOptions = { delay, easing: EASE, fill: 'backwards' };
  switch (element.dataset.reveal) {
    case 'count':
      countUp(element);
      return;
    case 'draw': {
      // Line icons are drawn stroke by stroke; paths use pathLength="1" with stroke-dasharray: 1.
      const strokes = Array.from(element.querySelectorAll<SVGPathElement>('path'))
        .slice(0, 12)
        .map((path, index) =>
          path.animate([{ strokeDashoffset: '1' }, { strokeDashoffset: '0' }], {
            ...timing,
            delay: delay + index * 110,
            duration: 1000,
          }),
        );
      if (!strokes.length) return;
      active.set(element, { cancel: () => strokes.forEach((stroke) => stroke.cancel()) });
      Promise.all(strokes.map((stroke) => stroke.finished)).then(
        () => active.delete(element),
        () => undefined,
      );
      return;
    }
    case 'rise':
      track(
        element,
        element.animate(
          [
            { opacity: 0.2, transform: 'translateY(28px)' },
            { opacity: 1, transform: 'none' },
          ],
          { ...timing, duration: 760 },
        ),
      );
      return;
    case 'line':
      // The connector is the ::before pseudo-element. Leave it drawn where that cannot animate.
      try {
        track(
          element,
          element.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], {
            ...timing,
            duration: 1100,
            pseudoElement: '::before',
          }),
        );
      } catch {
        // Unsupported: the connector stays fully drawn.
      }
      return;
    default:
      track(
        element,
        element.animate(
          [
            { opacity: 0.35, transform: 'scale(1.08)' },
            { opacity: 1, transform: 'scale(1)' },
          ],
          { ...timing, duration: 900 },
        ),
      );
  }
}

function initializeMotion() {
  if (page === document.body) return;
  stopMotion();
  page = document.body;
  if (
    !motionQuery ||
    motionQuery.matches ||
    !motionQuery.addEventListener ||
    !('IntersectionObserver' in window) ||
    !Element.prototype.animate
  ) {
    return;
  }

  observer = new IntersectionObserver(
    (entries) => {
      let batch = 0;
      for (const entry of entries) {
        const element = entry.target as HTMLElement;
        if (!entry.isIntersecting || !pending.delete(element)) continue;
        observer?.unobserve(element);
        revealed.add(element);
        if (element.closest('a')?.contains(document.activeElement)) continue;
        reveal(element, Math.min(batch++ * 80, 320));
      }
      if (!pending.size) {
        observer?.disconnect();
        observer = undefined;
      }
      // Start a little inside the viewport so each reveal is actually seen.
    },
    { rootMargin: '0px 0px -10% 0px' },
  );

  const elements = document.querySelectorAll<HTMLElement>(REVEAL_SELECTOR);
  for (const element of Array.from(elements).slice(0, 80)) {
    // Leave the initial viewport and restored scroll position fully visible.
    if (revealed.has(element)) continue;
    if (element.getBoundingClientRect().top < window.innerHeight) {
      revealed.add(element);
      continue;
    }
    pending.add(element);
    observer.observe(element);
  }
  if (!pending.size) {
    observer.disconnect();
    observer = undefined;
  }
}

document.addEventListener('focusin', (event) => {
  if (!(event.target instanceof Node)) return;
  for (const element of [...pending, ...active.keys()]) {
    if (!element.contains(event.target) && !element.closest('a')?.contains(event.target)) continue;
    observer?.unobserve(element);
    pending.delete(element);
    revealed.add(element);
    active.get(element)?.cancel();
    active.delete(element);
  }
});
motionQuery?.addEventListener?.('change', () => {
  stopMotion();
  if (!motionQuery.matches) initializeMotion();
});
document.addEventListener('astro:before-swap', stopMotion);
document.addEventListener('astro:page-load', initializeMotion);
// The hero entrance is CSS-only. Finish it on client navigation so it never replays.
document.addEventListener('astro:after-swap', () => {
  if (!('getAnimations' in Element.prototype)) return;
  document
    .querySelectorAll<HTMLElement>('[data-reveal="hero"], [data-reveal="hero"] *')
    .forEach((element) =>
      element.getAnimations().forEach((animation) => {
        // finish() throws for infinite animations; those are never part of the entrance.
        if (animation.effect?.getComputedTiming().endTime !== Infinity) animation.finish();
      }),
    );
});
// Module scope keeps these names out of the shared global script scope.
export {};
window.addEventListener('pagehide', stopMotion);
window.addEventListener('pageshow', (event) => {
  if (event.persisted) initializeMotion();
});
initializeMotion();

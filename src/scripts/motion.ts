const motionQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
const revealed = new WeakSet<Element>();
const pending = new Set<HTMLElement>();
// A prepared reveal holds its first frame until played; cancel() always restores the final state.
type Reveal = { play(delay: number): void; cancel(): void };
const prepared = new Map<HTMLElement, Reveal>();
const EASE = 'cubic-bezier(.25,1,.5,1)';
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
  for (const reveal of prepared.values()) reveal.cancel();
  prepared.clear();
  page = undefined;
}

// Paused animations show their first keyframe immediately, so an element waiting below the
// viewport is already in its start state and never jumps when the reveal begins.
function hold(element: HTMLElement, animations: Animation[], stagger = 0): Reveal {
  for (const animation of animations) animation.pause();
  return {
    play(delay) {
      animations.forEach((animation, index) => {
        animation.effect?.updateTiming({ delay: delay + index * stagger });
        animation.play();
      });
      Promise.all(animations.map((animation) => animation.finished)).then(
        () => prepared.delete(element),
        () => undefined,
      );
    },
    cancel() {
      for (const animation of animations) animation.cancel();
    },
  };
}

// Counts up to four numbers in one container with a single frame loop, starting from zero.
function holdCount(container: HTMLElement): Reveal | undefined {
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
    span.textContent = formatter.format(0);
  }
  return {
    play(delay) {
      const start = performance.now() + delay;
      const step = (now: number) => {
        const progress = Math.min(Math.max((now - start) / 1400, 0), 1);
        const eased = 1 - (1 - progress) ** 4;
        for (const { span, value } of counts) {
          span.textContent = formatter.format(Math.round(value * eased));
        }
        if (progress < 1) {
          frame = requestAnimationFrame(step);
          return;
        }
        restore();
        prepared.delete(container);
      };
      frame = requestAnimationFrame(step);
    },
    cancel: restore,
  };
}

function prepare(element: HTMLElement): Reveal | undefined {
  const timing: KeyframeAnimationOptions = { easing: EASE, fill: 'backwards' };
  switch (element.dataset.reveal) {
    case 'count':
      return holdCount(element);
    case 'draw': {
      // Line icons are drawn stroke by stroke; paths use pathLength="1" with stroke-dasharray: 1.
      const strokes = Array.from(element.querySelectorAll<SVGPathElement>('path'))
        .slice(0, 12)
        .map((path) =>
          path.animate([{ strokeDashoffset: '1' }, { strokeDashoffset: '0' }], {
            ...timing,
            duration: 900,
          }),
        );
      return strokes.length ? hold(element, strokes, 90) : undefined;
    }
    case 'rise':
      return hold(element, [
        element.animate(
          [
            { opacity: 0, transform: 'translateY(18px)' },
            { opacity: 1, transform: 'none' },
          ],
          { ...timing, duration: 700 },
        ),
      ]);
    case 'line':
      // The connector is the ::before pseudo-element. Leave it drawn where that cannot animate.
      try {
        return hold(element, [
          element.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], {
            ...timing,
            duration: 1000,
            pseudoElement: '::before',
          }),
        ]);
      } catch {
        return undefined;
      }
    default:
      return hold(element, [
        element.animate(
          [
            { opacity: 0, transform: 'scale(1.04)' },
            { opacity: 1, transform: 'none' },
          ],
          { ...timing, duration: 900 },
        ),
      ]);
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
        prepared.get(element)?.play(Math.min(batch++ * 70, 280));
      }
      if (!pending.size) {
        observer?.disconnect();
        observer = undefined;
      }
    },
    // Start a little inside the viewport so each reveal is actually seen.
    { rootMargin: '0px 0px -6% 0px' },
  );

  const elements = document.querySelectorAll<HTMLElement>(REVEAL_SELECTOR);
  for (const element of Array.from(elements).slice(0, 80)) {
    // Leave the initial viewport and restored scroll position fully visible.
    if (revealed.has(element)) continue;
    if (element.getBoundingClientRect().top < window.innerHeight) {
      revealed.add(element);
      continue;
    }
    const reveal = prepare(element);
    if (!reveal) continue;
    prepared.set(element, reveal);
    pending.add(element);
    observer.observe(element);
  }
  if (!pending.size) {
    observer.disconnect();
    observer = undefined;
  }
}

// Anything reached by keyboard or printed is shown in its final state at once.
const settle = (shouldSettle: (element: HTMLElement) => boolean) => {
  for (const [element, reveal] of prepared) {
    if (!shouldSettle(element)) continue;
    observer?.unobserve(element);
    pending.delete(element);
    revealed.add(element);
    reveal.cancel();
    prepared.delete(element);
  }
};
document.addEventListener('focusin', (event) => {
  if (!(event.target instanceof Node)) return;
  const target = event.target;
  settle((element) => element.contains(target) || !!element.closest('a')?.contains(target));
});
window.addEventListener('beforeprint', () => settle(() => true));
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
window.addEventListener('pagehide', stopMotion);
window.addEventListener('pageshow', (event) => {
  if (event.persisted) initializeMotion();
});
initializeMotion();
// Module scope keeps these names out of the shared global script scope.
export {};

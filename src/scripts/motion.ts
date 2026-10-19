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
// A language change shows the same page in another language: nothing should animate again.
let languageSwap = false;

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
      widthEm:
        span.getBoundingClientRect().width / Number.parseFloat(getComputedStyle(span).fontSize),
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
  // Keep the final width relative to the font so resizing cannot leave an oversized count slot.
  for (const { span, widthEm } of counts) {
    span.style.display = 'inline-block';
    span.style.minWidth = `${widthEm}em`;
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
  const skipReveals = languageSwap;
  languageSwap = false;
  if (
    skipReveals ||
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

  // Read all positions before paused animations change styles and invalidate the next read.
  const elements = Array.from(document.querySelectorAll<HTMLElement>(REVEAL_SELECTOR))
    .slice(0, 80)
    .filter((element) => {
      // Leave the initial viewport and restored scroll position fully visible.
      if (revealed.has(element)) return false;
      if (element.getBoundingClientRect().top >= window.innerHeight) return true;
      revealed.add(element);
      return false;
    });
  for (const element of elements) {
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
document.addEventListener('astro:before-preparation', (event) => {
  languageSwap = !!event.sourceElement?.closest('a[data-language]');
});
document.addEventListener('astro:before-swap', stopMotion);
document.addEventListener('astro:page-load', initializeMotion);
// First-load entrance: Base.astro marks a fresh document as pending; the CSS plays once the page
// has parsed and painted, when the main thread is free. Client navigation replaces the root
// attributes, so the entrance never replays on internal, language or history changes.
function playEntrance() {
  const root = document.documentElement;
  if (root.dataset.entry !== 'pending') return;
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      if (root.dataset.entry !== 'pending') return;
      root.dataset.entry = 'play';
      // Drop the state once the longest step has ended, so a later motion-preference change
      // cannot replay the entrance.
      window.setTimeout(() => delete root.dataset.entry, 2400);
    }),
  );
}
motionQuery?.addEventListener?.('change', () => delete document.documentElement.dataset.entry);
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', playEntrance, { once: true });
} else {
  playEntrance();
}
window.addEventListener('pagehide', stopMotion);
window.addEventListener('pageshow', (event) => {
  if (event.persisted) initializeMotion();
});
initializeMotion();

// An opened disclosure writes its text in quickly, like a streamed answer. The text stays in the
// document the whole time: a highlight only paints the not-yet-written part transparent, so
// layout, reading, search and copy are untouched and screen readers hear nothing extra.
type Stream = { details: HTMLDetailsElement; frame: number; caret: HTMLElement };
let stream: Stream | undefined;

function endStream() {
  if (!stream) return;
  cancelAnimationFrame(stream.frame);
  stream.caret.remove();
  CSS.highlights.delete('stream-pending');
  CSS.highlights.delete('stream-head');
  stream = undefined;
}

function startStream(details: HTMLDetailsElement) {
  endStream();
  if (!('highlights' in CSS) || !motionQuery || motionQuery.matches) return;
  const words: { node: Text; start: number; end: number }[] = [];
  const walker = document.createTreeWalker(details, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) =>
      node.parentElement?.closest('summary') || !node.textContent?.trim()
        ? NodeFilter.FILTER_REJECT
        : NodeFilter.FILTER_ACCEPT,
  });
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node as Text;
    for (const match of text.data.matchAll(/\S+/g)) {
      words.push({ node: text, start: match.index, end: match.index + match[0].length });
    }
  }
  const last = words.at(-1);
  if (!last) return;

  const pending = new Highlight();
  const head = new Highlight();
  CSS.highlights.set('stream-pending', pending);
  CSS.highlights.set('stream-head', head);
  const caret = document.createElement('span');
  caret.className = 'stream-caret';
  caret.setAttribute('aria-hidden', 'true');
  details.append(caret);
  // Fast on purpose: about 16ms per word, never shorter than 0.5s or longer than 1.4s.
  const duration = Math.min(Math.max(words.length * 16, 500), 1400);
  const started = performance.now();
  const range = (from: (typeof words)[number], to: (typeof words)[number], end = to.end) => {
    const value = new Range();
    value.setStart(from.node, from.start);
    value.setEnd(to.node, end);
    return value;
  };

  const step = (now: number) => {
    if (!stream || stream.details !== details) return;
    const shown = Math.min(words.length, Math.ceil(((now - started) / duration) * words.length));
    pending.clear();
    head.clear();
    const written = words[shown - 1];
    if (shown >= words.length || !written) {
      endStream();
      return;
    }
    pending.add(range(words[shown]!, last));
    head.add(range(words[Math.max(0, shown - 3)]!, written));
    const tip = range(written, written, written.end);
    tip.collapse(false);
    const rect = tip.getClientRects()[0] ?? tip.getBoundingClientRect();
    const box = details.getBoundingClientRect();
    caret.style.height = `${rect.height}px`;
    caret.style.translate = `${rect.right - box.left + 2}px ${rect.top - box.top}px`;
    stream.frame = requestAnimationFrame(step);
  };
  stream = { details, frame: requestAnimationFrame(step), caret };
}

document.addEventListener(
  'toggle',
  (event) => {
    const details = event.target;
    if (!(details instanceof HTMLDetailsElement) || !details.hasAttribute('data-stream')) return;
    if (details.open) startStream(details);
    else if (stream?.details === details) endStream();
  },
  true,
);
document.addEventListener('astro:before-swap', endStream);
window.addEventListener('pagehide', endStream);
window.addEventListener('beforeprint', endStream);
motionQuery?.addEventListener?.('change', () => {
  if (motionQuery.matches) endStream();
});
// Module scope keeps these names out of the shared global script scope.
export {};

const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)');
const revealed = new WeakSet<Element>();
const pending = new Set<HTMLElement>();
const animations = new Map<HTMLElement, Animation>();
let observer: IntersectionObserver | undefined;
let page: HTMLElement | undefined;

function stopMotion() {
  observer?.disconnect();
  observer = undefined;
  pending.clear();
  for (const animation of animations.values()) animation.cancel();
  animations.clear();
  page = undefined;
}

function initializeMotion() {
  if (page === document.body) return;
  stopMotion();
  page = document.body;
  if (
    !reducedMotion ||
    reducedMotion.matches ||
    !reducedMotion.addEventListener ||
    !('IntersectionObserver' in window) ||
    !Element.prototype.animate
  ) {
    return;
  }

  observer = new IntersectionObserver((entries) => {
    let stagger = 0;
    for (const entry of entries) {
      const element = entry.target as HTMLElement;
      if (!entry.isIntersecting || !pending.delete(element)) continue;
      observer?.unobserve(element);
      revealed.add(element);
      if (reducedMotion.matches || element.closest('a')?.contains(document.activeElement)) continue;
      const animation = element.animate(
        [
          { opacity: 0.7, transform: 'scale(1.035)' },
          { opacity: 1, transform: 'scale(1)' },
        ],
        {
          duration: 420,
          delay: Math.min(stagger++ * 45, 90),
          easing: 'cubic-bezier(.2,.7,.2,1)',
          fill: 'backwards',
        },
      );
      animations.set(element, animation);
      animation.onfinish = () => animations.delete(element);
    }
    if (!pending.size) {
      observer?.disconnect();
      observer = undefined;
    }
  });

  const elements = document.querySelectorAll<HTMLElement>(
    'main .home-product__media picture, main .gallery-card__image-wrap picture',
  );
  for (const element of Array.from(elements).slice(0, 48)) {
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
  for (const element of [...pending, ...animations.keys()]) {
    if (!element.contains(event.target) && !element.closest('a')?.contains(event.target)) continue;
    observer?.unobserve(element);
    pending.delete(element);
    revealed.add(element);
    animations.get(element)?.cancel();
    animations.delete(element);
  }
});
reducedMotion?.addEventListener?.('change', () => {
  stopMotion();
  if (!reducedMotion.matches) initializeMotion();
});
document.addEventListener('astro:before-swap', stopMotion);
document.addEventListener('astro:page-load', initializeMotion);
window.addEventListener('pagehide', stopMotion);
window.addEventListener('pageshow', (event) => {
  if (event.persisted) initializeMotion();
});
initializeMotion();

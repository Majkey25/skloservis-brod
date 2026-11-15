// CI selects the target before installing packages; keep runtime imports dependency-free.
import { PRODUCTION_ORIGIN } from './urls.ts';

export type BuildTarget = 'preview' | 'production';

/** One explicit opt-in; NODE_ENV and Astro's default production mode never enable indexing. */
export function deployment(target: string = 'preview') {
  if (target !== 'preview' && target !== 'production') {
    throw new TypeError('SITE_BUILD_TARGET must be preview or production');
  }
  return {
    target,
    site: target === 'production' ? PRODUCTION_ORIGIN : 'https://majkey25.github.io',
    base: target === 'production' ? '/' : '/skloservis-brod/',
    outDir: target === 'production' ? '.reference/build-production' : 'dist',
  } as const;
}

/**
 * The Pages target of one workflow run. The repository variable SITE_DEPLOY_TARGET (unset means
 * preview) applies only to pushes and manual runs on main; pull requests and other branches always
 * build the noindex preview. Any other value fails, so a typo can never publish by accident.
 */
export function workflowTarget(event: string, ref: string, configured = ''): BuildTarget {
  const value = configured || 'preview';
  if (value !== 'preview' && value !== 'production') {
    throw new TypeError(`SITE_DEPLOY_TARGET must be preview or production, not "${configured}"`);
  }
  const main = ref === 'refs/heads/main' && (event === 'push' || event === 'workflow_dispatch');
  return main ? value : 'preview';
}

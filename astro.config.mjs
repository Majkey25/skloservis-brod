// @ts-check
import { defineConfig } from 'astro/config';
import { deployment, seoContext, workflowTarget } from './src/lib/seo.ts';

const target = deployment(process.env.SITE_BUILD_TARGET);
// In Actions a production build also needs the run itself to qualify: main, push or manual run,
// and the repository variable SITE_DEPLOY_TARGET=production. Pull requests always fail here.
if (
  target.target === 'production' &&
  process.env.GITHUB_ACTIONS === 'true' &&
  workflowTarget(
    process.env.GITHUB_EVENT_NAME ?? '',
    process.env.GITHUB_REF ?? '',
    process.env.SITE_DEPLOY_TARGET,
  ) !== 'production'
) {
  throw new Error(
    'GitHub Actions builds production only on main with SITE_DEPLOY_TARGET=production',
  );
}

export default defineConfig({
  site: target.site,
  base: target.base,
  output: 'static',
  outDir: `./${target.outDir}/`,
  trailingSlash: 'always',
  compressHTML: true,
  experimental: { parallelPrerender: { workers: 2 } },
  build: { inlineStylesheets: 'auto' },
  vite: {
    define: { 'import.meta.env.SITE_BUILD_TARGET': JSON.stringify(target.target) },
  },
  integrations: [
    {
      name: 'trusted-seo-target',
      hooks: {
        'astro:config:done': ({ config }) => {
          seoContext(target.target, config.site ? new URL(config.site) : undefined, config.base);
        },
      },
    },
  ],
});

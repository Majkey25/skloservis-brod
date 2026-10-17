// @ts-check
import { defineConfig } from 'astro/config';
import { deployment, seoContext } from './src/lib/seo.ts';

const target = deployment(process.env.SITE_BUILD_TARGET);
if (target.target === 'production' && process.env.GITHUB_ACTIONS === 'true') {
  throw new Error(
    'GitHub Actions publishes previews only; production builds are local preparation',
  );
}

export default defineConfig({
  site: target.site,
  base: target.base,
  output: 'static',
  outDir: target.target === 'production' ? './.reference/build-production/' : './dist/',
  trailingSlash: 'always',
  compressHTML: true,
  build: { inlineStylesheets: 'always' },
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

// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://majkey25.github.io',
  base: '/skloservis-brod',
  output: 'static',
  trailingSlash: 'always',
  compressHTML: true,
  build: { inlineStylesheets: 'always' },
});

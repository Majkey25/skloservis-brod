import config from '../../astro.config.mjs';

console.log(
  JSON.stringify({
    site: config.site,
    base: config.base,
    outDir: config.outDir,
    target: config.vite.define['import.meta.env.SITE_BUILD_TARGET'],
  }),
);

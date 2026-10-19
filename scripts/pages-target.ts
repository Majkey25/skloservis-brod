// Selects the Pages target for this workflow run and hands it to later steps.
// The single control is the repository variable SITE_DEPLOY_TARGET; see docs/nasazeni.md.
import { appendFileSync } from 'node:fs';
import { deployment, workflowTarget } from '../src/lib/seo.ts';

const target = workflowTarget(
  process.env.GITHUB_EVENT_NAME ?? '',
  process.env.GITHUB_REF ?? '',
  process.env.SITE_DEPLOY_TARGET,
);
const { outDir } = deployment(target);
console.log(`Pages target: ${target} (artifact ${outDir})`);
if (process.env.GITHUB_OUTPUT) {
  appendFileSync(process.env.GITHUB_OUTPUT, `target=${target}\nout=${outDir}\n`);
}

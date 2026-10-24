import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const checker = fileURLToPath(new URL('../scripts/check-codeql.mjs', import.meta.url));
const scratch = resolve('.reference/tmp');

// Reduced from CodeQL 2.27.3 SARIF with --sarif-group-rules-by-pack.
function scan(language) {
  return {
    version: '2.1.0',
    runs: [
      {
        tool: {
          driver: { name: 'CodeQL', rules: [] },
          extensions: [
            {
              name: `codeql/${language}-queries`,
              rules: [
                {
                  id: 'fixture/rule',
                  defaultConfiguration: { level: 'warning' },
                  properties: { tags: ['security'], 'security-severity': '6.9' },
                },
              ],
            },
            { name: 'codeql/threat-models' },
          ],
        },
        invocations: [
          {
            executionSuccessful: true,
            toolExecutionNotifications: [{ level: 'none', message: { text: '' } }],
          },
        ],
        results: [
          {
            ruleId: 'fixture/rule',
            rule: { id: 'fixture/rule', index: 0, toolComponent: { index: 0 } },
            message: { text: 'Fixture finding' },
            locations: [{ physicalLocation: { artifactLocation: { uri: 'fixture.js' } } }],
          },
        ],
      },
    ],
  };
}

test('CodeQL gate enforces thresholds and rejects incomplete or uninterpretable scans', async (t) => {
  await mkdir(scratch, { recursive: true });
  const root = await mkdtemp(join(scratch, 'codeql-'));
  t.after(async () => {
    assert.equal(dirname(root), scratch);
    await rm(root, { recursive: true, force: true });
  });
  const execute = (path = root) =>
    spawnSync(process.execPath, [checker, path], { encoding: 'utf8' });
  const save = (language, data) => writeFile(join(root, `${language}.sarif`), JSON.stringify(data));
  const check = async (label, change, passes = false, diagnostic) => {
    await t.test(label, async () => {
      const data = scan('javascript');
      const run = data.runs[0];
      change(run, run.tool.extensions[0].rules[0], run.results[0], data);
      await save('javascript', data);
      const result = execute();
      assert.equal(result.status, passes ? 0 : 1, result.stderr);
      if (passes) assert.match(result.stdout, /CodeQL thresholds passed/);
      if (diagnostic) assert.match(result.stderr, diagnostic);
    });
  };
  await save('actions', scan('actions'));
  await check('medium warning passes', () => {}, true);
  await check(
    'clean scans have empty results, not empty files',
    (run) => {
      run.results = [];
    },
    true,
  );
  for (const score of ['7.0', '9.8']) {
    await check(
      `security warning at ${score} blocks a finding`,
      (_, rule) => {
        rule.properties['security-severity'] = score;
      },
      false,
      /CodeQL blocked 1 high\/critical security or error-level findings/,
    );
  }
  await check('non-security inherited error fails', (_, rule) => {
    rule.properties = {};
    rule.defaultConfiguration.level = 'error';
  });
  await check('explicit error overrides warning', (_, __, result) => {
    result.level = 'error';
  });
  await check(
    'explicit warning overrides inherited error',
    (_, rule, result) => {
      rule.defaultConfiguration.level = 'error';
      result.level = 'warning';
    },
    true,
  );
  await check(
    'absent levels default to warning',
    (_, rule) => {
      delete rule.defaultConfiguration;
    },
    true,
  );
  await check('driver rule references also enforce errors', (run, rule, result) => {
    run.tool.driver.rules = [{ id: 'driver/error', defaultConfiguration: { level: 'error' } }];
    result.ruleId = 'driver/error';
    result.ruleIndex = 0;
    delete result.rule;
  });
  await check('suppression and baseline do not waive high findings', (_, rule, result) => {
    rule.properties['security-severity'] = '7.8';
    result.suppressions = [{ kind: 'inSource', status: 'accepted' }];
    result.baselineState = 'unchanged';
  });
  for (const score of ['unknown', '', null, 7, '-1', '10.1']) {
    await check(`invalid security score ${JSON.stringify(score)} fails`, (_, rule) => {
      rule.properties['security-severity'] = score;
    });
  }
  await check('security rule without score fails', (_, rule) => {
    delete rule.properties['security-severity'];
  });
  await check('unknown result level fails', (_, __, result) => {
    result.level = 'critical';
  });
  await check('null rule metadata fails', (_, rule) => {
    rule.properties = null;
  });
  await check('unresolved rule index fails', (_, __, result) => {
    result.rule.index = 9;
  });
  await check('null rule index fails', (_, __, result) => {
    result.rule.index = null;
  });
  await check('unknown result kind fails', (_, __, result) => {
    result.kind = 'unknown';
  });
  await check('conflicting rule IDs fail', (_, __, result) => {
    result.ruleId = 'different';
  });
  await check('unresolved tool component fails', (_, __, result) => {
    result.rule.toolComponent.index = 9;
  });
  await check('failed invocation fails', (run) => {
    run.invocations[0].executionSuccessful = false;
  });
  await check('execution error notification fails', (run) => {
    run.invocations[0].toolExecutionNotifications[0].level = 'error';
  });
  await check('unsupported rule override fails', (run) => {
    run.invocations[0].ruleConfigurationOverrides = [{ configuration: { level: 'error' } }];
  });
  await check('external SARIF data fails', (run) => {
    run.externalPropertyFileReferences = {};
  });
  await check('missing results fails', (run) => {
    delete run.results;
  });
  await check('empty rules fails', (run) => {
    run.tool.extensions[0].rules = [];
  });
  await check('wrong language output fails', (run) => {
    run.tool.extensions[0].name = 'codeql/actions-queries';
  });
  await check('empty runs fails', (_, __, ___, data) => {
    data.runs = [];
  });
  await check('unknown SARIF version fails', (_, __, ___, data) => {
    data.version = '3.0';
  });

  await save('javascript', scan('javascript'));
  const actions = scan('actions');
  actions.runs[0].tool.extensions[0].rules[0].properties['security-severity'] = '9.8';
  await save('actions', actions);
  assert.equal(execute().status, 1, 'Actions findings must also block');
  await save('actions', scan('actions'));
  for (const invalid of ['', '{broken', '{}']) {
    await writeFile(join(root, 'javascript.sarif'), invalid);
    assert.equal(execute().status, 1, 'Empty or malformed SARIF must fail');
  }
  await rm(join(root, 'javascript.sarif'));
  assert.equal(execute().status, 1, 'Missing one language must fail');
  await rm(join(root, 'actions.sarif'));
  assert.equal(execute().status, 1, 'Empty output directory must fail');
  assert.equal(execute(join(root, 'missing')).status, 1, 'Missing output directory must fail');
});

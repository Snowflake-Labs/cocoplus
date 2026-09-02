#!/usr/bin/env node
'use strict';

const assert = require('assert');
const childProcess = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '..', '..');

function run(cmd, args, options = {}) {
  return childProcess.spawnSync(cmd, args, {
    cwd: options.cwd || REPO_ROOT,
    encoding: 'utf8',
    input: options.input,
    env: { ...process.env, ...(options.env || {}) },
    shell: false,
  });
}

function copyDir(src, dst) {
  fs.mkdirSync(dst, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dst, entry.name);
    if (entry.isDirectory()) copyDir(from, to);
    else fs.copyFileSync(from, to);
  }
}

function tempRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cocoplus-regression-'));
  copyDir(path.join(REPO_ROOT, '.cortex', 'scripts'), path.join(dir, '.cortex', 'scripts'));
  copyDir(path.join(REPO_ROOT, '.cortex', 'hooks'), path.join(dir, '.cortex', 'hooks'));
  copyDir(path.join(REPO_ROOT, '.cortex', 'agents'), path.join(dir, '.cortex', 'agents'));
  run('git', ['init', '--quiet'], { cwd: dir });
  run('git', ['config', 'user.email', 'test@example.com'], { cwd: dir });
  run('git', ['config', 'user.name', 'CocoPlus Test'], { cwd: dir });
  fs.mkdirSync(path.join(dir, '.cocoplus'), { recursive: true });
  return dir;
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf8');
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}

test('plugin manifest declares only existing skills and scripts', () => {
  const plugin = readJson(path.join(REPO_ROOT, '.cortex-plugin', 'plugin.json'));
  const missing = [];
  for (const skill of plugin.skills || []) {
    if (!fs.existsSync(path.join(REPO_ROOT, skill))) missing.push(`skill:${skill}`);
  }
  for (const script of plugin.scripts || []) {
    if (!fs.existsSync(path.join(REPO_ROOT, script))) missing.push(`script:${script}`);
  }
  assert.deepStrictEqual(missing, []);
});

test('plugin manifest declares every user-facing skill file and packaged template', () => {
  const plugin = readJson(path.join(REPO_ROOT, '.cortex-plugin', 'plugin.json'));
  assert.ok(plugin.skills.includes('./.cortex/skills'));

  const declaredTemplates = new Set(plugin.templates || []);
  const requiredTemplates = [
    'templates/cocoplus.toml.template',
    'templates/monitors/narrator.monitor.json',
    'templates/monitors/cost-tracker.monitor.json',
    'templates/monitors/quality-advisor.monitor.json',
    'templates/monitors/memory-capture.monitor.json',
  ];
  const missingTemplates = requiredTemplates.filter((templatePath) => !declaredTemplates.has(templatePath) || !fs.existsSync(path.join(REPO_ROOT, templatePath)));
  assert.deepStrictEqual(missingTemplates, []);

  assert.ok(!plugin.templates.some((templatePath) => templatePath.replace(/\\/g, '/').startsWith('templates/scripts/')));
  for (const scriptPath of [
    '.cortex/scripts/rollback.js',
    '.cortex/scripts/scope-classify.js',
    '.cortex/scripts/spec-validator.js',
    '.cortex/scripts/alignment-check.js',
  ]) {
    assert.ok(plugin.scripts.includes(scriptPath), `${scriptPath} should be registered as a runtime script`);
  }
});

test('contract gate blocks uncommitted outcome contracts', () => {
  const dir = tempRepo();
  fs.mkdirSync(path.join(dir, 'outcomes', 'foo'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'outcomes', 'foo', 'contract.md'), '# Contract\n', 'utf8');
  const result = run(process.execPath, ['.cortex/scripts/contract-gate.js', '--command', 'spec', '--function', 'foo'], { cwd: dir });
  assert.notStrictEqual(result.status, 0);
  assert.match(result.stdout, /BLOCK/);
});

test('source hash handles shell metacharacters without invoking shell parsing', () => {
  const dir = tempRepo();
  fs.writeFileSync(path.join(dir, 'foo;bad.sql'), 'select 1;\n', 'utf8');
  run('git', ['add', '.'], { cwd: dir });
  run('git', ['commit', '-m', 'init'], { cwd: dir });
  const script = 'const {sourceHash}=require("./.cortex/scripts/_contract-hash.js"); console.log(sourceHash("foo;bad"))';
  const result = run(process.execPath, ['-e', script], { cwd: dir });
  assert.strictEqual(result.status, 0, result.stderr);
  assert.match(result.stdout.trim(), /^[a-f0-9]{64}$/);
});

test('contract ci executes archived check commands and fails regressions', () => {
  const dir = tempRepo();
  fs.writeFileSync(path.join(dir, 'foo.sql'), 'select 1;\n', 'utf8');
  run('git', ['add', '.'], { cwd: dir });
  run('git', ['commit', '-m', 'init'], { cwd: dir });
  fs.mkdirSync(path.join(dir, 'outcomes', 'foo'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'outcomes', 'foo', 'contract.md'), '# Contract\n', 'utf8');
  const hash = run(process.execPath, ['-e', 'const {sourceHash}=require("./.cortex/scripts/_contract-hash.js"); console.log(sourceHash("foo"))'], { cwd: dir }).stdout.trim();
  writeJson(path.join(dir, '.cocoplus', 'contract-evidence.json'), {
    foo: {
      tier: 'e2e',
      result: 'pass',
      source_hash: hash,
      check_command: [process.execPath, 'scripts/validate-cocoplus.js'],
    },
  });
  const result = run(process.execPath, ['.cortex/scripts/contract-prove.js', '--ci'], { cwd: dir });
  assert.notStrictEqual(result.status, 0);
  assert.match(result.stdout, /check command failed/i);
});

test('contract ci refuses unapproved archived check commands', () => {
  const dir = tempRepo();
  writeJson(path.join(dir, '.cocoplus', 'contract-evidence.json'), {
    malicious: {
      result: 'pass',
      check_command: ['powershell', '-NoProfile', '-Command', 'Write-Output unsafe'],
    },
  });
  const result = run(process.execPath, ['.cortex/scripts/contract-prove.js', '--ci'], { cwd: dir });
  assert.notStrictEqual(result.status, 0);
  assert.match(result.stderr, /not approved/i);
});

test('runtime policies support documented match schema, repeat escalation, and built-in overrides', () => {
  const dir = tempRepo();
  fs.writeFileSync(path.join(dir, 'cocoplus.toml'), '[safety]\nruntime_policy_engine = true\npolicy_log_all = true\nallow_custom_policy_overrides = true\n[run_policy]\nallow_irreversible_actions = true\n', 'utf8');
  fs.mkdirSync(path.join(dir, '.cocoplus', 'lifecycle', 'policies'), { recursive: true });
  fs.writeFileSync(path.join(dir, '.cocoplus', 'lifecycle', 'policies', 'copy-row-count.yaml'), [
    'name: row-count-before-copy',
    'decision: instruct',
    'escalate_on_repeat: true',
    'message: Validate source row count before COPY.',
    'match:',
    '  operations: [COPY INTO]',
    '  schemas: [DEV.PUBLIC.]',
  ].join('\n'), 'utf8');
  fs.writeFileSync(path.join(dir, '.cocoplus', 'lifecycle', 'policies', 'truncate-override.yaml'), [
    'name: block-truncate',
    'decision: allow',
    'match:',
    '  operations: [TRUNCATE]',
    '  schemas: [DEV.PUBLIC.]',
  ].join('\n'), 'utf8');

  const first = run(process.execPath, ['.cortex/hooks/pre-tool-use.js'], {
    cwd: dir,
    input: JSON.stringify({ tool: 'SnowflakeSqlExecute', parameters: { sql: 'COPY INTO DEV.PUBLIC.T FROM @STAGE' } }),
  });
  assert.strictEqual(first.status, 0, first.stderr);
  assert.match(first.stdout, /Validate source row count/);

  const repeat = run(process.execPath, ['.cortex/hooks/pre-tool-use.js'], {
    cwd: dir,
    input: JSON.stringify({ tool: 'SnowflakeSqlExecute', parameters: { sql: 'COPY INTO DEV.PUBLIC.T FROM @STAGE' } }),
  });
  assert.strictEqual(repeat.status, 0, repeat.stderr);
  assert.match(repeat.stdout, /"action":"block"/);
  assert.match(repeat.stdout, /escalated on repeat/);

  const override = run(process.execPath, ['.cortex/hooks/pre-tool-use.js'], {
    cwd: dir,
    input: JSON.stringify({ tool: 'SnowflakeSqlExecute', parameters: { sql: 'TRUNCATE TABLE DEV.PUBLIC.T' } }),
  });
  assert.strictEqual(override.status, 0, override.stderr);
  assert.strictEqual(JSON.parse(override.stdout).action, 'allow');
});

test('runtime policies skip unsafe regex and gate custom allow overrides with integrity logs', () => {
  const dir = tempRepo();
  fs.writeFileSync(path.join(dir, 'cocoplus.toml'), '[safety]\nruntime_policy_engine = true\npolicy_log_all = true\n[run_policy]\nallow_irreversible_actions = true\n', 'utf8');
  fs.mkdirSync(path.join(dir, '.cocoplus', 'lifecycle', 'policies'), { recursive: true });
  fs.writeFileSync(path.join(dir, '.cocoplus', 'lifecycle', 'policies', 'unsafe-regex.yaml'), [
    'name: unsafe-regex',
    'decision: instruct',
    'pattern: (a+)+$',
    'message: unsafe',
  ].join('\n'), 'utf8');
  fs.writeFileSync(path.join(dir, '.cocoplus', 'lifecycle', 'policies', 'allow-override.yaml'), [
    'name: block-truncate',
    'decision: allow',
    'match:',
    '  operations: [TRUNCATE]',
    '  schemas: [DEV.PUBLIC.]',
  ].join('\n'), 'utf8');

  const unsafeRegex = run(process.execPath, ['.cortex/hooks/pre-tool-use.js'], {
    cwd: dir,
    input: JSON.stringify({ tool: 'SnowflakeSqlExecute', parameters: { sql: `${'a'.repeat(64)}!` } }),
  });
  assert.strictEqual(unsafeRegex.status, 0, unsafeRegex.stderr);
  assert.doesNotMatch(unsafeRegex.stdout, /unsafe/);
  assert.match(fs.readFileSync(path.join(dir, '.cocoplus', 'hook-log.jsonl'), 'utf8'), /unsafe_regex/);

  const gatedAllow = run(process.execPath, ['.cortex/hooks/pre-tool-use.js'], {
    cwd: dir,
    input: JSON.stringify({ tool: 'SnowflakeSqlExecute', parameters: { sql: 'TRUNCATE TABLE DEV.PUBLIC.T' } }),
  });
  assert.strictEqual(gatedAllow.status, 0, gatedAllow.stderr);
  assert.match(gatedAllow.stdout, /"action":"block"/);
  const policyLog = fs.readFileSync(path.join(dir, '.cocoplus', 'lifecycle', 'policy-decisions.jsonl'), 'utf8');
  assert.match(policyLog, /source_sha256/);
  assert.match(policyLog, /custom_allow_override_disabled/);
});

test('recall imports jsonl, stores real source path, supports function and show modes', () => {
  const dir = tempRepo();
  const source = path.join(dir, 'transcripts');
  fs.mkdirSync(source, { recursive: true });
  const session = {
    session_id: 'sess-json',
    start_time: '2026-07-01T00:00:00Z',
    turns: [{ role: 'user', text: 'Optimize classify_sentiment for invoices' }],
    tool_calls: [{ name: 'SnowflakeSqlExecute' }],
    functions_touched: ['classify_sentiment'],
    evaluation_results: [{ metric: 'accuracy', value: 0.91 }],
    outcome_contracts: [{ function: 'classify_sentiment', status: 'proved', outcome_type: 'classification' }],
    strategy_ids: ['strat-a'],
    key_decisions: ['Use reference set A'],
  };
  fs.writeFileSync(path.join(source, 'sess-json.jsonl'), JSON.stringify(session) + '\n', 'utf8');
  fs.mkdirSync(path.join(dir, 'cocoplus'), { recursive: true });
  writeJson(path.join(dir, 'cocoplus', 'recall-sources.json'), { sources: [source] });
  const importResult = run(process.execPath, ['.cortex/scripts/recall-import.js', '--import'], { cwd: dir });
  assert.strictEqual(importResult.status, 0, importResult.stderr);
  const query = run(process.execPath, ['.cortex/scripts/recall-import.js', '--query', 'invoice', '--function', 'classify_sentiment'], { cwd: dir });
  assert.strictEqual(query.status, 0, query.stderr);
  const payload = JSON.parse(query.stdout);
  assert.strictEqual(payload.results[0].source_exists, true);
  assert.match(payload.results[0].source_path, /sess-json\.jsonl$/);
  const shown = run(process.execPath, ['.cortex/scripts/recall-import.js', '--show', 'sess-json'], { cwd: dir });
  assert.strictEqual(shown.status, 0, shown.stderr);
  assert.match(shown.stdout, /classify_sentiment/);
});

test('refine update rejects attribution references that do not exist', () => {
  const dir = tempRepo();
  const input = path.join(dir, 'strategy.json');
  writeJson(input, {
    id: 's1',
    name: 'Strategy',
    task_type: 'classification',
    data_characteristics: 'invoices',
    quality_constraint: 'correctness',
    content: 'Use reference-labelled examples.',
    attribution: {
      session_id: 'sess-1',
      evidence_reference: 'contract:missing',
      function_version_hash: 'abc',
    },
  });
  const result = run(process.execPath, ['.cortex/scripts/refine-update.js', '--op', 'add', '--file', input], { cwd: dir });
  assert.notStrictEqual(result.status, 0);
  assert.match(result.stderr, /Evidence attribution/i);
});

test('pivot merge supports clear and skip-partial', () => {
  const dir = tempRepo();
  const lifecycle = path.join(dir, '.cocoplus', 'lifecycle');
  fs.mkdirSync(lifecycle, { recursive: true });
  fs.writeFileSync(path.join(lifecycle, 'FINDINGS.md'), '# Old\n', 'utf8');
  const clear = run(process.execPath, ['.cortex/scripts/pivot-merge.js', 'clear'], { cwd: dir });
  assert.strictEqual(clear.status, 0, clear.stderr);
  assert.ok(fs.existsSync(path.join(lifecycle, 'findings-archive')));
  writeJson(path.join(dir, '.cocoplus', 'pod-status.json'), [
    { pod: 'data-engineer', status: 'PARTIAL', timestamp: '2026-07-01T00:00:00Z', duration_seconds: 1, findings_count: 1, skipped_checks: ['x'], findings: [{ id: 'P1', file: 'a.sql', line: 1, issue_type: 'x', severity: 'BLOCKING', priority: 'P1', effort: 'S', description: 'partial', snippet: 'x' }] },
    { pod: 'data-steward', status: 'COMPLETE', timestamp: '2026-07-01T00:00:01Z', duration_seconds: 1, findings_count: 1, findings: [{ id: 'C1', file: 'b.sql', line: 1, issue_type: 'y', severity: 'IMPORTANT', priority: 'P2', effort: 'S', description: 'complete', snippet: 'y' }] },
  ]);
  const merge = run(process.execPath, ['.cortex/scripts/pivot-merge.js', 'run', '--skip-partial'], { cwd: dir });
  assert.strictEqual(merge.status, 0, merge.stderr);
  const findings = fs.readFileSync(path.join(lifecycle, 'FINDINGS.md'), 'utf8');
  assert.match(findings, /complete/);
  assert.doesNotMatch(findings, /partial/);
  const show = run(process.execPath, ['.cortex/scripts/pivot-merge.js', 'show'], { cwd: dir });
  assert.strictEqual(show.status, 0, show.stderr);
  assert.match(show.stdout, /complete/);
  const status = run(process.execPath, ['.cortex/scripts/pivot-merge.js', 'status'], { cwd: dir });
  assert.strictEqual(status.status, 0, status.stderr);
  const summary = JSON.parse(status.stdout);
  assert.strictEqual(summary.unique_findings, 1);
  assert.strictEqual(summary.by_priority.P2, 1);
});

test('ops thesis updater reads current and legacy DORA metric keys', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cocoplus-ops-'));
  const opsDir = path.join(dir, '.cocoplus', 'ops');
  fs.mkdirSync(opsDir, { recursive: true });
  writeJson(path.join(opsDir, 'dora-snapshot.json'), {
    metrics: {
      run_frequency: { value: 2, unit: 'per_day', tier: 'High' },
      data_availability_lead: { value: 4, unit: 'hours', tier: 'High' },
      recovery_time: { value: 30, unit: 'minutes', tier: 'Elite' },
      data_quality_failure_rate: { value: 3, unit: 'percent', tier: 'Elite' },
    },
    overall_health: 'High',
  });
  const result = run(process.execPath, [path.join(REPO_ROOT, '.cortex', 'scripts', 'ops-thesis-updater.js'), '--ops-dir', opsDir], { cwd: dir });
  assert.strictEqual(result.status, 0, result.stderr);
  const thesis = fs.readFileSync(path.join(opsDir, 'dora-thesis.md'), 'utf8');
  assert.match(thesis, /Pipeline Run Frequency \| 2 per_day \| High/);
  assert.match(thesis, /Data Availability Lead \| 4 hours \| High/);
  assert.match(thesis, /Failure Recovery Time \| 30 minutes \| Elite/);
  assert.match(thesis, /Data Quality Failure Rate \| 3 percent \| Elite/);
});

test('report export creates markdown and html while reporting pdf renderer absence', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cocoplus-export-'));
  const source = path.join(dir, 'report.md');
  fs.writeFileSync(source, '# Review\n\nFinding: **ok**\n', 'utf8');
  const markdown = run(process.execPath, [path.join(REPO_ROOT, '.cortex', 'scripts', 'report-export.js'), '--source', source, '--format', 'markdown', '--out-dir', path.join(dir, 'exports')], { cwd: dir });
  assert.strictEqual(markdown.status, 0, markdown.stderr);
  const markdownPayload = JSON.parse(markdown.stdout);
  assert.strictEqual(markdownPayload.format, 'markdown');
  assert.ok(fs.existsSync(markdownPayload.output_path));
  const html = run(process.execPath, [path.join(REPO_ROOT, '.cortex', 'scripts', 'report-export.js'), '--source', source, '--format', 'html', '--out-dir', path.join(dir, 'exports')], { cwd: dir });
  assert.strictEqual(html.status, 0, html.stderr);
  const htmlPayload = JSON.parse(html.stdout);
  assert.strictEqual(htmlPayload.format, 'html');
  assert.match(fs.readFileSync(htmlPayload.output_path, 'utf8'), /<main>/);
  const pdf = run(process.execPath, [path.join(REPO_ROOT, '.cortex', 'scripts', 'report-export.js'), '--source', source, '--format', 'pdf', '--out-dir', path.join(dir, 'exports')], { cwd: dir });
  assert.strictEqual(pdf.status, 0, pdf.stderr);
  const pdfPayload = JSON.parse(pdf.stdout);
  assert.strictEqual(pdfPayload.status, 'renderer_unavailable');
  assert.match(pdfPayload.message, /PDF renderer/);
});

test('chargeback refresh strips reminders, resolves cost centers, and invoices dual credits', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cocoplus-chargeback-'));
  const input = path.join(dir, 'chargeback.json');
  writeJson(input, {
    includeWarehouse: true,
    creditRate: 3,
    cost_center_map: { alice: 'FINANCE' },
    user_tags: { bob: 'ENG' },
    role_cost_centers: { ANALYST: 'DATA' },
    spans: [{ name: 'CodingAgent.Step-0' }],
    records: [
      { user: 'alice', role: 'ADMIN', surface: 'cli', query_source: 'agent', token_credits: 1, warehouse_credits: 2, prompt: '<system-reminder>ignore</system-reminder>\nReal prompt', tool_calls: [{ name: 'SnowflakeSqlExecute', args: { sql: 'select 1' } }] },
      { user: 'bob', role: 'DEV', surface: 'desktop', query_source: 'agent', token_credits: 1, warehouse_credits: 0.5, prompt: 'Bob prompt' },
      { user: 'carol', role: 'ANALYST', surface: 'snowsight', query_source: 'agent', token_credits: 0.25, warehouse_credits: 0.25, prompt: 'Carol prompt' },
      { user: 'dana', role: 'UNKNOWN', surface: 'cli', query_source: 'agent', token_credits: 0.25, warehouse_credits: 0, prompt: 'Dana prompt' },
      { user: 'SYSTEM', role: 'SYS', surface: 'cli', query_source: 'agent', token_credits: 99, warehouse_credits: 99, prompt: 'system' },
      { user: 'erin', role: 'DEV', surface: 'sandbox', query_source: 'agent', token_credits: 99, warehouse_credits: 99, prompt: 'sandbox' },
      { user: 'frank', role: 'DEV', surface: 'cli', query_source: 'background_metadata', token_credits: 99, warehouse_credits: 99, prompt: 'background' },
    ],
  });
  const result = run(process.execPath, [path.join(REPO_ROOT, '.cortex', 'scripts', 'chargeback-refresh.js'), '--input', input], { cwd: dir });
  assert.strictEqual(result.status, 0, result.stderr);
  const payload = JSON.parse(result.stdout);
  assert.strictEqual(payload.excluded_records, 3);
  assert.strictEqual(payload.records[0].prompt, 'Real prompt');
  assert.strictEqual(payload.records[0].extracted_sql[0], 'select 1');
  assert.strictEqual(payload.records.find(r => r.user === 'alice').cost_center, 'FINANCE');
  assert.strictEqual(payload.records.find(r => r.user === 'bob').cost_center, 'ENG');
  assert.strictEqual(payload.records.find(r => r.user === 'carol').cost_center, 'DATA');
  assert.strictEqual(payload.records.find(r => r.user === 'dana').cost_center, 'UNMAPPED');
  assert.strictEqual(payload.totals.total_credits, 5.25);
  assert.strictEqual(payload.invoices.find(i => i.user === 'alice').amount, 9);
  assert.deepStrictEqual(payload.onboarding.unmappedUsers, ['dana']);
  assert.strictEqual(payload.onboarding.spansPresent, true);
});

test('trace health grader computes grades and thermal receipt deltas', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cocoplus-health-'));
  const before = path.join(dir, 'before.json');
  const after = path.join(dir, 'after.json');
  writeJson(before, {
    objects: [
      { name: 'A', type: 'view', callers: [], queries_90d: 0, layer: 'staging', consumers: ['bi'], modified_count: 10, security_findings: 1 },
      { name: 'B', type: 'udf', callers: [], queries_90d: 0, layer: 'raw', updated_by: 'app', modified_count: 8 },
      { name: 'C', type: 'table', callers: ['A'], queries_90d: 10, layer: 'prod', accessed_by: ['dev'], modified_count: 1 },
    ],
    edges: [{ from: 'A', to: 'B' }, { from: 'B', to: 'A' }],
  });
  writeJson(after, {
    objects: [
      { name: 'A', type: 'view', callers: ['C'], queries_90d: 5, layer: 'staging', consumers: [], modified_count: 2 },
      { name: 'B', type: 'udf', callers: ['A'], queries_90d: 2, layer: 'raw', modified_count: 1 },
      { name: 'C', type: 'table', callers: ['A'], queries_90d: 10, layer: 'prod', accessed_by: [], modified_count: 1 },
    ],
    edges: [{ from: 'A', to: 'B' }],
  });
  const scored = run(process.execPath, [path.join(REPO_ROOT, '.cortex', 'scripts', 'health-grader.js'), '--input', before], { cwd: dir });
  assert.strictEqual(scored.status, 0, scored.stderr);
  const payload = JSON.parse(scored.stdout);
  assert.ok(payload.grade);
  assert.ok(payload.metrics.dead_assets > 0);
  assert.ok(payload.metrics.circular_dependencies > 0);
  const compared = run(process.execPath, [path.join(REPO_ROOT, '.cortex', 'scripts', 'health-grader.js'), '--compare', before, after], { cwd: dir });
  assert.strictEqual(compared.status, 0, compared.stderr);
  const comparison = JSON.parse(compared.stdout);
  assert.match(comparison.receipt, /blast radius \d+ -> \d+ v/);
  assert.match(comparison.receipt, /health [A-F][+-]? -> [A-F][+-]? \^/);
});

test('wisdom evidence gate, must-keep, forget, and density rules are deterministic', () => {
  const dir = tempRepo();
  const candidate = path.join(dir, 'candidate.json');
  writeJson(candidate, {
    observations: [
      { session_id: 's1', confirmed: true },
      { session_id: 's2', confirmed: true },
    ],
    previous_text: 'Use explicit joins.',
    candidate_text: 'Use explicit joins. Add ownership rationale.',
    previous_entry_count: 1,
    candidate_entry_count: 1,
  });
  const rejected = run(process.execPath, ['.cortex/scripts/wisdom-route.js', '--candidate', candidate], { cwd: dir });
  assert.notStrictEqual(rejected.status, 0);
  assert.match(rejected.stderr, /at least 3 distinct confirmed sessions/i);
  writeJson(candidate, {
    observations: [
      { session_id: 's1', confirmed: true },
      { session_id: 's2', confirmed: true },
      { session_id: 's3', confirmed: true },
    ],
    previous_text: 'Use explicit joins.',
    candidate_text: 'Use explicit joins. Add ownership rationale.',
    previous_entry_count: 1,
    candidate_entry_count: 1,
  });
  const densityRejected = run(process.execPath, ['.cortex/scripts/wisdom-route.js', '--candidate', candidate], { cwd: dir });
  assert.notStrictEqual(densityRejected.status, 0);
  assert.match(densityRejected.stderr, /denser-not-larger/i);
  writeJson(candidate, {
    observations: [
      { session_id: 's1', confirmed: true },
      { session_id: 's2', confirmed: true },
      { session_id: 's3', confirmed: true },
    ],
    previous_text: 'Use explicit joins. Add owner context.',
    candidate_text: 'Use explicit joins.',
    previous_entry_count: 2,
    candidate_entry_count: 1,
  });
  const accepted = run(process.execPath, ['.cortex/scripts/wisdom-route.js', '--candidate', candidate], { cwd: dir });
  assert.strictEqual(accepted.status, 0, accepted.stderr);
  assert.strictEqual(JSON.parse(accepted.stdout).accepted, true);
  const keep = run(process.execPath, ['.cortex/scripts/wisdom-route.js', '--keep', '--id', 'W1', '--text', 'Never drop raw data without approval.'], { cwd: dir });
  assert.strictEqual(keep.status, 0, keep.stderr);
  assert.match(fs.readFileSync(path.join(dir, '.cocoplus', 'wisdom', 'must-keep.md'), 'utf8'), /W1/);
  const forget = run(process.execPath, ['.cortex/scripts/wisdom-route.js', '--forget', '--id', 'W1', '--rationale', 'Merged into stricter rule'], { cwd: dir });
  assert.strictEqual(forget.status, 0, forget.stderr);
  assert.match(fs.readFileSync(path.join(dir, '.cocoplus', 'wisdom', 'consolidation-log.md'), 'utf8'), /Merged into stricter rule/);
});

test('model tier resolution has no silent fallback and noop check logs skipped work', () => {
  const dir = tempRepo();
  fs.writeFileSync(path.join(dir, 'cocoplus.toml'), '[model_tiers]\nsmol = "claude-haiku"\nregular = "claude-sonnet"\nunavailable = ["ultra"]\n', 'utf8');
  const missing = run(process.execPath, ['.cortex/scripts/model-tier-resolve.js', '--config', 'cocoplus.toml', '--tier', 'ultra'], { cwd: dir });
  assert.notStrictEqual(missing.status, 0);
  assert.match(missing.stderr, /no silent fallback/i);
  const ok = run(process.execPath, ['.cortex/scripts/model-tier-resolve.js', '--config', 'cocoplus.toml', '--tier', 'regular'], { cwd: dir });
  assert.strictEqual(ok.status, 0, ok.stderr);
  assert.strictEqual(JSON.parse(ok.stdout).model, 'claude-sonnet');
  const state = path.join(dir, 'noop-state.json');
  writeJson(state, { changed_files: [], pending_checkpoints: [] });
  const noop = run(process.execPath, ['.cortex/scripts/noop-check.js', '--state', state], { cwd: dir });
  assert.strictEqual(noop.status, 0, noop.stderr);
  assert.strictEqual(JSON.parse(noop.stdout).noop, true);
  assert.ok(fs.existsSync(path.join(dir, '.cocoplus', 'flow', 'noop-log.jsonl')));
});

test('refine update enforces structured mutation vocabulary for optimization rounds', () => {
  const dir = tempRepo();
  writeJson(path.join(dir, '.cocoplus', 'contract-evidence.json'), {
    classify: { result: 'pass', source_hash: 'abc' },
  });
  const input = path.join(dir, 'strategy.json');
  writeJson(input, {
    id: 's2',
    name: 'Strategy 2',
    task_type: 'classification',
    data_characteristics: 'tickets',
    quality_constraint: 'precision',
    content: 'Use labeled examples only.',
    optimization_round: true,
    mutation_strategy: 'add_example',
    changed_fields: ['content', 'quality_constraint'],
    evaluation_criteria: [{ score: 4 }],
    attribution: {
      session_id: 'sess-2',
      evidence_reference: 'contract:classify',
      function_version_hash: 'abc',
    },
  });
  const rejected = run(process.execPath, ['.cortex/scripts/refine-update.js', '--op', 'add', '--file', input], { cwd: dir });
  assert.notStrictEqual(rejected.status, 0);
  assert.match(rejected.stderr, /one-change-per-round/i);
  const acceptedInput = readJson(input);
  acceptedInput.changed_fields = ['content'];
  acceptedInput.evaluation_criteria = [{ name: 'precision_regression', expected: true }];
  writeJson(input, acceptedInput);
  const accepted = run(process.execPath, ['.cortex/scripts/refine-update.js', '--op', 'add', '--file', input], { cwd: dir });
  assert.strictEqual(accepted.status, 0, accepted.stderr);
  const sidecar = readJson(path.join(dir, 'cocoplus', 'strategies', 's2.json'));
  assert.strictEqual(sidecar.mutation_strategy, 'add_example');
  assert.deepStrictEqual(sidecar.changed_fields, ['content']);
});

test('audit events script appends manual entries and renders timeline', () => {
  const dir = tempRepo();
  fs.mkdirSync(path.join(dir, '.cocoplus', 'lifecycle'), { recursive: true });
  fs.mkdirSync(path.join(dir, '.cocoplus', 'modes'), { recursive: true });
  fs.writeFileSync(path.join(dir, '.cocoplus', 'modes', 'cocoaudit.on'), '', 'utf8');
  fs.writeFileSync(path.join(dir, '.cocoplus', 'lifecycle', 'audit.md'), '# CocoAudit\n\n', 'utf8');
  const added = run(process.execPath, ['.cortex/scripts/audit-events.js', 'add', 'Spec approved by data governance board'], { cwd: dir });
  assert.strictEqual(added.status, 0, added.stderr);
  const payload = JSON.parse(added.stdout);
  assert.strictEqual(payload.event, 'manual');
  const audit = fs.readFileSync(path.join(dir, '.cocoplus', 'lifecycle', 'audit.md'), 'utf8');
  assert.match(audit, /Manual Entry/);
  assert.match(audit, /Spec approved by data governance board/);
  const timeline = run(process.execPath, ['.cortex/scripts/audit-events.js', 'timeline'], { cwd: dir });
  assert.strictEqual(timeline.status, 0, timeline.stderr);
  assert.match(timeline.stdout, /Spec approved by data governance board/);
});

test('recipe metadata script lists discovery fields and stage preview', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cocoplus-recipe-'));
  const recipeDir = path.join(dir, 'recipes');
  fs.mkdirSync(recipeDir, { recursive: true });
  fs.writeFileSync(path.join(recipeDir, 'sample.json.template'), JSON.stringify({
    __recipe_meta: {
      name: 'sample',
      description: 'Sample recipe',
      category: 'analytics',
      estimated_time: '20 min',
      difficulty: 'easy',
      keywords: ['demo', 'test'],
    },
    stages: [{ name: 'Extract' }, { name: 'Load' }],
  }, null, 2), 'utf8');
  const listed = run(process.execPath, [path.join(REPO_ROOT, '.cortex', 'scripts', 'recipe-metadata.js'), '--dir', recipeDir], { cwd: dir });
  assert.strictEqual(listed.status, 0, listed.stderr);
  const payload = JSON.parse(listed.stdout);
  assert.strictEqual(payload.recipes[0].category, 'analytics');
  assert.strictEqual(payload.recipes[0].stage_count, 2);
  assert.deepStrictEqual(payload.recipes[0].stage_preview, ['Extract', 'Load']);
});

test('status envelope check parses yaml envelope from subagent output file', () => {
  const dir = tempRepo();
  const output = path.join(dir, 'subagent-output.md');
  fs.writeFileSync(output, [
    '---',
    'pod: review-pod',
    'status: PARTIAL',
    'timestamp: 2026-07-01T00:00:00Z',
    'duration_seconds: 3',
    'findings_count: 0',
    'errors: []',
    'skipped_checks: [security]',
    '---',
    'body',
  ].join('\n'), 'utf8');
  const result = run(process.execPath, ['.cortex/scripts/status-envelope-check.js', '--output-file', output], { cwd: dir });
  assert.strictEqual(result.status, 0, result.stderr);
  const records = readJson(path.join(dir, '.cocoplus', 'pod-status.json'));
  assert.strictEqual(records[0].pod, 'review-pod');
  assert.strictEqual(records[0].status, 'PARTIAL');
  assert.deepStrictEqual(records[0].skipped_checks, ['security']);
});

test('behavior maturity enforces declared maturity ceiling and autonomous-readiness L3 checklist', () => {
  const dir = tempRepo();
  fs.writeFileSync(path.join(dir, 'cocoplus.toml'), 'automation_maturity = "L1"\nkill_switch = true\nattempt_cap = 3\n', 'utf8');
  fs.mkdirSync(path.join(dir, '.cocoplus', 'modes'), { recursive: true });
  fs.writeFileSync(path.join(dir, '.cocoplus', 'modes', 'memory.on'), '');
  fs.writeFileSync(path.join(dir, '.cocoplus', 'modes', 'safety.normal'), '');
  const result = run(process.execPath, ['.cortex/scripts/behavior-maturity.js'], { cwd: dir });
  assert.strictEqual(result.status, 0, result.stderr);
  const maturity = readJson(path.join(dir, '.cocoplus', 'maturity.json'));
  assert.strictEqual(maturity.declared_level, 'L1');
  assert.strictEqual(maturity.level, 'L1');
  assert.ok(maturity.l3_checklist.some((item) => /kill switch/i.test(item.description)));
  assert.ok(maturity.l3_checklist.some((item) => /attempt cap/i.test(item.description)));
});

let failed = 0;
for (const { name, fn } of tests) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (err) {
    failed++;
    console.error(`FAIL ${name}`);
    console.error(err.stack || err.message);
  }
}

if (failed) {
  console.error(`\n${failed}/${tests.length} regression tests failed.`);
  process.exit(1);
}

console.log(`\n${tests.length}/${tests.length} regression tests passed.`);

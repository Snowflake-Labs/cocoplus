#!/usr/bin/env node
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const {
  COCOPLUS_DIR,
  ensureDir,
  isoUtc,
  lifecyclePath,
  loadConfig,
  readJson,
  writeJson,
} = require('../hooks/_v2-state.js');

const PANELS = ['home', 'flow', 'cost', 'quality', 'health', 'safety', 'memory', 'sessions', 'replay', 'settings', 'forge'];

function readText(filePath, fallback = '') {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (_) {
    return fallback;
  }
}

function safeJson(filePath, fallback = null) {
  return readJson(filePath, fallback);
}

function collectState() {
  const lifecycle = path.join(COCOPLUS_DIR, 'lifecycle');
  return {
    generated_at: isoUtc(),
    project: readText(path.join(COCOPLUS_DIR, 'project.md'), 'Project not initialized.'),
    meta: safeJson(path.join(lifecycle, 'meta.json'), {}),
    flow: safeJson(path.join(COCOPLUS_DIR, 'flow.json'), {}),
    pilot: safeJson(path.join(lifecycle, 'pilot-session.json'), {}),
    forge: safeJson(path.join(lifecycle, 'forge-state.json'), {}),
    leviathan: safeJson(path.join(lifecycle, 'leviathan-state.json'), {}),
    sessionProgress: readText(path.join(COCOPLUS_DIR, 'session', 'PROGRESS.md'), 'No CocoSession handoff recorded.'),
    sessionContext: readText(path.join(COCOPLUS_DIR, 'session', 'CONTEXT.md'), 'No predicate context recorded.'),
    sessionBudget: safeJson(path.join(COCOPLUS_DIR, 'session', 'iteration-budget.json'), {}),
    discoveries: readText(path.join(COCOPLUS_DIR, 'session', 'discoveries.jsonl'), 'No session discoveries recorded.'),
    stageEvidence: safeJson(path.join(COCOPLUS_DIR, 'session', 'stage-evidence.json'), {}),
    proposals: readText(path.join(COCOPLUS_DIR, 'proposals', 'proposal-log.jsonl'), 'No retained proposals recorded.'),
    routines: safeJson(path.join(COCOPLUS_DIR, 'routines', 'registry.json'), { routines: [] }),
    retrospective: readText(path.join(lifecycle, 'retrospective-ledger.jsonl'), 'No retrospective ledger recorded.'),
    governanceLog: readText(path.join(lifecycle, 'governance-log.json'), 'No governance events recorded.'),
    stageQuality: readText(path.join(COCOPLUS_DIR, 'sentinel', 'stage-quality.jsonl'), 'No stage quality scores recorded.'),
    findings: readText(path.join(lifecycle, 'FINDINGS.md'), 'No findings recorded.'),
    audit: readText(path.join(lifecycle, 'audit.md'), 'No audit trail recorded.'),
    health: safeJson(path.join(lifecycle, 'health-grade.json'), {}),
    sentinel: safeJson(path.join(lifecycle, 'sentinel-scores.json'), {}),
    meter: safeJson(path.join(COCOPLUS_DIR, 'meter', 'current-session.json'), {}),
    config: loadConfig(),
  };
}

function esc(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function panelCard(title, body) {
  return `<section class="panel-card"><h2>${esc(title)}</h2>${body}</section>`;
}

function renderPanel(panel, state) {
  const flowStages = Array.isArray(state.flow.stages) ? state.flow.stages : [];
  const cards = {
    home: [
      panelCard('Project', `<pre>${esc(state.project.slice(0, 2200))}</pre>`),
      panelCard('Lifecycle', `<p>Phase: <strong>${esc(state.meta.current_phase || 'not started')}</strong></p><p>Spec gate and advisory drift are read from lifecycle artifacts when present.</p>`),
      panelCard('Skill Surface Budget', `<p>Profile: <strong>${esc((state.config.session && state.config.session.skill_surface_budget) || 'standard')}</strong></p><p>Use the smallest profile that covers the session so context does not rot under unnecessary standing skills.</p>`),
      panelCard('Pilot', `<p>${state.pilot.active ? 'CocoPilot is active for this session.' : 'CocoPilot is inactive.'}</p>`),
    ],
    flow: [
      panelCard('Pipeline', `<p>${flowStages.length} stages found.</p><pre>${esc(JSON.stringify(state.flow, null, 2).slice(0, 4000))}</pre>`),
      panelCard('Stage Evidence', `<pre>${esc(JSON.stringify(state.stageEvidence, null, 2).slice(0, 3000))}</pre>`),
      panelCard('Stage Quality Scores', `<pre>${esc(state.stageQuality.slice(-4000))}</pre>`),
      panelCard('Scheduled Routines', `<pre>${esc(JSON.stringify(state.routines, null, 2).slice(0, 3000))}</pre>`),
      panelCard('HITL Gate Queue', '<p>HITL gates remain terminal-first; approve or resume from the CLI.</p>'),
    ],
    cost: [
      panelCard('Meter', `<pre>${esc(JSON.stringify(state.meter, null, 2))}</pre>`),
      panelCard('Chargeback', '<p>Generate invoice artifacts with <code>$meter invoice</code>; this panel reads generated status.</p>'),
    ],
    quality: [
      panelCard('Findings', `<pre>${esc(state.findings.slice(0, 5000))}</pre>`),
      panelCard('Contracts', '<p>Outcome contracts and evidence freshness are read from <code>outcomes/</code>.</p>'),
      panelCard('External Coach', `<pre>${esc(state.stageQuality.slice(-4000))}</pre>`),
    ],
    health: [
      panelCard('Health Grade', `<pre>${esc(JSON.stringify(state.health, null, 2))}</pre>`),
      panelCard('Dependency Graph', '<p>CocoMap and CocoTrace artifacts appear here when generated.</p>'),
    ],
    safety: [
      panelCard('Sentinel', `<pre>${esc(JSON.stringify(state.sentinel, null, 2))}</pre>`),
      panelCard('Governance', `<pre>${esc(JSON.stringify(state.config.governance || {}, null, 2))}</pre>`),
      panelCard('Live Governance Events', `<pre>${esc(state.governanceLog.slice(-5000))}</pre>`),
      panelCard('Session History Mode', `<p>${process.env.CORTEX_CODE_NO_HISTORY_MODE === 'true' || process.env.COCO_NO_HISTORY_MODE === 'true' ? 'Session history appears suppressed for this process.' : 'No private/no-history flag visible to this console process.'}</p>`),
      panelCard('Retrospective', `<pre>${esc(state.retrospective.slice(-4000))}</pre>`),
    ],
    memory: [
      panelCard('Wisdom and Recall', '<p>CocoWisdom, CocoRefine, CocoGrove, and CocoRecall artifacts are surfaced here without mutation.</p>'),
    ],
    sessions: [
      panelCard('Session Patterns', '<p>CocoOps, CocoHealth, and CocoCupper session metadata appears here as it is produced.</p>'),
      panelCard('CocoSession Handoff', `<pre>${esc(state.sessionProgress.slice(-4000))}</pre>`),
      panelCard('Iteration Budget', `<pre>${esc(JSON.stringify(state.sessionBudget, null, 2))}</pre>`),
      panelCard('Recommendation Signals', `<pre>${esc(state.discoveries.slice(-4000))}</pre>`),
      panelCard('Retained Proposals Queue', `<pre>${esc(state.proposals.slice(-4000))}</pre>`),
    ],
    replay: [
      panelCard('Predicate Context', `<pre>${esc(state.sessionContext.slice(-4000))}</pre>`),
      panelCard('Steps Timeline', `<pre>${esc(readText(path.join(COCOPLUS_DIR, 'session', 'steps.jsonl'), 'No steps timeline recorded.').slice(-5000))}</pre>`),
    ],
    settings: [
      panelCard('Configuration', `<pre>${esc(JSON.stringify(state.config, null, 2).slice(0, 5000))}</pre>`),
    ],
    forge: [
      panelCard('Forge State', `<pre>${esc(JSON.stringify(state.forge, null, 2))}</pre>`),
      panelCard('Refinement Ladder', `<pre>${esc(JSON.stringify(state.forge.refinement_ladder || { enabled: false }, null, 2))}</pre>`),
      panelCard('Activity', `<pre>${esc(readText(lifecyclePath('forge-activity.jsonl'), 'No forge activity yet.').slice(-5000))}</pre>`),
    ],
  };
  return (cards[panel] || cards.home).join('\n');
}

function renderHtml(panel, state) {
  const nav = PANELS.map((name) => `<a class="${name === panel ? 'active' : ''}" href="/${name === 'home' ? '' : name}">${esc(name)}</a>`).join('');
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="refresh" content="10">
  <title>CocoConsole</title>
  <style>
    body{margin:0;font:14px/1.5 system-ui,Segoe UI,Arial,sans-serif;background:#101418;color:#edf2f7}
    nav{position:fixed;inset:0 auto 0 0;width:210px;background:#161c22;padding:18px 12px;box-sizing:border-box;border-right:1px solid #28323d}
    nav strong{display:block;margin:0 8px 16px;font-size:18px}
    nav a{display:block;color:#aebecd;text-decoration:none;padding:9px 10px;border-radius:6px;text-transform:capitalize}
    nav a.active,nav a:hover{background:#243140;color:#fff}
    main{margin-left:210px;padding:24px;max-width:1180px}
    header{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;margin-bottom:18px}
    h1{font-size:28px;margin:0;text-transform:capitalize}
    .stamp{color:#9cadbd}
    .grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:14px}
    .panel-card{border:1px solid #2b3744;background:#151b21;border-radius:8px;padding:16px;min-width:0}
    .panel-card h2{font-size:16px;margin:0 0 10px}
    pre{white-space:pre-wrap;word-break:break-word;margin:0;color:#d6e2ee}
    code{color:#9be7c4}
  </style>
</head>
<body>
  <nav><strong>CocoConsole</strong>${nav}</nav>
  <main>
    <header><div><h1>${esc(panel)}</h1><p class="stamp">Read-only local control plane</p></div><div class="stamp">${esc(state.generated_at)}</div></header>
    <div class="grid">${renderPanel(panel, state)}</div>
  </main>
</body>
</html>`;
}

function start() {
  if (!fs.existsSync(COCOPLUS_DIR)) {
    console.error('CocoPlus not initialized in this directory. Run `$pod init` to begin.');
    process.exit(1);
  }
  const config = loadConfig();
  const port = Number(config.cocoplus && config.cocoplus.console_port) || 7779;
  const server = http.createServer((req, res) => {
    const raw = (req.url || '/').split('?')[0].replace(/^\/+/, '') || 'home';
    const panel = PANELS.includes(raw) ? raw : 'home';
    const state = collectState();
    if (raw === 'api/state') {
      res.writeHead(200, { 'content-type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(state, null, 2));
      return;
    }
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
    res.end(renderHtml(panel, state));
  });
  server.listen(port, '127.0.0.1', () => {
    ensureDir(path.join(COCOPLUS_DIR, 'lifecycle'));
    writeJson(lifecyclePath('console-state.json'), {
      running: true,
      port,
      url: `http://localhost:${port}/`,
      pid: process.pid,
      started_at: isoUtc(),
      panels: PANELS,
    });
    console.log(`CocoConsole running at http://localhost:${port}/`);
  });
}

if (require.main === module) {
  start();
}

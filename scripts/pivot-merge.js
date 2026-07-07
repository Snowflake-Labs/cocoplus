'use strict';

/**
 * pivot-merge.js — CocoPivot deterministic three-pass convergence engine
 *
 * Reads pod output records from .cocoplus/pod-status.json (written by
 * status-envelope-check.js at SubagentStop), applies a three-pass
 * deduplication algorithm, assigns inherited priority/effort/severity,
 * and writes lifecycle/FINDINGS.md (committed) + lifecycle/findings-state.json
 * (gitignored). No LLM at any step.
 *
 * pod-status.json schema (array): { pod, status, timestamp, duration_seconds,
 *   findings_count, errors: [], skipped_checks: [], findings: [
 *     { id, file, line, issue_type, severity, priority, effort, description,
 *       snippet, concern_class }
 *   ] }
 */

const path = require('path');
const fs = require('fs');

const COCOPLUS_DIR = path.resolve(process.cwd(), '.cocoplus');
const AGENTS_DIR = path.resolve(process.cwd(), '.cortex', 'agents');
const POD_STATUS_PATH = path.join(COCOPLUS_DIR, 'pod-status.json');
const FINDINGS_MD_PATH = path.join(COCOPLUS_DIR, 'lifecycle', 'FINDINGS.md');
const FINDINGS_STATE_PATH = path.join(COCOPLUS_DIR, 'lifecycle', 'findings-state.json');
const ARCHIVE_DIR = path.join(COCOPLUS_DIR, 'lifecycle', 'findings-archive');

const SEVERITY_ORDER = ['ADVISORY', 'MINOR', 'IMPORTANT', 'BLOCKING'];
const PRIORITY_ORDER = ['P4', 'P3', 'P2', 'P1']; // P1 is highest
const EFFORT_ORDER = ['XS', 'S', 'M', 'L', 'XL'];

function parseArgs(argv) {
  const args = { clear: false, skipPartial: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--since') args.since = argv[++i];
    else if (argv[i] === '--clear') args.clear = true;
    else if (argv[i] === '--skip-partial') args.skipPartial = true;
  }
  return args;
}

function readPodStatus(sinceIso) {
  let records = [];
  try {
    records = JSON.parse(fs.readFileSync(POD_STATUS_PATH, 'utf8'));
    if (!Array.isArray(records)) records = [];
  } catch (_) {
    return [];
  }
  if (sinceIso) {
    const sinceMs = new Date(sinceIso).getTime();
    records = records.filter(r => new Date(r.timestamp).getTime() >= sinceMs);
  }
  return records;
}

function clearFindings() {
  fs.mkdirSync(ARCHIVE_DIR, { recursive: true });
  if (fs.existsSync(FINDINGS_MD_PATH)) {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    fs.renameSync(FINDINGS_MD_PATH, path.join(ARCHIVE_DIR, `${stamp}-FINDINGS.md`));
  }
  fs.mkdirSync(path.dirname(FINDINGS_STATE_PATH), { recursive: true });
  fs.writeFileSync(FINDINGS_STATE_PATH, JSON.stringify({ generated_at: new Date().toISOString(), findings: [], anomalies: [], contributing_pods: [] }, null, 2), 'utf8');
  console.log(JSON.stringify({ cleared: true, archive_dir: ARCHIVE_DIR }, null, 2));
}

function readExcludes(podName) {
  const candidates = [
    path.join(AGENTS_DIR, `${podName}.agent.md`),
    path.join(AGENTS_DIR, 'sentinel', `${podName}.agent.md`),
  ];
  for (const candidatePath of candidates) {
    try {
      const content = fs.readFileSync(candidatePath, 'utf8');
      const match = content.match(/^excludes:\s*(.+)$/m);
      if (match) return match[1].trim().replace(/^["']|["']$/g, '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    } catch (_) { /* try next candidate */ }
  }
  return null; // no excludes declared — pod is "unscoped"
}

function higherOf(order, a, b) {
  const ia = order.indexOf(a);
  const ib = order.indexOf(b);
  return ia >= ib ? a : b;
}

function detectScopeAnomalies(podRecords) {
  const anomalies = [];
  const cleanFindings = [];

  for (const record of podRecords) {
    const excludes = readExcludes(record.pod);
    const findings = record.findings || [];
    for (const finding of findings) {
      const concernClass = (finding.concern_class || '').toLowerCase();
      if (excludes && concernClass && excludes.some(ex => concernClass.includes(ex) || ex.includes(concernClass))) {
        anomalies.push({
          pod: record.pod,
          concern_class: finding.concern_class,
          finding_id: finding.id,
          message: `Pod ${record.pod} produced a finding in concern class "${finding.concern_class}" which appears in its declared exclusions.`,
        });
      } else {
        cleanFindings.push({ ...finding, source_pod: record.pod, unscoped: excludes === null });
      }
    }
  }

  return { anomalies, cleanFindings };
}

// Pass 1: same file:line
function dedupPass1(findings) {
  const groups = new Map();
  for (const f of findings) {
    const key = `${f.file}:${f.line}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(f);
  }
  return [...groups.values()];
}

// Pass 2: same issue_type within same file, across groups from pass 1
function dedupPass2(groups) {
  const byFileType = new Map();
  const singles = [];
  for (const group of groups) {
    if (group.length > 1) {
      singles.push(group); // already merged in pass 1
      continue;
    }
    const f = group[0];
    const key = `${f.file}:${(f.issue_type || '').toLowerCase()}`;
    if (!f.issue_type) {
      singles.push(group);
      continue;
    }
    if (!byFileType.has(key)) byFileType.set(key, []);
    byFileType.get(key).push(f);
  }
  return [...singles, ...byFileType.values()];
}

// Pass 3: similar snippet reference, across remaining single-item groups
function dedupPass3(groups) {
  const merged = [];
  const used = new Set();
  for (let i = 0; i < groups.length; i++) {
    if (used.has(i)) continue;
    let current = groups[i];
    if (current.length > 1) {
      merged.push(current);
      used.add(i);
      continue;
    }
    const base = current[0];
    for (let j = i + 1; j < groups.length; j++) {
      if (used.has(j) || groups[j].length > 1) continue;
      const other = groups[j][0];
      if (base.snippet && other.snippet && base.snippet.trim() === other.snippet.trim()) {
        current = [...current, other];
        used.add(j);
      }
    }
    merged.push(current);
    used.add(i);
  }
  return merged;
}

function mergeGroup(group, index) {
  const severity = group.reduce((acc, f) => higherOf(SEVERITY_ORDER, acc, f.severity || 'ADVISORY'), 'ADVISORY');
  const priority = group.reduce((acc, f) => higherOf(PRIORITY_ORDER, acc, f.priority || 'P4'), 'P4');
  const effort = group.reduce((acc, f) => higherOf(EFFORT_ORDER, acc, f.effort || 'XS'), 'XS');
  const description = group.reduce((longest, f) => (f.description || '').length > longest.length ? (f.description || '') : longest, '');
  const sources = group.map(f => ({ pod: f.source_pod, finding_id: f.id }));

  return {
    id: `PIVOT-${String(index + 1).padStart(3, '0')}`,
    severity,
    priority,
    effort,
    description,
    file: group[0].file,
    line: group[0].line,
    sources,
    unscoped_sources: group.filter(f => f.unscoped).map(f => f.source_pod),
  };
}

function timeHorizon(priority) {
  return { P1: 'pre-deploy', P2: 'this sprint', P3: 'this month', P4: 'backlog' }[priority] || 'backlog';
}

function sortFindings(findings) {
  return [...findings].sort((a, b) => {
    const pDiff = PRIORITY_ORDER.indexOf(b.priority) - PRIORITY_ORDER.indexOf(a.priority);
    if (pDiff !== 0) return pDiff;
    return SEVERITY_ORDER.indexOf(b.severity) - SEVERITY_ORDER.indexOf(a.severity);
  });
}

function renderFindingsMd(findings, partialPods, anomalies) {
  const lines = ['# FINDINGS', ''];

  if (partialPods.length > 0) {
    lines.push('> **Coverage Note:**');
    for (const p of partialPods) {
      lines.push(`> ${p.pod} completed partial checks (skipped: ${(p.skipped_checks || []).join(', ') || 'unspecified'}). Findings from this source may not reflect complete coverage of its declared territory.`);
    }
    lines.push('');
  }

  for (const f of findings) {
    lines.push(`## ${f.id} — ${f.severity}`);
    lines.push(`**Priority:** ${f.priority} (${timeHorizon(f.priority)})  **Effort:** ${f.effort}`);
    lines.push(`**File:** ${f.file}:${f.line}`);
    lines.push(`**Sources:** ${f.sources.map(s => `${s.pod}#${s.finding_id}`).join(', ')}`);
    if (f.unscoped_sources.length) lines.push(`**Unscoped sources:** ${f.unscoped_sources.join(', ')} (no excludes: declared)`);
    lines.push('');
    lines.push(f.description);
    lines.push('');
  }

  if (anomalies.length > 0) {
    lines.push('---', '', '## Scope Anomalies (excluded from findings above)', '');
    for (const a of anomalies) {
      lines.push(`- ${a.message} Finding ${a.finding_id} excluded.`);
    }
  }

  return lines.join('\n') + '\n';
}

function main() {
  if (!fs.existsSync(COCOPLUS_DIR)) {
    console.error(JSON.stringify({ error: 'CocoPlus not initialized. Run $pod init first.' }));
    process.exit(1);
  }

  const args = parseArgs(process.argv.slice(2));
  if (args.clear) return clearFindings();
  const podRecords = readPodStatus(args.since);

  if (podRecords.length === 0) {
    console.log(JSON.stringify({ message: 'No pod outputs found in pod-status.json.' }));
    return;
  }

  const convergenceRecords = args.skipPartial ? podRecords.filter(r => r.status !== 'PARTIAL') : podRecords;
  const { anomalies, cleanFindings } = detectScopeAnomalies(convergenceRecords);

  const pass1 = dedupPass1(cleanFindings);
  const pass2 = dedupPass2(pass1);
  const pass3 = dedupPass3(pass2);

  const merged = pass3.map((group, i) => mergeGroup(group, i));
  const sorted = sortFindings(merged);

  const partialPods = args.skipPartial ? [] : podRecords.filter(r => r.status === 'PARTIAL');

  fs.mkdirSync(path.dirname(FINDINGS_MD_PATH), { recursive: true });
  fs.writeFileSync(FINDINGS_MD_PATH, renderFindingsMd(sorted, partialPods, anomalies), 'utf8');

  const state = {
    generated_at: new Date().toISOString(),
    findings: sorted,
    anomalies,
    contributing_pods: podRecords.map(r => ({ pod: r.pod, status: r.status, timestamp: r.timestamp })),
  };
  fs.writeFileSync(FINDINGS_STATE_PATH, JSON.stringify(state, null, 2), 'utf8');

  console.log(JSON.stringify({
    unique_findings: sorted.length,
    scope_anomalies: anomalies.length,
    partial_pods: partialPods.map(p => p.pod),
  }, null, 2));
}

main();

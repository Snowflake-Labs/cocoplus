'use strict';

/**
 * lean-review.js — CocoLean diff-scoped over-engineering scanner
 *
 * Reads git diff (staged + unstaged), applies five CocoLean classification
 * tags (delete/stdlib/native/yagni/shrink) via pattern matching, and outputs
 * a JSON finding list to stdout. No LLM — deterministic only. Tier 1 latency.
 *
 * Output schema:
 * { findings: Array<{ tag, file, line, severity, description, action }>, diff_stats: { files, additions, deletions } }
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const COCOPLUS_DIR = path.resolve(process.cwd(), '.cocoplus');

function cocoplusExists() {
  return fs.existsSync(COCOPLUS_DIR);
}

function getDiff() {
  try {
    // Get both staged and unstaged changes
    const staged = execSync('git diff --cached', { encoding: 'utf8' });
    const unstaged = execSync('git diff', { encoding: 'utf8' });
    return staged + unstaged;
  } catch {
    return '';
  }
}

function getDiffStats(diff) {
  const files = new Set();
  let additions = 0;
  let deletions = 0;
  for (const line of diff.split('\n')) {
    if (line.startsWith('diff --git')) {
      const m = line.match(/b\/(.+)$/);
      if (m) files.add(m[1]);
    } else if (line.startsWith('+') && !line.startsWith('+++')) {
      additions++;
    } else if (line.startsWith('-') && !line.startsWith('---')) {
      deletions++;
    }
  }
  return { files: files.size, additions, deletions };
}

// Read spec.md and discuss.md to check declared requirements
function getDeclaredRequirements() {
  const sources = [
    path.join(COCOPLUS_DIR, 'lifecycle', 'spec.md'),
    path.join(COCOPLUS_DIR, 'lifecycle', 'discuss.md'),
  ];
  let text = '';
  for (const src of sources) {
    if (fs.existsSync(src)) text += fs.readFileSync(src, 'utf8') + '\n';
  }
  return text.toLowerCase();
}

// CARVE-OUT: patterns that are never flagged
const CARVEOUT_PATTERNS = [
  /trust.boundary/i,
  /input.validation/i,
  /injection.defense/i,
  /access.control/i,
  /credential/i,
  /data.loss.prevention/i,
  /audit.trail/i,
  /data.residency/i,
  /compliance/i,
  /masking.policy/i,
  /row.access.policy/i,
];

function isCarveout(line) {
  return CARVEOUT_PATTERNS.some(p => p.test(line));
}

// Pattern sets for each tag
const STDLIB_PATTERNS = [
  { pattern: /CHARINDEX\s*\(/i, replacement: 'POSITION() or LOCATE()', desc: 'CHARINDEX reimplements POSITION()' },
  { pattern: /manual\s+json\s+pars/i, replacement: 'GET_PATH() or PARSE_JSON()', desc: 'Manual JSON parsing reimplements GET_PATH/PARSE_JSON' },
  { pattern: /string_agg\s+manual/i, replacement: 'LISTAGG()', desc: 'Manual string aggregation reimplements LISTAGG()' },
  { pattern: /ROW_NUMBER.*PARTITION.*ORDER.*LIMIT\s+1/i, replacement: 'QUALIFY ROW_NUMBER() OVER (...) = 1', desc: 'Subquery dedup pattern should use QUALIFY' },
  { pattern: /CASE\s+WHEN.*IS\s+NULL\s+THEN/i, replacement: 'NVL() or COALESCE()', desc: 'NULL fallback CASE reimplements NVL()/COALESCE()' },
];

const NATIVE_PATTERNS = [
  { pattern: /CALL\s+SYSTEM\$TASK/i, native: 'Snowflake TASK object', desc: 'Scheduled procedure call more correctly expressed as a native TASK' },
  { pattern: /CREATE\s+OR\s+REPLACE\s+PROCEDURE.*EXECUTE\s+IMMEDIATE/i, native: 'Snowflake ALERT', desc: 'Alert logic in stored procedure should use native ALERT object' },
  { pattern: /INSERT.*SELECT.*WHERE.*NOT\s+EXISTS/i, native: 'MERGE statement', desc: 'INSERT-NOT-EXISTS pattern more correctly expressed as MERGE' },
  { pattern: /CREATE\s+TABLE.*AS\s+SELECT.*REFRESH/i, native: 'DYNAMIC TABLE or MATERIALIZED VIEW', desc: 'Manually refreshed derived table should be a DYNAMIC TABLE or MATERIALIZED VIEW' },
];

const YAGNI_PATTERNS = [
  { pattern: /enable_\w+\s*=\s*(true|false|0|1)/i, desc: 'Feature flag with no corresponding spec requirement' },
  { pattern: /IF\s+\(\s*\w+_mode\s*[=!]=\s*['"][^'"]+['"]\s*\)/i, desc: 'Mode-switch conditional with no corresponding spec requirement' },
  { pattern: /--\s*(TODO|FUTURE|EXTENSIBLE|PLACEHOLDER):/i, desc: 'Speculative placeholder for undeclared future requirement' },
  { pattern: /version\s*=\s*['"]v?\d+['"]/i, desc: 'API versioning abstraction with no versioning requirement in spec' },
];

const SHRINK_PATTERNS = [
  { pattern: /CASE\s+WHEN[\s\S]{200,}END/i, desc: 'CASE expression exceeds reasonable length for a single logical operation — consider IFF() or lookup table' },
  { pattern: /(WITH\s+\w+\s+AS\s*\([^)]{50,}\)){4,}/i, desc: 'Four or more CTEs for what may be expressible in fewer steps' },
];

function parseDiffAdditions(diff) {
  const additions = [];
  let currentFile = null;
  let lineNum = 0;

  for (const line of diff.split('\n')) {
    if (line.startsWith('diff --git')) {
      const m = line.match(/b\/(.+)$/);
      currentFile = m ? m[1] : null;
      lineNum = 0;
    } else if (line.startsWith('@@')) {
      const m = line.match(/@@ -\d+(?:,\d+)? \+(\d+)/);
      lineNum = m ? parseInt(m[1], 10) - 1 : lineNum;
    } else if (line.startsWith('+') && !line.startsWith('+++')) {
      lineNum++;
      additions.push({ file: currentFile, line: lineNum, content: line.slice(1) });
    } else if (!line.startsWith('-')) {
      lineNum++;
    }
  }
  return additions;
}

function scanFindings(diff, declaredReqs) {
  const findings = [];
  const additions = parseDiffAdditions(diff);

  for (const { file, line, content } of additions) {
    if (!file || isCarveout(content)) continue;

    // stdlib
    for (const { pattern, replacement, desc } of STDLIB_PATTERNS) {
      if (pattern.test(content)) {
        findings.push({ tag: 'stdlib', file, line, severity: 'important', description: desc, action: `Replace with: ${replacement}` });
      }
    }

    // native
    for (const { pattern, native, desc } of NATIVE_PATTERNS) {
      if (pattern.test(content)) {
        findings.push({ tag: 'native', file, line, severity: 'important', description: desc, action: `Convert to: ${native}` });
      }
    }

    // yagni — check against declared requirements
    for (const { pattern, desc } of YAGNI_PATTERNS) {
      if (pattern.test(content)) {
        // Extract the potential flag/feature name
        const m = content.match(/(\w+_mode|\w+_flag|\w+_enabled)/i);
        const name = m ? m[1].toLowerCase() : '';
        if (!name || !declaredReqs.includes(name)) {
          findings.push({ tag: 'yagni', file, line, severity: 'nit', description: desc, action: 'Remove or add to spec before implementing' });
        }
      }
    }

    // shrink
    for (const { pattern, desc } of SHRINK_PATTERNS) {
      if (pattern.test(content)) {
        findings.push({ tag: 'shrink', file, line, severity: 'nit', description: desc, action: 'Simplify to minimum lines for the operation' });
      }
    }
  }

  // delete — functions introduced with no callers in the diff and no spec reference
  const introducedFunctions = [];
  const allAddedContent = additions.map(a => a.content).join('\n');
  const funcPattern = /CREATE\s+(?:OR\s+REPLACE\s+)?(?:FUNCTION|PROCEDURE)\s+(\w+)/gi;
  let m;
  while ((m = funcPattern.exec(allAddedContent)) !== null) {
    const name = m[1].toLowerCase();
    // Check if called elsewhere in diff or in spec
    const calledInDiff = new RegExp(`\\b${name}\\s*\\(`, 'i').test(allAddedContent.replace(m[0], ''));
    const calledInSpec = declaredReqs.includes(name);
    if (!calledInDiff && !calledInSpec) {
      // Find file/line from additions
      const entry = additions.find(a => new RegExp(`CREATE.*${name}`, 'i').test(a.content));
      if (entry && !isCarveout(entry.content)) {
        findings.push({
          tag: 'delete',
          file: entry.file,
          line: entry.line,
          severity: 'important',
          description: `Function \`${name}\` introduced with no callers in this diff and no reference in spec.md`,
          action: 'Remove from this commit or add to spec first',
        });
      }
    }
  }

  // Sort: delete/yagni first, stdlib/native second, shrink last
  const order = { delete: 0, yagni: 1, stdlib: 2, native: 3, shrink: 4 };
  findings.sort((a, b) => order[a.tag] - order[b.tag]);

  return findings;
}

function main() {
  if (!cocoplusExists()) {
    console.error(JSON.stringify({ error: 'CocoPlus not initialized. Run $pod init first.' }));
    process.exit(1);
  }

  const diff = getDiff();
  if (!diff.trim()) {
    console.log(JSON.stringify({ findings: [], diff_stats: { files: 0, additions: 0, deletions: 0 }, message: 'No uncommitted changes found.' }));
    return;
  }

  const declaredReqs = getDeclaredRequirements();
  const findings = scanFindings(diff, declaredReqs);
  const diff_stats = getDiffStats(diff);

  console.log(JSON.stringify({ findings, diff_stats }, null, 2));
}

main();

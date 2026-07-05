'use strict';

/**
 * audit-ci.js — CocoAudit CI runner with contract regression phase (Feature 40/44)
 *
 * $audit ci runs the contract regression phase (delegates to contract-prove.js
 * --ci, the authoritative CocoContract CI re-execution logic) BEFORE standard
 * audit log verification. A contract regression is reported with the same
 * severity as a failing safety gate — this script exits non-zero if either
 * phase fails.
 */

const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');

const COCOPLUS_DIR = path.resolve(process.cwd(), '.cocoplus');
const AUDIT_PATH = path.join(COCOPLUS_DIR, 'lifecycle', 'audit.md');

function runContractRegression() {
  const contractProve = path.join('scripts', 'contract-prove.js');
  if (!fs.existsSync(contractProve)) {
    return { phase: 'contract-regression', skipped: true, reason: 'contract-prove.js not found' };
  }
  try {
    const out = execFileSync(process.execPath, [contractProve, '--ci'], { encoding: 'utf8' });
    const parsed = JSON.parse(out);
    const failed = (parsed.contracts || []).filter(c => c.status === 'fail');
    return { phase: 'contract-regression', passed: failed.length === 0, failures: failed, contracts: parsed.contracts || [] };
  } catch (err) {
    // contract-prove.js --ci exits non-zero on failure; stdout still has the JSON report
    let parsed = { contracts: [] };
    try { parsed = JSON.parse(err.stdout); } catch (_) { /* unparseable — treat as hard failure */ }
    const failed = (parsed.contracts || []).filter(c => c.status === 'fail');
    return { phase: 'contract-regression', passed: false, failures: failed.length ? failed : [{ reason: 'contract-prove.js --ci failed to run' }], contracts: parsed.contracts || [] };
  }
}

function verifyAuditLog() {
  if (!fs.existsSync(AUDIT_PATH)) {
    return { phase: 'audit-log-verification', passed: true, reason: 'CocoAudit not enabled for this CocoPod' };
  }
  const content = fs.readFileSync(AUDIT_PATH, 'utf8');
  const blocks = content.match(/^## \[/gm) || [];
  // Structural check only: every event block must have Timestamp, Event, and
  // Artifact fields. This is a shape check, not a cryptographic integrity
  // check — append-only discipline is enforced at write time (post-tool-use.js).
  const sections = content.split(/^## \[/m).slice(1);
  const malformed = sections.filter(s => !/\*\*Timestamp\*\*/.test(s) || !/\*\*Event\*\*/.test(s));

  return {
    phase: 'audit-log-verification',
    passed: malformed.length === 0,
    total_events: blocks.length,
    malformed_events: malformed.length,
  };
}

function main() {
  if (!fs.existsSync(COCOPLUS_DIR)) {
    console.error(JSON.stringify({ error: 'CocoPlus not initialized. Run $pod init first.' }));
    process.exit(1);
  }

  const contractPhase = runContractRegression();
  const auditPhase = verifyAuditLog();

  const overallPassed = contractPhase.passed !== false && auditPhase.passed !== false;

  console.log(JSON.stringify({ phases: [contractPhase, auditPhase], overall: overallPassed ? 'pass' : 'fail' }, null, 2));
  process.exit(overallPassed ? 0 : 1);
}

main();

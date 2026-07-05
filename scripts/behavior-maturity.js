'use strict';

/**
 * behavior-maturity.js — CocoBehavior L0-L3 maturity assessment (deterministic, no LLM)
 *
 * Reads cocoplus.toml and .cocoplus/modes/ to determine automation level,
 * evaluates the L3 ten-item readiness checklist, and writes maturity.json.
 */

const path = require('path');
const fs = require('fs');

const COCOPLUS_DIR = path.resolve(process.cwd(), '.cocoplus');
const TOML_PATH = path.resolve(process.cwd(), 'cocoplus.toml');
const MATURITY_PATH = path.join(COCOPLUS_DIR, 'maturity.json');

function modeExists(name) {
  return fs.existsSync(path.join(COCOPLUS_DIR, 'modes', name));
}

function fileExists(...segments) {
  return fs.existsSync(path.join(COCOPLUS_DIR, ...segments));
}

function readTomlText() {
  try {
    return fs.readFileSync(TOML_PATH, 'utf8');
  } catch (_) {
    return '';
  }
}

function countBlockRules() {
  const rulesPath = path.join(COCOPLUS_DIR, 'secondeye', 'block-rules.json');
  try {
    const data = JSON.parse(fs.readFileSync(rulesPath, 'utf8'));
    return Array.isArray(data) ? data.length : 0;
  } catch (_) {
    return 0;
  }
}

function countSentinelArtifactTypes() {
  const configPath = path.join(COCOPLUS_DIR, 'sentinel', 'config.json');
  try {
    const data = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    return Array.isArray(data.artifact_types) ? data.artifact_types.length : 0;
  } catch (_) {
    return 0;
  }
}

function evaluateL3Checklist(tomlText) {
  const items = [
    { id: 1, description: 'cocoplus-context.md constitutional document is complete and current', pass: fileExists('lifecycle', 'cocoplus-context.md') },
    { id: 2, description: 'cocoplus.toml defines explicit tool permission tiers for all agents', pass: /\[permissions\.[a-z_-]+\]/i.test(tomlText) },
    { id: 3, description: 'All CocoFlow stage handlers have deterministic script fallbacks', pass: fileExists('flow.json') && /fallback_script/i.test((() => { try { return fs.readFileSync(path.join(COCOPLUS_DIR, 'flow.json'), 'utf8'); } catch (_) { return ''; } })()) },
    { id: 4, description: 'SecondEye is active with at least five block rules', pass: countBlockRules() >= 5 },
    { id: 5, description: 'CocoSentinel is configured for all artifact types the pipeline produces', pass: countSentinelArtifactTypes() > 0 },
    { id: 6, description: 'A rollback-by-git-tag strategy is documented in plan.md', pass: (() => { try { return /rollback.*git.tag/i.test(fs.readFileSync(path.join(COCOPLUS_DIR, 'lifecycle', 'plan.md'), 'utf8')); } catch (_) { return false; } })() },
    { id: 7, description: 'CocoAudit is active and capturing all HUMAN REQUIRED tier operations', pass: modeExists('cocoaudit.on') && fileExists('lifecycle', 'audit.md') },
    { id: 8, description: 'CocoContract outcome contracts exist for all production-bound functions', pass: fs.existsSync(path.resolve(process.cwd(), 'outcomes')) },
    { id: 9, description: 'CocoTrace traceability graph covers all functions in the deployment artifact', pass: fileExists('lifecycle', 'trace.json') },
    { id: 10, description: "The developer has reviewed and acknowledged the Four-Tier Boundary Framework's NEVER tier items for this CocoPod", pass: modeExists('boundary-framework.acknowledged') },
  ];
  return items;
}

function computeLevel(checklist) {
  const secondEyeActive = modeExists('secondeye.on') || fileExists('secondeye');
  const sentinelConfigured = countSentinelArtifactTypes() > 0;
  const coreAutomation = modeExists('memory.on') && (modeExists('safety.normal') || modeExists('safety.strict'));
  const allL3Pass = checklist.every(item => item.pass);

  if (allL3Pass) return 'L3';
  if (secondEyeActive && countBlockRules() > 0 && sentinelConfigured) return 'L2';
  if (coreAutomation) return 'L1';
  return 'L0';
}

function main() {
  if (!fs.existsSync(COCOPLUS_DIR)) {
    console.error(JSON.stringify({ error: 'CocoPlus not initialized. Run $pod init first.' }));
    process.exit(1);
  }

  const tomlText = readTomlText();
  const checklist = evaluateL3Checklist(tomlText);
  const level = computeLevel(checklist);

  const result = {
    level,
    computed_at: new Date().toISOString(),
    l3_checklist: checklist,
    l3_items_passing: checklist.filter(i => i.pass).length,
  };

  fs.mkdirSync(path.dirname(MATURITY_PATH), { recursive: true });
  const tmp = MATURITY_PATH + '.tmp.' + process.pid;
  fs.writeFileSync(tmp, JSON.stringify(result, null, 2), 'utf8');
  fs.renameSync(tmp, MATURITY_PATH);

  console.log(JSON.stringify(result, null, 2));
}

main();

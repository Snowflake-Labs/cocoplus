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

function declaredMaturity(tomlText) {
  const match = tomlText.match(/(?:automation_maturity|maturity_level)\s*=\s*["']?(L[0-3])["']?/i);
  return match ? match[1].toUpperCase() : null;
}

function tomlFlag(tomlText, key) {
  return new RegExp(`${key}\\s*=\\s*(true|1|yes)`, 'i').test(tomlText);
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
    { id: 1, description: 'Budget guard exists', pass: tomlFlag(tomlText, 'budget_guard') || /budget_limit\s*=/.test(tomlText) },
    { id: 2, description: 'Verifier is structurally separate from generator', pass: tomlFlag(tomlText, 'separate_verifier') || /verifier_agent\s*=/.test(tomlText) },
    { id: 3, description: 'Failure escalation ladder is defined', pass: tomlFlag(tomlText, 'failure_escalation_ladder') || /escalation_ladder/.test(tomlText) },
    { id: 4, description: 'Human override path is documented', pass: tomlFlag(tomlText, 'human_override_path') || /human_override/.test(tomlText) },
    { id: 5, description: 'Output allowlist is bounded', pass: tomlFlag(tomlText, 'output_allowlist') || /output_allowlist\s*=/.test(tomlText) },
    { id: 6, description: 'Mandatory path denylist is configured', pass: tomlFlag(tomlText, 'path_denylist') || /path_denylist\s*=/.test(tomlText) },
    { id: 7, description: 'Kill switch exists', pass: tomlFlag(tomlText, 'kill_switch') },
    { id: 8, description: 'Run log is committed', pass: tomlFlag(tomlText, 'run_log_committed') || fileExists('lifecycle', 'run-log.md') },
    { id: 9, description: 'No same-agent verification is enforced', pass: tomlFlag(tomlText, 'no_same_agent_verification') },
    { id: 10, description: 'Attempt cap is set', pass: /attempt_cap\s*=\s*\d+/i.test(tomlText) },
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

function levelRank(level) {
  return { L0: 0, L1: 1, L2: 2, L3: 3 }[level] ?? 0;
}

function minLevel(a, b) {
  return levelRank(a) <= levelRank(b) ? a : b;
}

function main() {
  if (!fs.existsSync(COCOPLUS_DIR)) {
    console.error(JSON.stringify({ error: 'CocoPlus not initialized. Run $pod init first.' }));
    process.exit(1);
  }

  const tomlText = readTomlText();
  const checklist = evaluateL3Checklist(tomlText);
  const computedLevel = computeLevel(checklist);
  const declaredLevel = declaredMaturity(tomlText);
  const level = declaredLevel ? minLevel(computedLevel, declaredLevel) : computedLevel;

  const result = {
    level,
    computed_level: computedLevel,
    declared_level: declaredLevel,
    enforcement: declaredLevel && computedLevel !== level ? 'capped-to-declared-maturity' : 'computed',
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

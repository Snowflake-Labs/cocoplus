#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const {
  ensureDir,
  parseArgs,
  readJson,
  writeJson,
} = require('./_script-utils.js');
const {
  isoUtc,
  loadConfig,
} = require('../hooks/_v2-state.js');

const COCOPLUS_DIR = '.cocoplus';

function configValue(config, key, fallback) {
  if (config.cocoflow && Object.prototype.hasOwnProperty.call(config.cocoflow, key)) return config.cocoflow[key];
  if (config.flow && Object.prototype.hasOwnProperty.call(config.flow, key)) return config.flow[key];
  return fallback;
}

function readConfig() {
  const config = loadConfig ? loadConfig() : {};
  return {
    executionConflictGateEnabled: configValue(config, 'execution_conflict_gate_enabled', true) !== false,
    surfaceLearningLogEnabled: configValue(config, 'surface_learning_log_enabled', true) !== false,
    surfaceLearningMaxInject: Number(configValue(config, 'surface_learning_max_inject', 10)) || 10,
    livenessCheckEnabled: configValue(config, 'liveness_check_enabled', true) !== false,
    livenessCheckObjectValidation: configValue(config, 'liveness_check_object_validation', false) === true,
  };
}

function loadFlow() {
  const candidates = [
    path.join(COCOPLUS_DIR, 'flow.json'),
    'flow.json',
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return readJson(candidate, {});
  }
  return {};
}

function asArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string' && value.trim()) return [value.trim()];
  return [];
}

function podId(stage) {
  return String(stage.cocoPodId || stage.cocopod_id || stage.pod_id || stage.pod || stage.id || '').trim();
}

function stageId(stage) {
  return String(stage.id || stage.stage_id || stage.name || podId(stage) || '').trim();
}

function stageDomains(stage) {
  return asArray(stage.domain || stage.domains || stage.writes_to || stage.surfaces)
    .map((item) => String(item).trim())
    .filter(Boolean);
}

function dependencies(stage) {
  return asArray(stage.dependencies || stage.depends_on || stage.needs).map(String);
}

function scopeKey(scope) {
  if (!scope || typeof scope !== 'object') return '';
  return JSON.stringify(scope, Object.keys(scope).sort());
}

function staticallyNonOverlapping(left, right) {
  const leftScope = left.predicate_scope || left.scope || left.audience || null;
  const rightScope = right.predicate_scope || right.scope || right.audience || null;
  if (!leftScope || !rightScope) return false;
  if (scopeKey(leftScope) === scopeKey(rightScope)) return false;

  for (const key of Object.keys(leftScope)) {
    if (!Object.prototype.hasOwnProperty.call(rightScope, key)) continue;
    const a = leftScope[key];
    const b = rightScope[key];
    if (typeof a !== 'object' && typeof b !== 'object' && String(a) !== String(b)) return true;
    if (a && b && typeof a === 'object' && typeof b === 'object') {
      if (Object.prototype.hasOwnProperty.call(a, 'equals') && Object.prototype.hasOwnProperty.call(b, 'equals') && String(a.equals) !== String(b.equals)) return true;
      if (Object.prototype.hasOwnProperty.call(a, 'max') && Object.prototype.hasOwnProperty.call(b, 'min') && Number(a.max) < Number(b.min)) return true;
      if (Object.prototype.hasOwnProperty.call(a, 'min') && Object.prototype.hasOwnProperty.call(b, 'max') && Number(a.min) > Number(b.max)) return true;
    }
  }
  return false;
}

function ordered(left, right) {
  const leftId = stageId(left);
  const rightId = stageId(right);
  return dependencies(left).includes(rightId) || dependencies(left).includes(podId(right))
    || dependencies(right).includes(leftId) || dependencies(right).includes(podId(left));
}

function conflictGate(stages, enabled) {
  if (!enabled) return { status: 'conflict_gate_skipped', conflicts: [] };
  const conflicts = [];
  for (let i = 0; i < stages.length; i += 1) {
    for (let j = i + 1; j < stages.length; j += 1) {
      const shared = stageDomains(stages[i]).filter((domain) => stageDomains(stages[j]).includes(domain));
      if (!shared.length) continue;
      if (ordered(stages[i], stages[j])) continue;
      if (staticallyNonOverlapping(stages[i], stages[j])) continue;
      conflicts.push({
        left: podId(stages[i]),
        right: podId(stages[j]),
        left_stage: stageId(stages[i]),
        right_stage: stageId(stages[j]),
        shared_domain: shared,
      });
    }
  }
  return {
    status: conflicts.length ? 'conflict_gate_blocked' : 'conflict_gate_passed',
    conflicts,
  };
}

function podDefinitionPath(id) {
  const candidates = [
    path.join(COCOPLUS_DIR, 'pods', `${id}.json`),
    path.join(COCOPLUS_DIR, 'cocopods', `${id}.json`),
    path.join(COCOPLUS_DIR, 'lifecycle', 'pods', `${id}.json`),
    path.join(COCOPLUS_DIR, 'lifecycle', 'cocopods', `${id}.json`),
  ];
  return candidates.find((candidate) => fs.existsSync(candidate)) || candidates[0];
}

function flattenSchema(schema, prefix = '') {
  const flattened = {};
  if (!schema || typeof schema !== 'object' || Array.isArray(schema)) return flattened;
  for (const [key, value] of Object.entries(schema)) {
    const field = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value) && !value.type) {
      Object.assign(flattened, flattenSchema(value, field));
    } else {
      flattened[field] = value && typeof value === 'object' && value.type ? String(value.type) : String(value);
    }
  }
  return flattened;
}

function compareSchema(expected, actual, direction) {
  const mismatches = [];
  const expectedFlat = flattenSchema(expected);
  const actualFlat = flattenSchema(actual);
  for (const [field, expectedType] of Object.entries(expectedFlat)) {
    if (!Object.prototype.hasOwnProperty.call(actualFlat, field)) {
      mismatches.push({ field: `${direction}.${field}`, expected: expectedType, actual: '<missing>' });
    } else if (String(actualFlat[field]) !== String(expectedType)) {
      mismatches.push({ field: `${direction}.${field}`, expected: expectedType, actual: actualFlat[field] });
    }
  }
  return mismatches;
}

function objectRegistry() {
  const candidates = [
    path.join(COCOPLUS_DIR, 'lifecycle', 'snowflake-objects.json'),
    path.join(COCOPLUS_DIR, 'environment', 'snowflake-objects.json'),
  ];
  for (const candidate of candidates) {
    if (!fs.existsSync(candidate)) continue;
    const payload = readJson(candidate, {});
    return new Set(asArray(payload.objects || payload.tables || payload.views).map((item) => String(item).toUpperCase()));
  }
  return new Set();
}

function livenessCheck(stages, options) {
  if (!options.enabled) return { status: 'liveness_check_skipped', results: [] };
  const knownObjects = options.objectValidation ? objectRegistry() : new Set();
  const results = [];
  for (const stage of stages) {
    const id = podId(stage);
    const definitionPath = podDefinitionPath(id);
    const result = {
      pod: id,
      stage: stageId(stage),
      status: 'pass',
      layers: {},
      errors: [],
    };
    if (!id || !fs.existsSync(definitionPath)) {
      result.status = 'fail';
      result.layers.existence = 'fail';
      result.errors.push({ layer: 'existence', message: `CocoPod ${id || '<missing>'} definition is missing.` });
      results.push(result);
      continue;
    }

    const definition = readJson(definitionPath, {});
    if (['deprecated', 'archived'].includes(String(definition.status || '').toLowerCase())) {
      result.status = 'fail';
      result.layers.existence = 'fail';
      result.errors.push({ layer: 'existence', message: `CocoPod ${id} is ${definition.status}.` });
    } else {
      result.layers.existence = 'pass';
    }

    const expectedContract = stage.contract || {};
    const schemaMismatches = [
      ...compareSchema(expectedContract.inputs || expectedContract.input || {}, definition.inputs || definition.input || {}, 'inputs'),
      ...compareSchema(expectedContract.outputs || expectedContract.output || {}, definition.outputs || definition.output || {}, 'outputs'),
    ];
    if (schemaMismatches.length) {
      result.status = 'fail';
      result.layers.schema_contract = 'fail';
      for (const mismatch of schemaMismatches) {
        result.errors.push({ layer: 'schema_contract', ...mismatch });
      }
    } else {
      result.layers.schema_contract = 'pass';
    }

    if (options.objectValidation) {
      const missing = stageDomains(stage).filter((domain) => !knownObjects.has(String(domain).toUpperCase()));
      if (missing.length) {
        result.status = 'fail';
        result.layers.object_liveness = 'fail';
        for (const objectName of missing) {
          result.errors.push({ layer: 'object_liveness', object: objectName, message: `Snowflake object ${objectName} is not present in the metadata registry.` });
        }
      } else {
        result.layers.object_liveness = 'pass';
      }
    } else {
      result.layers.object_liveness = 'skipped';
    }
    results.push(result);
  }
  return {
    status: results.some((result) => result.status === 'fail') ? 'liveness_check_blocked' : 'liveness_check_passed',
    results,
  };
}

function surfaceFile(surface) {
  return path.join(COCOPLUS_DIR, 'lifecycle', 'surfaces', `${String(surface).replace(/[^A-Za-z0-9_.-]/g, '_')}.md`);
}

function recentSurfaceLearnings(surfaces, maxEntries) {
  const learnings = {};
  for (const surface of surfaces) {
    const filePath = surfaceFile(surface);
    const lines = fs.existsSync(filePath)
      ? fs.readFileSync(filePath, 'utf8').split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
      : [];
    learnings[surface] = lines.slice(-maxEntries).reverse();
  }
  return learnings;
}

function prePromptBlocks(surfaceLearnings) {
  const blocks = {};
  for (const [surface, lines] of Object.entries(surfaceLearnings)) {
    if (!lines.length) continue;
    blocks[surface] = [
      `Prior learnings for this surface (${surface}):`,
      ...lines.map((line) => `- ${line}`),
    ].join('\n');
  }
  return blocks;
}

function appendProgress(event) {
  const filePath = path.join(COCOPLUS_DIR, 'lifecycle', 'PROGRESS.md');
  ensureDir(path.dirname(filePath));
  fs.appendFileSync(filePath, `${isoUtc()} ${event.status}: ${event.message || ''}\n`, 'utf8');
}

function buildContext(flow, config, conflict, liveness) {
  const stages = Array.isArray(flow.stages) ? flow.stages : [];
  const surfaces = Array.from(new Set(stages.flatMap(stageDomains)));
  if (config.surfaceLearningLogEnabled) ensureDir(path.join(COCOPLUS_DIR, 'lifecycle', 'surfaces'));
  const surfaceLearnings = config.surfaceLearningLogEnabled ? recentSurfaceLearnings(surfaces, config.surfaceLearningMaxInject) : {};
  const context = {
    generated_at: isoUtc(),
    run_id: flow.run_id || flow.runtime && flow.runtime.harvest_id || null,
    current_stage: flow.current_stage || flow.stage || null,
    cocopods: stages.map((stage) => ({
      stage_id: stageId(stage),
      cocoPodId: podId(stage),
      status: stage.status || 'pending',
      domain: stageDomains(stage),
      dependencies: dependencies(stage),
    })),
    conflict_gate: conflict,
    liveness,
    surface_learnings: surfaceLearnings,
    pre_prompt_blocks: prePromptBlocks(surfaceLearnings),
    active_policy_findings: readJson(path.join(COCOPLUS_DIR, 'lifecycle', 'active-policy-findings.json'), []),
  };
  writeJson(path.join(COCOPLUS_DIR, 'lifecycle', 'context.json'), context);
  return context;
}

function runCheck() {
  const config = readConfig();
  const flow = loadFlow();
  const stages = Array.isArray(flow.stages) ? flow.stages : [];
  const conflict = conflictGate(stages, config.executionConflictGateEnabled);
  const liveness = livenessCheck(stages, {
    enabled: config.livenessCheckEnabled,
    objectValidation: config.livenessCheckObjectValidation,
  });
  appendProgress({
    status: conflict.status,
    message: conflict.conflicts && conflict.conflicts.length ? JSON.stringify(conflict.conflicts) : 'CocoFlow execution conflict gate completed.',
  });
  appendProgress({
    status: liveness.status,
    message: liveness.results && liveness.results.length ? JSON.stringify(liveness.results) : 'CocoPod liveness check completed.',
  });
  const context = buildContext(flow, config, conflict, liveness);
  const payload = { ok: conflict.status !== 'conflict_gate_blocked' && liveness.status !== 'liveness_check_blocked', conflict_gate: conflict, liveness, context_path: path.join(COCOPLUS_DIR, 'lifecycle', 'context.json') };
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
  return payload.ok ? 0 : 1;
}

function appendLearning(args) {
  const config = readConfig();
  if (!config.surfaceLearningLogEnabled) {
    process.stdout.write(`${JSON.stringify({ ok: true, status: 'surface_learning_skipped' }, null, 2)}\n`);
    return 0;
  }
  const surface = args.surface || args.domain;
  const pod = args.pod || args.cocoPodId || args.cocopod_id;
  const outcome = args.outcome || 'success';
  const learning = args.learning || args.message || '';
  if (!surface || !pod || !learning) {
    process.stderr.write('surface, pod, and learning are required for --conclude\n');
    return 2;
  }
  if (!['success', 'regression', 'abandoned'].includes(String(outcome))) {
    process.stderr.write('outcome must be one of: success, regression, abandoned\n');
    return 2;
  }
  const date = args.date || isoUtc().slice(0, 10);
  const filePath = surfaceFile(surface);
  ensureDir(path.dirname(filePath));
  fs.appendFileSync(filePath, `${date}: ${pod} - ${outcome}. ${learning}\n`, 'utf8');
  process.stdout.write(`${JSON.stringify({ ok: true, status: 'surface_learning_appended', path: filePath }, null, 2)}\n`);
  return 0;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.conclude) return appendLearning(args);
  return runCheck();
}

if (require.main === module) {
  process.exit(main());
}

module.exports = {
  buildContext,
  conflictGate,
  livenessCheck,
  recentSurfaceLearnings,
  runCheck,
};

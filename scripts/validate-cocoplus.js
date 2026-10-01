#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const pluginPath = path.join(repoRoot, '.cortex-plugin', 'plugin.json');
const agentsDir = path.join(repoRoot, '.cortex', 'agents');
const hooksDir = path.join(repoRoot, '.cortex', 'hooks');
const hookLibDir = path.join(hooksDir, 'lib');
const runtimeScriptsDir = path.join(repoRoot, '.cortex', 'scripts');
const skillsDir = path.join(repoRoot, '.cortex', 'skills');
const templatesDir = path.join(repoRoot, 'templates');
const recipesDir = path.join(repoRoot, 'recipes');
const referenceDir = path.join(repoRoot, 'reference-specs');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function readFile(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function listFiles(dirPath, suffix) {
  return fs.readdirSync(dirPath)
    .filter((name) => name.endsWith(suffix))
    .map((name) => path.join(dirPath, name));
}

function walkFiles(dirPath, predicate) {
  if (!fs.existsSync(dirPath)) return [];
  const found = [];
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const filePath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      found.push(...walkFiles(filePath, predicate));
    } else if (!predicate || predicate(filePath)) {
      found.push(filePath);
    }
  }
  return found;
}

function normalizeNewlines(value) {
  return String(value).replace(/\r\n/g, '\n');
}

function requireFile(filePath, failures, label) {
  if (!fs.existsSync(filePath)) {
    failures.push(`${label || 'Required file'} is missing: ${path.relative(repoRoot, filePath)}`);
    return false;
  }
  return true;
}

function requireIncludes(content, expected, failures, label) {
  if (!content.includes(expected)) {
    failures.push(`${label} must include: ${expected}`);
  }
}


function asArray(value) {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') return [value];
  return [];
}

function normalizeManifestPath(value) {
  return String(value).replace(/\\/g, '/').replace(/\/+$/, '').replace(/^\.\//, '');
}

function skillPath(name) {
  const directPath = path.join(skillsDir, name, 'SKILL.md');
  if (fs.existsSync(directPath)) return directPath;

  return walkFiles(skillsDir, (filePath) =>
    path.basename(filePath) === 'SKILL.md'
    && path.basename(path.dirname(filePath)) === name
  )[0] || directPath;
}

function manifestIncludesPath(value, expected) {
  const normalizedExpected = normalizeManifestPath(expected);
  return asArray(value).some((item) => normalizeManifestPath(item) === normalizedExpected);
}

function listAgentIds(dirPath) {
  return new Set(walkFiles(dirPath, (filePath) => filePath.endsWith('.agent.md'))
    .map((filePath) => path.relative(dirPath, filePath).replace(/\\/g, '/').replace(/\.agent\.md$/, '')));
}
function rejectPattern(content, pattern, failures, label) {
  if (pattern.test(content)) {
    failures.push(`${label} contains stale or malformed content matching ${pattern}`);
  }
}

function parseFrontmatterTools(agentFile) {
  const content = readFile(agentFile);
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return [];

  const lines = match[1].split(/\r?\n/);
  const tools = [];
  let inTools = false;

  for (const line of lines) {
    if (/^tools:\s*$/.test(line)) {
      inTools = true;
      continue;
    }
    if (inTools) {
      const item = line.match(/^\s*-\s+(.+?)\s*$/);
      if (item) {
        tools.push(item[1]);
        continue;
      }
      if (/^\S/.test(line)) {
        inTools = false;
      }
    }
  }

  return tools;
}

function extractObjectArgumentAfter(content, callStart) {
  const braceStart = content.indexOf('{', callStart);
  if (braceStart === -1) return '';
  let depth = 0;
  let quote = null;
  let escaped = false;
  for (let i = braceStart; i < content.length; i += 1) {
    const char = content[i];
    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === quote) {
        quote = null;
      }
      continue;
    }
    if (char === '"' || char === "'" || char === '`') {
      quote = char;
      continue;
    }
    if (char === '{') depth += 1;
    if (char === '}') {
      depth -= 1;
      if (depth === 0) return content.slice(braceStart, i + 1);
    }
  }
  return '';
}

function v2QueueWriteBlocks(content) {
  const blocks = [];
  const marker = 'appendJsonLine(V2_QUEUE';
  let index = 0;
  while ((index = content.indexOf(marker, index)) !== -1) {
    blocks.push(extractObjectArgumentAfter(content, index));
    index += marker.length;
  }
  return blocks.filter(Boolean);
}

function main() {
  const failures = [];
  const plugin = readJson(pluginPath);
  const skillNativeDir = path.join(repoRoot, '.cortex', 'skills', 'skill-native');
  const registeredAgentIds = listAgentIds(agentsDir);
  const manifestScripts = (plugin.scripts || []).map(normalizeManifestPath);

  if ((plugin.skills || []).some((skill) => skill.startsWith('skill-native/'))) {
    failures.push('V2-only manifest must not register skill-native/* compatibility skills');
  }

  if (fs.existsSync(skillNativeDir)) {
    failures.push('V2-only skills tree must not contain .cortex/skills/skill-native compatibility folder');
  }

  const requiredAgents = [
    'coco-bloom',
    'coco-klatch',
    'coco-pull',
  ];

  const requiredHookLibs = [
    'agents-update.js',
    'state-reader.js',
  ];

  const requiredTemplates = [
    'flow-view.html.template',
    'meter-view.html.template',
  ];

  const requiredSkillPaths = [
    skillPath('bloom-skip'),
    path.join(repoRoot, '.cortex', 'skills', 'cocowatch', 'SKILL.md'),
    skillPath('pod-checkpoint'),
    skillPath('runtime-queue'),
    skillPath('meter-reconcile'),
    skillPath('flow-event-reader'),
  ];

  const sourceParitySkillPaths = [
    skillPath('wisdom-reject'),
    skillPath('wisdom-index'),
    skillPath('wisdom-recall'),
    skillPath('wisdom-learnings'),
    skillPath('wisdom-learn'),
    skillPath('meter-verify'),
    skillPath('meter-waste'),
    skillPath('audit-verify'),
    skillPath('style'),
    skillPath('style-init'),
    skillPath('style-refresh'),
    skillPath('style-show'),
    skillPath('style-mode'),
    skillPath('style-diff'),
    skillPath('style-status'),
    skillPath('lex'),
    skillPath('lex-define'),
    skillPath('lex-list'),
    skillPath('lex-show'),
    skillPath('lex-extract'),
    skillPath('lex-validate'),
    skillPath('stall'),
    skillPath('stall-status'),
    skillPath('stall-thresholds'),
    skillPath('stall-reset'),
    skillPath('pulse'),
    skillPath('pulse-on'),
    skillPath('pulse-off'),
    skillPath('pulse-status'),
    skillPath('pulse-configure'),
    skillPath('adversary'),
    skillPath('adversary-enable'),
    skillPath('adversary-disable'),
    skillPath('adversary-run'),
    skillPath('adversary-show'),
    skillPath('adversary-audit'),
    skillPath('adversary-gap'),
    skillPath('diary'),
    skillPath('diary-view'),
    skillPath('diary-list'),
    skillPath('diary-search'),
  ];

  const requiredRecipes = [
    'cortex-add-classifier.json.template',
    'cortex-add-search.json.template',
    'cortex-semantic-model.json.template',
    'cortex-add-extraction.json.template',
  ];

  const requiredRuntimeScripts = [
    '_contract-hash.js',
    '_script-utils.js',
    'alignment-check.js',
    'audit-events.js',
    'behavior-maturity.js',
    'chargeback-refresh.js',
    'cocoplus-console.js',
    'contract-gate.js',
    'contract-prove.js',
    'flow-bootstrap.js',
    'health-grader.js',
    'instruction-rubric.js',
    'model-tier-resolve.js',
    'noop-check.js',
    'ops-thesis-updater.js',
    'pivot-merge.js',
    'recipe-metadata.js',
    'recall-import.js',
    'refine-update.js',
    'report-export.js',
    'rollback.js',
    'scope-classify.js',
    'spec-validator.js',
    'status-envelope-check.js',
    'wisdom-route.js',
    'wisdom-reflection.js',
  ];

  const allowedRuntimeScripts = new Set(requiredRuntimeScripts);

  const requiredTwentySixthSkills = [
    skillPath('wisdom-distill'),
    skillPath('wisdom-review'),
    skillPath('wisdom-status'),
    skillPath('wisdom-get'),
    skillPath('flow-gate-clear'),
    skillPath('flow-gate-status'),
  ];

  if (!manifestIncludesPath(plugin.skills, './.cortex/skills')) {
    failures.push('.cortex-plugin/plugin.json must register skills as "./.cortex/skills"');
  }

  const legacySkillFiles = walkFiles(skillsDir, (filePath) => filePath.endsWith('.skill.md'));
  for (const filePath of legacySkillFiles) {
    failures.push(`Legacy skill filename must be migrated to <skill>/SKILL.md: ${path.relative(repoRoot, filePath)}`);
  }

  const canonicalSkillFiles = walkFiles(skillsDir, (filePath) => path.basename(filePath) === 'SKILL.md');
  const canonicalSkillNames = new Set();
  for (const filePath of canonicalSkillFiles) {
    const relativeParts = path.relative(skillsDir, filePath).split(path.sep);
    if (relativeParts.length < 2 || relativeParts.length > 11) {
      failures.push(`Skill must be within Cortex Code's 10-directory discovery depth: ${path.relative(repoRoot, filePath)}`);
      continue;
    }
    const folderName = relativeParts[relativeParts.length - 2];
    const content = readFile(filePath);
    const nameMatch = content.match(/^name:\s*["']?([^\r\n"']+)["']?\s*$/m);
    const frontmatterName = nameMatch ? nameMatch[1].trim() : '';
    if (frontmatterName !== folderName) {
      failures.push(`Skill folder ${folderName} must match frontmatter name ${frontmatterName || '<missing>'}`);
    }
    if (canonicalSkillNames.has(frontmatterName)) {
      failures.push(`Duplicate skill frontmatter name: ${frontmatterName}`);
    }
    canonicalSkillNames.add(frontmatterName);
  }

  if (!manifestIncludesPath(plugin.agents, './.cortex/agents')) {
    failures.push('.cortex-plugin/plugin.json must register agents as "./.cortex/agents"');
  }

  const requiredHookEvents = {
    SessionStart: '.cortex/hooks/session-start.js',
    SessionEnd: '.cortex/hooks/session-end.js',
    PreToolUse: '.cortex/hooks/pre-tool-use.js',
    PostToolUse: '.cortex/hooks/post-tool-use.js',
    UserPromptSubmit: '.cortex/hooks/user-prompt-submit.js',
    Stop: '.cortex/hooks/stop.js',
    SubagentStop: '.cortex/hooks/subagent-stop.js',
    PreCompact: '.cortex/hooks/pre-compact.js',
    Notification: '.cortex/hooks/notification.js',
  };

  for (const [eventName, scriptPath] of Object.entries(requiredHookEvents)) {
    const eventHooks = plugin.hooks && plugin.hooks[eventName];
    const command = Array.isArray(eventHooks) && eventHooks[0] && eventHooks[0].hooks && eventHooks[0].hooks[0]
      ? eventHooks[0].hooks[0].command
      : '';
    if (!command.includes(scriptPath)) {
      failures.push(`.cortex-plugin/plugin.json must register ${eventName} hook command for ${scriptPath}`);
    }
  }

  if (plugin.version !== '2.0.2') {
    failures.push('.cortex-plugin/plugin.json must declare version 2.0.2');
  }

  for (const fileName of requiredRuntimeScripts) {
    const manifestPath = `.cortex/scripts/${fileName}`;
    if (!manifestScripts.includes(manifestPath)) {
      failures.push(`.cortex-plugin/plugin.json must register runtime script ${manifestPath}`);
    }
  }

  for (const script of plugin.scripts || []) {
    const scriptPath = path.join(repoRoot, script);
    if (!fs.existsSync(scriptPath)) {
      failures.push(`Manifest script "${script}" is missing file ${path.relative(repoRoot, scriptPath)}`);
    }
    if (!normalizeManifestPath(script).startsWith('.cortex/scripts/')) {
      failures.push(`Manifest script "${script}" must live under .cortex/scripts/`);
    }
  }

  for (const agentId of requiredAgents) {
    if (!registeredAgentIds.has(agentId)) {
      failures.push(`Required agent "${agentId}" is missing from ${path.relative(repoRoot, agentsDir)}`);
    }
  }

  for (const fileName of requiredHookLibs) {
    const filePath = path.join(hookLibDir, fileName);
    if (!fs.existsSync(filePath)) {
      failures.push(`Required hook library is missing: ${path.relative(repoRoot, filePath)}`);
    }
  }

  for (const fileName of requiredTemplates) {
    const filePath = path.join(templatesDir, fileName);
    if (requireFile(filePath, failures, 'Required template')) {
      const referencePath = path.join(referenceDir, fileName);
      if (fs.existsSync(referencePath) && normalizeNewlines(readFile(filePath)) !== normalizeNewlines(readFile(referencePath))) {
        failures.push(`Template ${path.relative(repoRoot, filePath)} does not match ${path.relative(repoRoot, referencePath)}`);
      }
    }
  }

  for (const skillPath of requiredSkillPaths) {
    requireFile(skillPath, failures, 'Reference-specified skill path');
  }

  for (const skillPath of sourceParitySkillPaths) {
    requireFile(skillPath, failures, 'CocoPlus source parity skill path');
  }

  for (const skillPath of requiredTwentySixthSkills) {
    requireFile(skillPath, failures, 'Twenty-sixth-cycle skill path');
  }

  for (const asset of [...requiredTemplates.map((name) => path.join('templates', name)), ...requiredRecipes.map((name) => path.join('recipes', name))]) {
    const manifestList = asset.startsWith('templates') ? plugin.templates : plugin.recipes;
    if (!Array.isArray(manifestList) || !manifestList.includes(asset.replace(/\//g, '\\')) && !manifestList.includes(asset.replace(/\\/g, '/'))) {
      failures.push(`.cortex-plugin/plugin.json does not register asset ${asset}`);
    }
  }

  if (!plugin.cocoHarvest || Number(plugin.cocoHarvest.pullThreshold) !== 8000) {
    failures.push('.cortex-plugin/plugin.json must define cocoHarvest.pullThreshold as 8000');
  }

  for (const fileName of requiredRecipes) {
    const filePath = path.join(recipesDir, fileName);
    if (!fs.existsSync(filePath)) {
      failures.push(`Required recipe template is missing: ${path.relative(repoRoot, filePath)}`);
    } else {
      const recipe = readJson(filePath);
      const stages = recipe.flow && Array.isArray(recipe.flow.stages) ? recipe.flow.stages : [];
      if (stages.length === 0) failures.push(`Recipe ${path.relative(repoRoot, filePath)} has no stages`);
      for (const stage of stages) {
        for (const requiredField of ['id', 'name', 'persona', 'prompt', 'checkpoints', 'deliverables', 'validation_commands', 'hitl', 'maxConsecutiveFailures']) {
          if (!(requiredField in stage)) {
            failures.push(`Recipe ${path.relative(repoRoot, filePath)} stage ${stage.id || '<unknown>'} missing ${requiredField}`);
          }
        }
      }
    }
  }

  const templateScriptDir = path.join(templatesDir, 'scripts');
  if (fs.existsSync(templateScriptDir)) {
    failures.push('templates/scripts must not exist; non-console feature behavior belongs in V2-native skills');
  }

  const rootScriptFiles = walkFiles(path.join(repoRoot, 'scripts'), (filePath) => filePath.endsWith('.js'));
  for (const filePath of rootScriptFiles) {
    const relative = path.relative(repoRoot, filePath).replace(/\\/g, '/');
    if (relative !== 'scripts/validate-cocoplus.js' && !relative.startsWith('scripts/tests/')) {
      failures.push(`Root script ${relative} is not repo maintenance/test tooling; implement feature behavior as V2-native skills`);
    }
  }

  for (const fileName of requiredRuntimeScripts) {
    const filePath = path.join(runtimeScriptsDir, fileName);
    if (!fs.existsSync(filePath)) {
      failures.push(`Required runtime script is missing: ${path.relative(repoRoot, filePath)}`);
    }
  }

  for (const filePath of walkFiles(runtimeScriptsDir, (candidate) => candidate.endsWith('.js'))) {
    const relative = normalizeManifestPath(path.relative(repoRoot, filePath));
    if (!manifestScripts.includes(relative)) {
      failures.push(`Runtime script ${relative} must be registered in .cortex-plugin/plugin.json`);
    }
    if (!allowedRuntimeScripts.has(path.basename(filePath))) {
      failures.push(`Unexpected runtime script is not in the required deterministic backing set: ${relative}`);
    }
  }

  const configTemplate = readFile(path.join(templatesDir, 'cocoplus.toml.template'));
  const duplicateCortexConfigTemplate = path.join(repoRoot, '.cortex', 'templates', 'cocoplus.toml.template');
  if (fs.existsSync(duplicateCortexConfigTemplate)) {
    failures.push('.cortex/templates/cocoplus.toml.template must not exist; templates/cocoplus.toml.template is the canonical packaged template');
  }
  for (const expected of [
    'budget_limit',
    'budget_reserve_fraction',
    'budget_enforcement',
    'track_coordination_cost',
    'coordination_warning_threshold',
    'track_acrr',
    'track_actual_model',
    'transcript_adapter_strict',
    'meter_reconciliation_enabled',
    'meter_reconciliation_threshold',
    'complexity_estimation',
    'trivial_floor_invariant',
    'auto_distill',
    'distill_on_failure',
    'contradiction_action',
    'session_index_enabled',
    'session_index_path',
    'redact_credentials_at_index',
    'injection_mode',
    'preload_categories',
    'stage_mappings_enabled',
    '[run_policy]',
    'merge_policy',
    'allow_irreversible_actions',
    'stop_after',
    'model_tier_default',
    '[flow.stage]',
    'human_gate_clearance_file',
    'premortem_enabled',
    'premortem_warn_on_absent',
    'contract_tier',
    '[safety]',
    'runtime_policy_engine',
    'policy_log_all',
    'production_schema_prefixes',
    'block_drop_table_production',
    'block_delete_without_where',
    'allow_custom_policy_overrides',
    'escalate_on_repeat',
    '[cocoflow]',
    'execution_conflict_gate_enabled',
    'surface_learning_log_enabled',
    'surface_learning_max_inject',
    'liveness_check_enabled',
    'liveness_check_object_validation',
    '[cocopod]',
    'instruction_rubric_enforcement_enabled',
    '[cocowisdom]',
    'autonomous_wisdom_reflection_enabled',
    'wisdom_reflection_cadence',
  ]) {
    requireIncludes(configTemplate, expected, failures, 'cocoplus.toml.template');
  }

  const principlesHtml = readFile(path.join(repoRoot, 'docs', 'principles.html'));
  const principleCount = (principlesHtml.match(/<h2 id="[0-9]/g) || []).length;
  if (principleCount !== 52) {
    failures.push(`docs/principles.html must contain 52 principle headings; found ${principleCount}`);
  }
  requireIncludes(principlesHtml, 'The Transcript Is the Source of Truth', failures, 'docs/principles.html');
  requireIncludes(principlesHtml, 'Timestamps Have Provenance', failures, 'docs/principles.html');
  requireIncludes(principlesHtml, 'Producers Never Grade Themselves', failures, 'docs/principles.html');
  requireIncludes(principlesHtml, 'Gate Weakening Requires a New Run', failures, 'docs/principles.html');
  requireIncludes(principlesHtml, 'Stable API Surface for Unstable Conditions', failures, 'docs/principles.html');
  requireIncludes(principlesHtml, 'Skill Is Memory', failures, 'docs/principles.html');
  requireIncludes(principlesHtml, 'Negative Memory Is Load-Bearing', failures, 'docs/principles.html');
  requireIncludes(principlesHtml, 'Lexical Baseline Before LLM Processing', failures, 'docs/principles.html');
  requireIncludes(principlesHtml, 'Structural Correctness', failures, 'docs/principles.html');
  requireIncludes(principlesHtml, 'Structure Is the Reliability Gap', failures, 'docs/principles.html');
  requireIncludes(principlesHtml, 'Manifest-First Loading', failures, 'docs/principles.html');
  requireIncludes(principlesHtml, 'Explicit Curation Over Automatic Accumulation', failures, 'docs/principles.html');
  requireIncludes(principlesHtml, 'Git-Native Memory', failures, 'docs/principles.html');
  requireIncludes(principlesHtml, 'Air-Gap Compatible by Default', failures, 'docs/principles.html');
  requireIncludes(principlesHtml, 'Instruction Files Earn Authority Through Enforcement', failures, 'docs/principles.html');

  const preToolUse = readFile(path.join(hooksDir, 'pre-tool-use.js'));
  requireIncludes(preToolUse, 'model_tier_floor_applied', failures, 'PreToolUse hook');
  requireIncludes(preToolUse, 'human_gate_blocked', failures, 'PreToolUse hook');
  requireIncludes(preToolUse, 'open-pre-tool-use', failures, 'PreToolUse hook');
  requireIncludes(preToolUse, 'premortem_required', failures, 'PreToolUse hook');
  requireIncludes(preToolUse, 'premortem_acknowledged', failures, 'PreToolUse hook');
  requireIncludes(preToolUse, 'require_outcome_verification', failures, 'PreToolUse hook');
  requireIncludes(preToolUse, 'pilotConfig.first_run_gate', failures, 'PreToolUse hook');
  requireIncludes(preToolUse, 'evaluateRuntimePolicy', failures, 'PreToolUse hook');
  requireIncludes(preToolUse, 'block-drop-table-production', failures, 'PreToolUse hook');
  requireIncludes(preToolUse, 'block-delete-without-where', failures, 'PreToolUse hook');
  requireIncludes(preToolUse, 'policy-decisions.jsonl', failures, 'PreToolUse hook');
  requireIncludes(preToolUse, 'policy-instructions.jsonl', failures, 'PreToolUse hook');
  requireIncludes(preToolUse, 'loadPolicyFiles', failures, 'PreToolUse hook');
  requireIncludes(preToolUse, 'policyMatch', failures, 'PreToolUse hook');
  requireIncludes(preToolUse, 'escalate_on_repeat', failures, 'PreToolUse hook');
  requireIncludes(preToolUse, 'safeRegexTest', failures, 'PreToolUse hook');
  requireIncludes(preToolUse, 'source_sha256', failures, 'PreToolUse hook');
  requireIncludes(preToolUse, 'allow_custom_policy_overrides', failures, 'PreToolUse hook');
  requireIncludes(preToolUse, 'lifecycle\', \'policies', failures, 'PreToolUse hook');
  rejectPattern(preToolUse, /params\.premortem_acknowledged/, failures, 'PreToolUse hook');

  const sessionStart = readFile(path.join(hooksDir, 'session-start.js'));
  requireIncludes(sessionStart, 'cocoplus-init.json', failures, 'SessionStart hook');

  const userPromptSubmit = readFile(path.join(hooksDir, 'user-prompt-submit.js'));
  requireIncludes(userPromptSubmit, '$cocoplus reset-init', failures, 'UserPromptSubmit hook');
  requireIncludes(userPromptSubmit, 'wisdom_reflection_requested', failures, 'UserPromptSubmit hook');

  const postToolUse = readFile(path.join(hooksDir, 'post-tool-use.js'));
  requireIncludes(postToolUse, 'open-pre-tool-use', failures, 'PostToolUse hook');
  requireIncludes(postToolUse, 'evaluateAction', failures, 'PostToolUse hook');
  requireIncludes(postToolUse, 'observeTurn', failures, 'PostToolUse hook');

  const notificationHook = readFile(path.join(hooksDir, 'notification.js'));
  requireIncludes(notificationHook, 'open-pre-tool-use', failures, 'Notification hook');

  const consoleScript = readFile(path.join(runtimeScriptsDir, 'cocoplus-console.js'));
  requireIncludes(consoleScript, 'translateIntent', failures, 'CocoConsole script');
  requireIncludes(consoleScript, 'Danger only', failures, 'CocoConsole script');
  requireIncludes(consoleScript, 'Human Gate Hold', failures, 'CocoConsole script');
  requireIncludes(consoleScript, '$flow gate-clear', failures, 'CocoConsole script');
  requireIncludes(consoleScript, 'renderPolicyDecisionLog', failures, 'CocoConsole script');
  requireIncludes(consoleScript, 'Policy Decision Log', failures, 'CocoConsole script');
  requireIncludes(consoleScript, 'show-all-policy-decisions', failures, 'CocoConsole script');
  requireIncludes(consoleScript, 'renderFlowBootstrap', failures, 'CocoConsole script');
  requireIncludes(consoleScript, 'CocoPod Liveness', failures, 'CocoConsole script');
  requireIncludes(consoleScript, 'Surface Learnings', failures, 'CocoConsole script');
  requireIncludes(consoleScript, 'renderRubricEnforcement', failures, 'CocoConsole script');
  requireIncludes(consoleScript, 'Instruction Rubric Enforcement', failures, 'CocoConsole script');
  requireIncludes(consoleScript, 'renderPatternAdherence', failures, 'CocoConsole script');
  requireIncludes(consoleScript, 'Pattern Adherence Ledger', failures, 'CocoConsole script');

  const instructionRubricScript = readFile(path.join(runtimeScriptsDir, 'instruction-rubric.js'));
  for (const expected of ['rubric.json', 'pending-rubric-repair.json', 'never_fires', 'rubric_check_missed']) {
    requireIncludes(instructionRubricScript, expected, failures, 'Instruction rubric script');
  }
  const wisdomReflectionScript = readFile(path.join(runtimeScriptsDir, 'wisdom-reflection.js'));
  for (const expected of ['drop-support-file', 'self-authored-only', '.ledger.jsonl', 'adherence_rate', 'probation', 'capacity_archive']) {
    requireIncludes(wisdomReflectionScript, expected, failures, 'Wisdom reflection script');
  }

  const flowBootstrapScript = readFile(path.join(runtimeScriptsDir, 'flow-bootstrap.js'));
  for (const expected of [
    'conflict_gate_blocked',
    'conflict_gate_passed',
    'surface_learning_appended',
    'liveness_check_blocked',
    'liveness_check_passed',
    'context.json',
  ]) {
    requireIncludes(flowBootstrapScript, expected, failures, 'CocoFlow bootstrap script');
  }

  const stalePatterns = [
    /All 32 Features/i,
    /Thirty-two features/i,
    /32 features/i,
  ];
  const textFiles = [
    path.join(repoRoot, 'README.md'),
    path.join(repoRoot, 'AGENTS.md'),
    ...walkFiles(path.join(repoRoot, 'docs'), (filePath) => filePath.endsWith('.html')),
    ...walkFiles(path.join(repoRoot, '.cortex', 'skills'), (filePath) => filePath.endsWith('.md')),
  ];

  const skillContractFiles = walkFiles(skillsDir, (filePath) => path.basename(filePath) === 'SKILL.md');
  for (const filePath of skillContractFiles) {
    const relative = path.relative(repoRoot, filePath);
    const content = readFile(filePath);
    if (!/^---\r?\n[\s\S]*?\r?\n---/.test(content)) {
      failures.push(`Skill contract ${relative} is missing YAML frontmatter`);
    }
    for (const field of ['name', 'description', 'version', 'author', 'tags']) {
      if (!new RegExp(`^${field}:`, 'm').test(content)) {
        failures.push(`Skill contract ${relative} is missing frontmatter field ${field}`);
      }
    }
    if (!/^## Exit Criteria\b/m.test(content)) {
      failures.push(`Skill contract ${relative} is missing ## Exit Criteria`);
    }
    if (!/Anti-Rationalization/i.test(content)) {
      failures.push(`Skill contract ${relative} is missing Anti-Rationalization guidance`);
    }
  }

  for (const filePath of textFiles) {
    const content = readFile(filePath);
    for (const pattern of stalePatterns) {
      if (pattern.test(content)) {
        failures.push(`Stale reference "${pattern.source}" found in ${path.relative(repoRoot, filePath)}`);
      }
    }
  }

  const publicAndContractFiles = [
    path.join(repoRoot, 'README.md'),
    path.join(repoRoot, 'AGENTS.md'),
    path.join(repoRoot, 'CHANGELOG.md'),
    path.join(repoRoot, 'INSTALLATION.md'),
    ...walkFiles(path.join(repoRoot, 'docs'), (filePath) => filePath.endsWith('.html')),
    ...walkFiles(path.join(repoRoot, '.cortex', 'skills'), (filePath) => filePath.endsWith('.md')),
    ...walkFiles(path.join(repoRoot, 'templates'), (filePath) => filePath.endsWith('.md') || filePath.endsWith('.template')),
  ];
  for (const filePath of publicAndContractFiles) {
    rejectPattern(readFile(filePath), /snow[-_]cocoplus/i, failures, path.relative(repoRoot, filePath));
  }

  const conceptsHtml = readFile(path.join(repoRoot, 'docs', 'concepts.html'));
  const livingContractsPosition = conceptsHtml.indexOf('id="living-instruction-contracts"');
  const contentClosePosition = conceptsHtml.lastIndexOf('</div>');
  if (livingContractsPosition < 0 || livingContractsPosition > contentClosePosition) {
    failures.push('docs/concepts.html must keep Living Instruction Contracts inside the content container');
  }
  rejectPattern(conceptsHtml, /<hr>\s*<hr>/i, failures, 'docs/concepts.html');
  rejectPattern(conceptsHtml, /three models\s*\(Haiku, Sonnet, Opus\)/i, failures, 'docs/concepts.html');

  const legacyRuntimeReferencePatterns = [
    /\.cortex[\\/]scripts[\\/](?!cocoplus-console\.js)/i,
    /node\s+\.cortex[\\/]scripts/i,
    /runtime script `?[^`]*?(rollback|scope-classify|spec-validator|meter-reconcile|flow-event-reader|transcript-adapter|pr-complexity|dora-metrics|sentinel-pregate|report-export)\b/i,
  ];
  const runtimeReferenceFiles = [
    ...walkFiles(path.join(repoRoot, '.cortex', 'skills'), (filePath) => filePath.endsWith('.md')),
    ...walkFiles(path.join(repoRoot, 'docs'), (filePath) => filePath.endsWith('.html')),
    path.join(repoRoot, 'README.md'),
    path.join(repoRoot, 'INSTALLATION.md'),
    path.join(templatesDir, 'AGENTS.md.template'),
  ].filter((filePath) => fs.existsSync(filePath));

  for (const filePath of runtimeReferenceFiles) {
    const relative = path.relative(repoRoot, filePath).replace(/\\/g, '/');
    if (relative === '.cortex/skills/assist-mode/cocoplus-console/SKILL.md') continue;
    const content = readFile(filePath);
    for (const pattern of legacyRuntimeReferencePatterns) {
      if (pattern.test(content)) {
        failures.push(`Legacy runtime script reference found in ${relative}: ${pattern.source}`);
      }
    }
  }

  const snowParityDocs = [
    readFile(path.join(repoRoot, 'README.md')),
    readFile(path.join(repoRoot, 'CHANGELOG.md')),
    ...walkFiles(path.join(repoRoot, 'docs'), (filePath) => filePath.endsWith('.html')).map(readFile),
  ].join('\n');
  for (const expected of [
    '$wisdom reject',
    '$wisdom index',
    '$wisdom recall',
    'do-not-use.md',
    '$meter verify',
    '$meter waste',
    '$audit verify',
    '$style init',
    '$lex define',
    '$stall status',
    '$pulse on',
    '$adversary run',
    '$diary view',
    '$cocoplus reset-init',
    'CocoPilot pre-mortem gate',
    'CocoContract risk-scaled verification tiers',
    'Structure Is the Reliability Gap',
    'manifest-first memory',
    'branch-scoped memory',
    'air-gap compatible',
    'runtime policy engine',
    'Policy Decision Log',
    'instruct()',
    'policy-as-code',
    'execution conflict gate',
    'surface learning',
    'liveness check',
    'lifecycle/context.json',
    'instruction rubric',
    'calibrate-rubric',
    'autonomous wisdom reflection',
    'Pattern Adherence Ledger',
  ]) {
    requireIncludes(snowParityDocs, expected, failures, 'CocoPlus source parity docs');
  }

  const hookFiles = listFiles(hooksDir, '.js');
  const spawnedAgents = new Set();

  for (const hookFile of hookFiles) {
    const content = readFile(hookFile);
    const matches = content.matchAll(/agent:\s*'([^']+)'/g);
    for (const match of matches) {
      spawnedAgents.add(match[1]);
    }
  }

  for (const agentId of spawnedAgents) {
    if (!registeredAgentIds.has(agentId)) {
      failures.push(`Hook-spawned agent "${agentId}" is missing from ${path.relative(repoRoot, agentsDir)}`);
    }
    const agentFile = path.join(agentsDir, `${agentId}.agent.md`);
    if (!fs.existsSync(agentFile)) {
      failures.push(`Hook-spawned agent "${agentId}" is missing file ${path.relative(repoRoot, agentFile)}`);
    }
  }

  const subagentStop = readFile(path.join(hooksDir, 'subagent-stop.js'));
  for (const prefix of ['klatch-participant-', 'klatch-synthesis-', 'pull-']) {
    if (!subagentStop.includes(prefix)) {
      failures.push(`SubagentStop hook missing routing prefix ${prefix}`);
    }
  }

  for (const hookName of ['session-start.js', 'session-end.js', 'stop.js', 'subagent-stop.js', 'user-prompt-submit.js']) {
    const hookContent = readFile(path.join(hooksDir, hookName));
    if (hookContent.includes('appendJsonLine(V2_QUEUE')) {
      requireIncludes(hookContent, 'stableQueueKey', failures, `${hookName} V2 queue writer`);
    }
    for (const block of v2QueueWriteBlocks(hookContent)) {
      if (!/\bidempotency_key\s*:/.test(block)) {
        const skill = (block.match(/skill:\s*['"`]([^'"`]+)['"`]/) || [])[1] || '<unknown>';
        failures.push(`${hookName} V2 queue request for ${skill} is missing idempotency_key`);
      }
    }
  }

  const runtimeQueueSkillPath = skillPath('runtime-queue');
  if (requireFile(runtimeQueueSkillPath, failures, 'V2 runtime queue skill')) {
    const runtimeQueueSkill = readFile(runtimeQueueSkillPath);
    for (const expected of [
      'Request Envelope',
      'idempotency_key',
      'claim_token',
      'Settlement States',
      'claimed|completed|failed|superseded',
      'Do not execute JavaScript helpers',
    ]) {
      requireIncludes(runtimeQueueSkill, expected, failures, 'execution-engine/runtime-queue skill');
    }
  }

  const meterReconcileSkillPath = skillPath('meter-reconcile');
  if (requireFile(meterReconcileSkillPath, failures, 'CocoMeter reconciliation skill')) {
    const meterReconcileSkill = readFile(meterReconcileSkillPath);
    for (const expected of [
      'Idempotency',
      'Queue Settlement',
      'authoritative_tokens',
      'model_drift',
      'adapter-canary',
      'Do not infer token totals from prose',
    ]) {
      requireIncludes(meterReconcileSkill, expected, failures, 'cocometer/meter-reconcile skill');
    }
  }

  const flowEventReaderSkillPath = skillPath('flow-event-reader');
  if (requireFile(flowEventReaderSkillPath, failures, 'CocoFlow event reader skill')) {
    const flowEventReaderSkill = readFile(flowEventReaderSkillPath);
    for (const expected of [
      'Timestamp Precedence',
      'completed_at',
      'completion_source',
      'completion_timestamp_reliable',
      'Queue Settlement',
      'Do not overwrite transcript-derived timestamps',
    ]) {
      requireIncludes(flowEventReaderSkill, expected, failures, 'execution-engine/flow-event-reader skill');
    }
  }

  const harvestSkill = readFile(skillPath('cocoharvest'));
  if (!/pullThreshold/.test(harvestSkill) || !/\$pull <input>/.test(harvestSkill)) {
    failures.push('CocoHarvest skill must document automatic CocoPull use above pullThreshold');
  }

  const podInitSkill = readFile(skillPath('pod-init'));
  if (!podInitSkill.includes('lifecycle/cocowatch-session.md')) {
    failures.push('$pod init gitignore must exclude lifecycle/cocowatch-session.md');
  }

  const rewindSkill = readFile(skillPath('rewind'));
  requireIncludes(
    rewindSkill,
    'cannot reverse Snowflake or other external side effects',
    failures,
    'Rewind skill',
  );

  const documentationFiles = [
    ...walkFiles(path.join(referenceDir, 'docs'), (filePath) => filePath.endsWith('.md')),
    ...walkFiles(path.join(repoRoot, 'docs'), (filePath) => filePath.endsWith('.html')),
  ];
  const documentation = documentationFiles
    .map((filePath) => readFile(filePath))
    .join('\n');

  rejectPattern(documentation, /\$cocoplus spark(?:-off)?/i, failures, 'Documentation');
  rejectPattern(documentation, /scope-classify\.sh/i, failures, 'Documentation');
  rejectPattern(documentation, /SecondEye spawns three critics|Three critics fire in parallel/i, failures, 'Documentation');
  rejectPattern(documentation, /Polls for completion by checking checkpoint file existence/i, failures, 'Documentation');
  rejectPattern(documentation, /Requires:\s*At least one completed session with CocoMeter active/i, failures, 'Documentation');
  requireIncludes(
    documentation,
    'cannot reverse Snowflake or other external side effects',
    failures,
    'Documentation',
  );

  const commandReferenceHtml = readFile(path.join(repoRoot, 'docs', 'command-reference.html'));
  rejectPattern(commandReferenceHtml, /<td[^>]*>--full\]<code>/i, failures, 'Generated command reference');
  rejectPattern(commandReferenceHtml, /<td[^>]*>off`<\/td>/i, failures, 'Generated command reference');

  const writeIntentPatterns = [
    /write findings/i,
    /append to/i,
    /write exactly one timestamped snapshot/i,
    /write .*report/i,
  ];

  for (const agentFile of listFiles(agentsDir, '.agent.md')) {
    const content = readFile(agentFile);
    const tools = parseFrontmatterTools(agentFile);
    const declaresWriteIntent = writeIntentPatterns.some((pattern) => pattern.test(content));
    if (declaresWriteIntent && !tools.includes('Write') && !tools.includes('Edit')) {
      failures.push(`Agent ${path.basename(agentFile)} instructs writes but lacks Write/Edit tool`);
    }
  }

  if (failures.length > 0) {
    console.error('CocoPlus validation failed:\n');
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log('CocoPlus validation passed.');
}

main();


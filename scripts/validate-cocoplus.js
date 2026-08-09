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
    path.join(repoRoot, '.cortex', 'skills', 'cocobloom', 'bloom-skip.skill.md'),
    path.join(repoRoot, '.cortex', 'skills', 'cocowatch', 'SKILL.md'),
    path.join(repoRoot, '.cortex', 'skills', 'cocohealth', 'pod-checkpoint.skill.md'),
    path.join(repoRoot, '.cortex', 'skills', 'execution-engine', 'runtime-queue.skill.md'),
    path.join(repoRoot, '.cortex', 'skills', 'cocometer', 'meter-reconcile.skill.md'),
    path.join(repoRoot, '.cortex', 'skills', 'execution-engine', 'flow-event-reader.skill.md'),
  ];

  const requiredRecipes = [
    'cortex-add-classifier.json.template',
    'cortex-add-search.json.template',
    'cortex-semantic-model.json.template',
    'cortex-add-extraction.json.template',
  ];

  const requiredRuntimeScripts = [
    'cocoplus-console.js',
  ];

  const allowedRuntimeScripts = new Set(requiredRuntimeScripts);

  const requiredTwentySixthSkills = [
    path.join(repoRoot, '.cortex', 'skills', 'cocowisdom', 'wisdom-distill.skill.md'),
    path.join(repoRoot, '.cortex', 'skills', 'cocowisdom', 'wisdom-review.skill.md'),
    path.join(repoRoot, '.cortex', 'skills', 'cocowisdom', 'wisdom-status.skill.md'),
    path.join(repoRoot, '.cortex', 'skills', 'cocowisdom', 'wisdom-get.skill.md'),
    path.join(repoRoot, '.cortex', 'skills', 'execution-engine', 'flow-gate-clear.skill.md'),
    path.join(repoRoot, '.cortex', 'skills', 'execution-engine', 'flow-gate-status.skill.md'),
  ];

  if (!manifestIncludesPath(plugin.skills, './.cortex/skills')) {
    failures.push('.cortex-plugin/plugin.json must register skills as "./.cortex/skills"');
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

  if (plugin.version !== '2.0.1') {
    failures.push('.cortex-plugin/plugin.json must declare version 2.0.1');
  }

  if (manifestScripts.length !== 1 || manifestScripts[0] !== '.cortex/scripts/cocoplus-console.js') {
    failures.push('.cortex-plugin/plugin.json must register only .cortex/scripts/cocoplus-console.js as a V2.0.1 runtime script');
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
    const fileName = path.basename(filePath);
    if (!allowedRuntimeScripts.has(fileName)) {
      failures.push(`V2.0.1 ships only CocoConsole as a runtime script; remove ${path.relative(repoRoot, filePath)}`);
    }
  }

  const configTemplate = readFile(path.join(templatesDir, 'cocoplus.toml.template'));
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
    'injection_mode',
    'preload_categories',
    '[run_policy]',
    'merge_policy',
    'allow_irreversible_actions',
    'stop_after',
    'model_tier_default',
    '[flow.stage]',
    'human_gate_clearance_file',
  ]) {
    requireIncludes(configTemplate, expected, failures, 'cocoplus.toml.template');
  }

  const principlesHtml = readFile(path.join(repoRoot, 'docs', 'principles.html'));
  const principleCount = (principlesHtml.match(/<h2 id="[0-9]/g) || []).length;
  if (principleCount !== 43) {
    failures.push(`docs/principles.html must contain 43 principle headings; found ${principleCount}`);
  }
  requireIncludes(principlesHtml, 'The Transcript Is the Source of Truth', failures, 'docs/principles.html');
  requireIncludes(principlesHtml, 'Timestamps Have Provenance', failures, 'docs/principles.html');
  requireIncludes(principlesHtml, 'Producers Never Grade Themselves', failures, 'docs/principles.html');
  requireIncludes(principlesHtml, 'Gate Weakening Requires a New Run', failures, 'docs/principles.html');
  requireIncludes(principlesHtml, 'Stable API Surface for Unstable Conditions', failures, 'docs/principles.html');
  requireIncludes(principlesHtml, 'Skill Is Memory', failures, 'docs/principles.html');

  const preToolUse = readFile(path.join(hooksDir, 'pre-tool-use.js'));
  requireIncludes(preToolUse, 'model_tier_floor_applied', failures, 'PreToolUse hook');
  requireIncludes(preToolUse, 'human_gate_blocked', failures, 'PreToolUse hook');
  requireIncludes(preToolUse, 'open-pre-tool-use', failures, 'PreToolUse hook');

  const postToolUse = readFile(path.join(hooksDir, 'post-tool-use.js'));
  requireIncludes(postToolUse, 'open-pre-tool-use', failures, 'PostToolUse hook');

  const notificationHook = readFile(path.join(hooksDir, 'notification.js'));
  requireIncludes(notificationHook, 'open-pre-tool-use', failures, 'Notification hook');

  const consoleScript = readFile(path.join(runtimeScriptsDir, 'cocoplus-console.js'));
  requireIncludes(consoleScript, 'translateIntent', failures, 'CocoConsole script');
  requireIncludes(consoleScript, 'Danger only', failures, 'CocoConsole script');
  requireIncludes(consoleScript, 'Human Gate Hold', failures, 'CocoConsole script');
  requireIncludes(consoleScript, '$flow gate-clear', failures, 'CocoConsole script');

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

  for (const filePath of textFiles) {
    const content = readFile(filePath);
    for (const pattern of stalePatterns) {
      if (pattern.test(content)) {
        failures.push(`Stale reference "${pattern.source}" found in ${path.relative(repoRoot, filePath)}`);
      }
    }
  }

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
    if (relative === '.cortex/skills/assist-mode/cocoplus-console.skill.md') continue;
    const content = readFile(filePath);
    for (const pattern of legacyRuntimeReferencePatterns) {
      if (pattern.test(content)) {
        failures.push(`Legacy runtime script reference found in ${relative}: ${pattern.source}`);
      }
    }
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

  for (const hookName of ['session-end.js', 'subagent-stop.js', 'user-prompt-submit.js']) {
    const hookContent = readFile(path.join(hooksDir, hookName));
    requireIncludes(hookContent, 'idempotency_key', failures, `${hookName} V2 queue writer`);
    requireIncludes(hookContent, 'stableQueueKey', failures, `${hookName} V2 queue writer`);
  }

  const runtimeQueueSkillPath = path.join(repoRoot, '.cortex', 'skills', 'execution-engine', 'runtime-queue.skill.md');
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

  const meterReconcileSkillPath = path.join(repoRoot, '.cortex', 'skills', 'cocometer', 'meter-reconcile.skill.md');
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

  const flowEventReaderSkillPath = path.join(repoRoot, '.cortex', 'skills', 'execution-engine', 'flow-event-reader.skill.md');
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

  const harvestSkill = readFile(path.join(repoRoot, '.cortex', 'skills', 'cocoharvest.skill.md'));
  if (!/pullThreshold/.test(harvestSkill) || !/\$pull <input>/.test(harvestSkill)) {
    failures.push('CocoHarvest skill must document automatic CocoPull use above pullThreshold');
  }

  const podInitSkill = readFile(path.join(repoRoot, '.cortex', 'skills', 'cocopod', 'pod-init.skill.md'));
  if (!podInitSkill.includes('lifecycle/cocowatch-session.md')) {
    failures.push('$pod init gitignore must exclude lifecycle/cocowatch-session.md');
  }

  const rewindSkill = readFile(path.join(repoRoot, '.cortex', 'skills', 'rewind.skill.md'));
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


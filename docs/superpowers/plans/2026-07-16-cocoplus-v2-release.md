# CocoPlus V2.0.0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Ship CocoPlus V2.0.0 as a full plugin evolution spanning V2 specs, runtime hooks, command skills, manifests, root docs, changelog, and docs HTML.

**Architecture:** V2 keeps the V1 plugin structure and adds conditional V2 behaviors through skills, hooks, manifest registration, and hook-local state helpers. CocoConsole is the only registered local runtime script; all other V2 modes are represented as feature-owned command surfaces, queued V2 runtime requests, and hook-mediated lifecycle state.

**Tech Stack:** Coco skills/agents/hooks, Node.js built-ins, Markdown/HTML docs, existing `scripts/validate-cocoplus.js` validation.

## Global Constraints

- Treat `reference requirements/2.0` and root plugin/docs changes as one V2.0.0 release.
- Preserve existing V1 behavior unless a V2 modification explicitly supersedes it.
- CocoConsole is read-only and local-only.
- CocoPilot, CocoForge, Leviathan/Ronin, and Dynamic Personas are opt-in modes.
- Governance hooks must support safe defaults and observe-mode rollout.
- Do not push; commit locally in logical sequence.

---

### Task 1: Register V2.0.0 Manifest Surface

**Files:**
- Modify: `plugin.json`
- Modify: `templates/cocoplus.toml.template`
- Modify: `templates/AGENTS.md.template`

**Interfaces:**
- Produces: V2 skill registrations and config keys consumed by command skills and hooks.

- [x] Bump `plugin.json` version to `2.0.0`.
- [x] Register V2 command skills: `$cocoplus console`, `$pilot on/off`, `$forge`, `$leviathan`, dynamic persona commands, governance status.
- [x] Register new runtime helper scripts needed for console and V2 state.
- [x] Add `[cocoplus]`, `[cocopilot]`, `[cocoforge]`, `[leviathan]`, `[dynamic_personas]`, and `[governance]` config sections.
- [x] Extend AGENTS template with V2 activation blocks.
- [x] Validate JSON with `node -e "JSON.parse(require('fs').readFileSync('plugin.json','utf8')); console.log('ok')"`.
- [x] Commit as `chore(release): register CocoPlus 2.0 manifest surface`.

### Task 2: Implement V2 Runtime Helpers and Hooks

**Files:**
- Create: `.cortex/scripts/cocoplus-console.js`
- Create: `.cortex/scripts/v2-state.js`
- Modify: `.cortex/hooks/user-prompt-submit.js`
- Modify: `.cortex/hooks/stop.js`
- Modify: `.cortex/hooks/pre-tool-use.js`
- Modify: `.cortex/hooks/post-tool-use.js`

**Interfaces:**
- Produces: `lifecycle/console-state.json`, `lifecycle/pilot-session.json`, `lifecycle/forge-state.json`, `lifecycle/forge-activity.jsonl`, `lifecycle/leviathan-state.json`, `lifecycle/governance-log.json`.

- [x] Add pure Node CocoConsole server with read-only panels and live-ish refresh.
- [x] Add shared V2 state helper for atomic JSON writes and lifecycle event append.
- [x] Add `$pilot` intercept state handling in UserPromptSubmit.
- [x] Add `$forge` priority intercept and forge checkpoint handling.
- [x] Add Leviathan checkpoint and session archive ingestion trigger.
- [x] Add ReviewerLockout policy in PreToolUse.
- [x] Add PII governance policy in PostToolUse.
- [x] Run focused hook smoke tests with sample stdin.
- [x] Commit as `feat(v2): add runtime hooks and local console server`.

### Task 3: Add V2 Skill-Native Command Surfaces

**Files:**
- Create/modify V2 skill files under `.cortex/skills/`
- Modify existing redirected view skills for `$flow view` and `$meter view`.

**Interfaces:**
- Consumes: V2 runtime state files and config sections.
- Produces: user-invocable command behavior for V2 modes.

- [x] Add `$cocoplus console` skill and stop/status variants.
- [x] Add `$pilot on` and `$pilot off` skills.
- [x] Add `$forge`, `$forge status`, and `$forge stop` skills.
- [x] Add `$leviathan on/off/status/learn` skills.
- [x] Add dynamic persona discover/list/invoke/dissolve skills.
- [x] Add governance status skill for ReviewerLockout and PII observe/enforce state.
- [x] Update `$flow view` and `$meter view` skills to redirect to console when running.
- [x] Commit as `feat(v2): add V2-native command surface`.

### Task 4: Update Product Docs and HTML Site

**Files:**
- Modify: `README.md`
- Modify: `CHANGELOG.md`
- Modify: `AGENTS.md`
- Modify: `INSTALLATION.md`
- Modify: all HTML in `docs/`

**Interfaces:**
- Consumes: implemented V2 manifest, hooks, and skills.
- Produces: public V2.0.0 release documentation.

- [x] Update root README to V2.0.0 and V2 feature map.
- [x] Add top changelog entry for V2.0.0.
- [x] Update docs HTML navigation and feature/command pages.
- [x] Ensure V2 docs mention the root implementation and `reference requirements/2.0` source specs.
- [x] Commit as `docs(v2): publish CocoPlus 2.0 documentation`.

### Task 5: Validate and Fix

**Files:**
- Modify only files required by validation findings.

**Interfaces:**
- Consumes: all previous tasks.
- Produces: validated release state.

- [x] Run `node scripts/validate-cocoplus.js`.
- [x] Run manifest skill/script existence checks.
- [x] Run targeted Node syntax checks for modified JS files.
- [x] Run `git status --short` and inspect final diff.
- [x] Commit validation fixes as `fix(v2): resolve release validation findings`.

### Task 6: Final Review Commit Hygiene

**Files:**
- Git only.

- [x] Confirm local commits are logically separated.
- [x] Confirm no push occurred.
- [x] Report commit SHAs and validation evidence.

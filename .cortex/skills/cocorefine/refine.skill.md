---
name: refine
description: Persistent prompt strategy learning loop — maintains a committed, evidence-attributed CocoStrategyBook so future CocoBrew sessions inherit proven prompt strategies instead of starting from a blank slate.
version: "1.0.0"
author: sgsshankar
tags:
  - cocorefine
  - strategic-learning
  - prompt-engineering
user-invocable: true
blocking: false
---

## Objective

You are executing a CocoRefine command. CocoRefine maintains the CocoStrategyBook at `cocoplus/strategies/` — a version-controlled, evidence-attributed repository of proven prompt strategies. It exists to prevent the self-citation failure mode: a strategy store must never grow because an agent believes its own reasoning was sound. Every strategy's attribution must cite a recorded evaluation result — a CocoContract evidence record, a CocoSentinel verdict, or a resolved SecondEye finding — never the recording agent's self-assessment.

Before proceeding, verify that `.cocoplus/` exists. If not, output: "CocoPlus is not initialized. Run `$pod init` first." Then stop.

## Commands

### `$refine search [query]`

Search `cocoplus/strategies/*.yaml` by task type, data characteristics, or keyword. Return matching strategies with their context fields and deprecation status. Exclude deprecated strategies from results unless `--include-deprecated` is passed.

### `$refine add`

Interactively collect all required fields, then write a new strategy YAML to `cocoplus/strategies/<strategy-id>.yaml`:

- **Identity**: strategy ID (slug), name, version (starts at 1), deprecation status (false)
- **Context**: task type, data characteristics, quality constraint (correctness / performance / security / maintainability)
- **Strategy content**: written in prescriptive, conditional-free form — no hedging language ("might help", "could improve", "in some cases")
- **Attribution**: session ID, the CocoContract evidence record or quality-gate verdict that confirmed effectiveness, function version hash at attribution time
- **Degradation conditions**: observed conditions where this strategy produced worse outcomes

**Reject the add if:**
- The strategy content contains hedging language (scan for "might", "could", "may help", "in some cases", "possibly")
- No evidence attribution record is provided — a self-authored justification ("I believe this works because...") is not sufficient

Run `node scripts/refine-update.js --op add --file <path>` to commit the mutation atomically.

### `$refine update <strategy-id>`

Create a new version of an existing strategy. Read the current YAML, increment the version number, append the prior version's content block to a `history` section (never delete it), apply the new content. Requires a new attribution record for the update — the same self-citation rejection rules from `$refine add` apply. Run `node scripts/refine-update.js --op update --id <strategy-id> --file <path>`.

### `$refine deprecate <strategy-id> [reason]`

Mark a strategy `deprecated: true` with the recorded reason and timestamp. The version history is preserved — deprecation is not deletion. Deprecated strategies are excluded from SkillbookView injection into future sessions. Run `node scripts/refine-update.js --op deprecate --id <strategy-id> --reason "<reason>"`.

### `$refine history <strategy-id>`

Display the full version history and attribution records for the named strategy, oldest to newest.

### `$refine status`

Report CocoStrategyBook health: total active strategies, strategies with passing attribution, strategies with stale attribution (the function version hash referenced in attribution no longer matches current source), strategies pending attribution.

## The Learning Cycle

CocoRefine's four-step cycle runs after evaluation results are available for a completed function:

1. **Execute** — CocoBrew loads matching strategies from the CocoStrategyBook into the agent's prompt context before build begins (SkillbookView, read-only). The injected strategy IDs are recorded in session metadata.
2. **Evaluate** — the declared CocoContract outcome contract or active quality gate runs against the function's output, producing an evidence record at a specific tier.
3. **Reflect** (`scripts/refine-reflect.js`, Tier 3 async, may invoke Haiku) — examines the actual trace data: injected strategy IDs, function version hash, model output/evaluation metadata when available, and the specific evaluation evidence record. **This step is prohibited from attributing effectiveness based on the reflecting agent's own assessment of strategy quality.** If the evaluation record is missing or incomplete, no attribution is produced — this is a valid, expected outcome, not an error to work around.
4. **Update** (`scripts/refine-update.js`) — applies the mutation atomically. Only `add`, `update`, and `deprecate` are permitted; no other write path exists.

## Access Control

Optimization and analysis agents receive a **read-only SkillbookView**: current strategy content and applicable context fields only — no attribution metadata, no version history. `refine-update.js` is the only write path, invoked only during the Update step of the learning cycle. No agent may call it outside that context. This prevents an optimization agent from modifying the strategy store mid-session in a way that could influence its own evaluation of the strategies being assessed.

## Exit Criteria

- `$refine add` rejects any strategy content containing hedging language
- `$refine add` and `$refine update` both require a real passing CocoContract, CocoSentinel, or resolved SecondEye evidence attribution record — self-authored justification and nonexistent references are rejected
- `$refine update` creates a new version record without overwriting or deleting the prior version
- `$refine deprecate` excludes the strategy from SkillbookView injection while preserving its version history
- Optimization agents receive read-only SkillbookView; they cannot invoke `refine-update.js` directly
- `refine-reflect.js` produces no attribution when the evaluation record is missing or incomplete

## Anti-Rationalization

| Temptation | Why Wrong |
|------------|-----------|
| Accept "this seemed to work well in the session" as attribution | That is self-citation — attribution must cite a recorded evidence record, verdict, or resolved finding, not agent impression |
| Soften a rejected hedging-language strategy instead of rewriting it prescriptively | Hedged strategies degrade the strategy book's signal — prescriptive rewriting is the fix, not acceptance |
| Let an optimization agent call `refine-update.js` directly to "save time" | Write access is isolated to the learning cycle's Update step specifically to prevent an agent from influencing the store it is being evaluated against |
| Overwrite a deprecated strategy's file to "clean up" | Deprecation preserves version history — physical deletion destroys the audit trail of what was tried and why it stopped working |
| Skip attribution when the evaluation record is incomplete, using the reflecting agent's judgment instead | Producing no attribution is the correct outcome here — never substitute the agent's own assessment for a missing evidence record |

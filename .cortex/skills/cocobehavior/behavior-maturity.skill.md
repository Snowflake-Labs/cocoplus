---
name: "behavior-maturity"
description: "Report the CocoPod's current automation maturity level (L0 Manual through L3 Autonomous-Eligible), computed deterministically from cocoplus.toml and active modes. Usage: $behavior maturity."
version: "1.0.0"
author: "CocoPlus"
tags:
  - cocoplus
  - cocobehavior
user-invocable: true
blocking: false
---

Your objective is to report the CocoPod's current automation maturity level.

Before proceeding, verify that `.cocoplus/` exists. If not, output: "CocoPlus not initialized in this directory. Run `$pod init` to begin." Then stop.

## Run the Assessment

Run `node scripts/behavior-maturity.js`. It reads `cocoplus.toml` and `.cocoplus/modes/` and writes `.cocoplus/maturity.json`.

## Maturity Levels

- **L0 — Manual:** No CocoPlus automation modes enabled beyond initialization. Every phase gate requires explicit developer action.
- **L1 — Assisted:** Core lifecycle automation enabled (memory, safety gate) but SecondEye/CocoSentinel are not yet configured with block rules.
- **L2 — Supervised:** SecondEye is active with block rules and CocoSentinel is configured for at least one artifact type. HITL stages still require developer approval before proceeding.
- **L3 — Autonomous-Eligible:** All ten L3 readiness items below pass. AFK stages may proceed without per-stage developer approval, subject to the Four-Tier Boundary Framework's NEVER tier.

**L3 Readiness Checklist** (all ten required — a CocoPod may not operate at L3 without passing this at `$pod init` or `$pod upgrade --l3`):

1. Budget guard exists
2. Verifier is structurally separate from generator
3. Failure escalation ladder is defined
4. Human override path is documented
5. Output allowlist is bounded
6. Mandatory path denylist is configured
7. Kill switch exists
8. Run log is committed
9. No same-agent verification is enforced
10. Attempt cap is set

If `cocoplus.toml` declares `automation_maturity = "L0".."L3"` or `maturity_level = "L0".."L3"`, the reported level is capped at that declaration. A pod may not operate above its declared and validated maturity level.

## Output

Display the current level and, if not yet L3, how many of the ten checklist items pass:

```
CocoBehavior Maturity — L2 (Supervised)
L3 readiness: 6/10 items passing
  ✓ cocoplus-context.md complete
  ✓ cocoplus.toml permission tiers defined
  ✗ CocoFlow deterministic fallbacks — missing for 2 stage handlers
  ...
```

`$pod status` also surfaces this result from `.cocoplus/maturity.json` without re-running the assessment.

## Exit Criteria

- `scripts/behavior-maturity.js` runs deterministically (no LLM) and writes `.cocoplus/maturity.json`
- Reported level matches the highest tier whose conditions are fully satisfied
- L3 is only reported when all ten readiness checklist items pass
- Failing checklist items are named specifically, not just counted

## Anti-Rationalization

| Temptation | Why Wrong |
|------------|-----------|
| Report L3 when nine of ten items pass because "it's close enough" | L3 unlocks reduced developer oversight for AFK stages — a single unmet item is a real gap, not a rounding error |
| Use LLM judgment to assess a checklist item instead of the deterministic script | Maturity level gates autonomy — it must be reproducible and auditable, not a judgment call that could vary between runs |

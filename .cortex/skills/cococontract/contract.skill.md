---
name: contract
description: Outcome-driven Cortex function development — declares a behavioral contract before generation begins, enforces evidence-tiered proof before $ship, and defends against the self-oracle evaluation failure mode.
version: "1.0.0"
author: sgsshankar
tags:
  - cococontract
  - outcome-certainty
  - quality-gate
  - evidence
user-invocable: true
blocking: true
---

## Objective

You are executing a CocoContract command. CocoContract exists to defend against the self-oracle problem: an agent that generates a function and evaluates it against criteria the same agent authored produces a tautological, self-confirming result regardless of the function's real-world behavior. CocoContract breaks this loop by requiring the behavioral standard — the outcome contract — to exist before generation begins, authored independently of the generation context.

Before proceeding, verify that `.cocoplus/` exists. If not, output: "CocoPlus is not initialized. Run `$pod init` first." Then stop.

## Commands

### `$contract init [function-name]`

Guide the developer through declaring a new outcome contract with three required fields:

1. **Persona** — a named role from the eight CocoPod personas (Cortex Architect, Data Engineer, ML Engineer, Analytics Engineer, Security Engineer, Data Scientist, DevOps Engineer, Business Analyst). Reject generic roles ("a developer", "an analyst") — the persona must identify a specific role in a specific workflow context.
2. **Observable Result** — a specific, falsifiable state change the named persona will observe when the function works correctly, in non-technical, non-implementation language. Reject results phrased as return values or implementation detail ("the function returns a JSON object with field X") — restate in persona-observable terms.
3. **Falsifiability Condition** — a concrete test that would demonstrate failure: the specific condition under which the contract is violated.

Validate each field inline before accepting it. Write the completed contract to `outcomes/<function-name>/contract.md` and commit it. This commit is what the pre-build gate (`contract-gate.js`) checks for before `$spec` or `$build` is permitted to proceed for this function.

### `$contract check [function-name]`

Report: contract present and committed (yes/no), current evidence tier and staleness (source hash comparison), and `$ship` eligibility (blocked / eligible).

### `$contract prove [function-name] --tier <tier>`

Tiers, ordered by epistemic strength (strongest first):

- **e2e** (Tier 1) — executed against a real Cortex endpoint with a real input matching the persona's context; observable result confirmed by a human or a machine check with no shared session context with the generator. Only tier that satisfies `$ship`.
- **reference** (Tier 2) — output compared against an externally sourced golden dataset, not authored by the generating agent, predating the session. Also satisfies `$ship`.
- **spec** (Tier 3) — validated against an externally stated requirement or standard.
- **differential** (Tier 4) — demonstrated measurably better than a documented, pre-existing baseline.
- **unit** (Tier 5) — evaluated against criteria authored in the same session by the same or a context-sharing agent. **Insufficient for `$ship` certification regardless of thoroughness.** Recordable as developmental context only.

Run `node scripts/contract-prove.js --function <function-name> --tier <tier> --description "<text>"`. The script performs the Tier 1 state check synchronously (<200ms) and, for e2e evidence with a machine-executable falsifiability condition, executes the Cortex endpoint check asynchronously. It records the result in `contract-evidence.json` keyed to the function's current source hash.

### `$contract archive [function-name]`

After the function ships, move the current contract and evidence into `outcomes/<function-name>/` as the permanent archive: `contract.md`, `evidence/` (timestamped records per tier), `history.md` (revision log). Commit the archive.

If `contract.md` already exists in the archive and its content differs from the current working contract, this is a behavioral revision: show the diff, require explicit developer confirmation of the revision, and append to `history.md` before overwriting. Never silently overwrite a prior behavioral commitment.

### `$contract ci`

Run `node scripts/contract-prove.js --ci`. This re-executes every archived contract's falsifiability condition where it is machine-executable, reports pass/fail per contract, and exits non-zero if any contract fails re-execution (a behavioral regression). Intended for use as a pre-deployment CI gate.

### `$contract status`

List all active contracts across the CocoPod with their evidence tier and `$ship` eligibility.

## Stop Hook Enforcement (`$ship` gate)

`contract-gate.js` is invoked from `user-prompt-submit.js` for `$spec`, `$build`, and `$ship`. Two conditions gate `$ship`:

1. **Evidence Exists** — at least one Tier 1 (e2e) or Tier 2 (reference) evidence record must exist in `contract-evidence.json` for every function in the deployment artifact. Tier 3–5 evidence is treated as no evidence for this purpose.
2. **Evidence Is Not Stale** — evidence is keyed to the function's source hash at proof time. If source has changed since, the evidence is stale and treated as absent.

If either condition fails, `$ship` returns a blocking message naming the functions with missing or stale evidence and the tier required. **There are no override flags and no bypass mechanisms.** This is an architectural invariant, not a configurable policy.

## Exit Criteria

- `$contract init` commits `outcomes/<name>/contract.md` only after all three fields pass inline validation
- `$contract prove --tier e2e` records evidence bound to the current source hash
- `$ship` is blocked when evidence is absent, blocked when evidence is stale, and proceeds only with fresh Tier 1/2 evidence
- `$contract ci` exits non-zero on any archived-contract regression
- No code path exists that bypasses the evidence-tier or staleness check for `$ship`

## Anti-Rationalization

| Temptation | Why Wrong |
|------------|-----------|
| Accept "a developer" or "a user" as the persona field | Generic personas make the contract unfalsifiable against a real workflow — the whole point is a specific observer |
| Let Tier 5 (unit/self) evidence satisfy `$ship` because the evaluation "looked thorough" | Tier 5 is authored in the same session as the function — it is definitionally the self-oracle failure mode CocoContract exists to prevent |
| Add a `--force` or `--skip-contract` flag for urgent ships | No override flags exist by design — an urgent ship with unproven behavior is exactly the failure this gate stops |
| Overwrite `outcomes/<name>/contract.md` silently when behavior changes | The diff must be visible and the revision explicit — silent overwrite lets implementation drift retroactively redefine the requirement |
| Treat stale evidence as still valid because "the change was small" | Staleness is keyed to source hash, not developer judgment of change size — any hash change invalidates the evidence |

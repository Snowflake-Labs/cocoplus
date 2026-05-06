---
name: seed-add
description: Store a forward-looking idea with a trigger condition — the idea will surface automatically when the project reaches the specified state
version: 1.0.2
user-invocable: true
command: /seed add "<idea>" --trigger "<condition>"
feature: CocoSeed (Feature 29)
---

# /seed add "\<idea\>" --trigger "\<condition\>"

Store a deferred idea with an explicit trigger condition. The idea is surfaced by `/seed list` and the SessionStart hook when the trigger condition is met.

## Preconditions

- `.cocoplus/` must be initialized
- Both the idea text and a `--trigger` condition are required

## Arguments

- `"<idea>"` (required): The idea text. Quoted string. Should describe a specific future improvement, feature, or experiment.
- `--trigger "<condition>"` (required): A plain-language condition describing when this idea should be acted on. Examples:
  - `"when CocoMap is committed"` (filesystem check: `.cocoplus/map/coco-map.json` exists)
  - `"when Build phase completes"` (lifecycle phase check)
  - `"when evaluation accuracy exceeds 90%"` (manual — always shown as pending manual confirmation)
  - `"when CocoMap is active"` (mode flag check)

## Step-by-Step Behavior

1. **Verify initialization:** Check `.cocoplus/` exists. If not, output: "CocoPlus not initialized. Run `/pod init` first." and exit.

2. **Validate arguments:**
   - If idea text is missing, output: "Idea text is required. Use: `/seed add \"<idea>\" --trigger \"<condition>\"`" and exit.
   - If `--trigger` is missing, output: "A trigger condition is required. Use: `/seed add \"<idea>\" --trigger \"<condition>\"`" and exit.

3. **Generate seed ID:** Create a timestamp-based ID: `seed-[YYYYMMDD-HHmmss]` (compact ISO8601).

4. **Read current lifecycle phase:** Read `.cocoplus/lifecycle/meta.json` to get the current phase. Use "unknown" if meta.json does not exist.

5. **Create seeds directory:** Ensure `.cocoplus/seeds/` exists. Create if missing.

6. **Write seed file** to `.cocoplus/seeds/[seed-id].yaml`:
   ```yaml
   id: seed-[timestamp]
   idea: "[idea text]"
   trigger: "[trigger condition text]"
   captured_phase: [current CocoBrew phase]
   captured_date: [ISO8601]
   status: pending
   ```

7. **Confirm to developer:**
   ```
   ✓ Seed stored as [seed-id]
   Idea: [idea text]
   Will surface when: [trigger condition]
   
   Run /seed list to check trigger status.
   ```

## Error Cases

- **Missing idea or trigger:** Output usage message and exit; do not write partial file
- **Cannot create seeds directory:** Output filesystem error
- **Cannot write seed file:** Output error

## Exit Criteria

This skill is complete when:
- Seed YAML file is written to `.cocoplus/seeds/`
- Developer has received confirmation with the seed ID and trigger condition

## Anti-Rationalization

Do NOT:
- Create a git commit (seeds are committed with the next CocoBrew lifecycle phase commit)
- Evaluate the trigger condition at add time — that happens in `/seed list`
- Automatically promote the idea to spec.md — that is always an explicit developer action

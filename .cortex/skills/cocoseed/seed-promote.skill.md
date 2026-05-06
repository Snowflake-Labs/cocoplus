---
name: seed-promote
description: Move a triggered seed idea into the CocoBrew spec backlog — writes it to lifecycle/spec.md under a Backlog Items section and marks the seed as promoted
version: 1.0.2
user-invocable: true
command: /seed promote <id>
feature: CocoSeed (Feature 29)
---

# /seed promote \<id\>

Move a triggered seed into the CocoBrew planning cycle by writing it to `lifecycle/spec.md` under a "Backlog Items" section. Marks the seed as promoted.

## Preconditions

- `.cocoplus/` must be initialized
- Seed `<id>` must exist and have `status: triggered` (not pending, promoted, or discarded)
- `lifecycle/spec.md` should exist (creates Backlog Items section if file exists; warns if spec.md does not yet exist)

## Arguments

- `<id>` (required): The seed ID to promote (e.g., `seed-20260505-143200`)

## Step-by-Step Behavior

1. **Verify initialization:** Check `.cocoplus/` exists. If not, output: "CocoPlus not initialized. Run `/pod init` first." and exit.

2. **Validate seed ID:** Read `.cocoplus/seeds/[id].yaml`.
   - If file does not exist, output: "No seed with ID [id]. Run `/seed list` to see available seeds." and exit.
   - If `status` is `pending`, output: "Seed [id] has not triggered yet. Trigger condition: [condition]. Use `/seed list` to check status." and exit.
   - If `status` is `promoted`, output: "Seed [id] was already promoted on [promoted_date]." and exit.
   - If `status` is `discarded`, output: "Seed [id] was discarded. If you want to re-activate it, add it again with `/seed add`." and exit.

3. **Read idea and metadata:** Extract from YAML: `idea`, `trigger`, `captured_phase`, `captured_date`, `triggered_date`.

4. **Write to spec.md:** Open `.cocoplus/lifecycle/spec.md`.
   - If `spec.md` does not exist, output: "Warning: `spec.md` not found. Run `/spec` first to create the specification. Seed saved as triggered — promote again after completing `/spec`." and exit.
   - If `spec.md` exists: check if a `## Backlog Items` section already exists.
     - If yes: append the idea as a new bullet under that section.
     - If no: append a new `## Backlog Items` section at the end of the file with the idea as the first bullet.

   Backlog item format:
   ```markdown
   ## Backlog Items

   - **[seed-id]:** [idea text]
     _(Captured during [captured_phase] phase — triggered: [trigger condition] on [triggered_date])_
   ```

5. **Update seed status:** Write updated YAML with `status: promoted` and `promoted_date: [ISO8601]`.

6. **Confirm to developer:**
   ```
   ✓ Seed [seed-id] promoted to spec backlog.
   
   Idea: [idea text]
   Added to: .cocoplus/lifecycle/spec.md → Backlog Items
   
   Run /spec to incorporate it into the next spec cycle.
   ```

## Error Cases

- **Seed file not found:** Output message with suggestion to run `/seed list`
- **Seed not triggered:** Output status and trigger condition; do not promote
- **spec.md not found:** Warn and exit without promoting; seed remains `triggered` for re-promotion
- **Cannot write to spec.md:** Output filesystem error; do not update seed status

## Exit Criteria

This skill is complete when:
- Idea is appended to `spec.md` under Backlog Items
- Seed YAML file is updated with `status: promoted`
- Developer has received confirmation

## Anti-Rationalization

Do NOT:
- Automatically run `/spec` after promotion — that is always an explicit developer action
- Delete the seed file — it stays with `status: promoted` as a record
- Create a standalone git commit — spec.md changes are committed with the next `/spec` invocation

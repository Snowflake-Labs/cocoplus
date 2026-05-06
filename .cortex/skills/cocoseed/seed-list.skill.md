---
name: seed-list
description: Evaluate all pending seed trigger conditions against current project state and show which ideas are ready to promote and which are still waiting
version: 1.0.2
user-invocable: true
command: /seed list
feature: CocoSeed (Feature 29)
---

# /seed list

Evaluate all stored seeds against current project state. Shows two sections: seeds Ready to Promote (trigger has fired) and seeds Waiting (trigger not yet met).

## Preconditions

- `.cocoplus/` must be initialized
- `.cocoplus/seeds/` directory may be empty (outputs "No pending seeds" if so)

## Step-by-Step Behavior

1. **Verify initialization:** Check `.cocoplus/` exists. If not, output: "CocoPlus not initialized. Run `/pod init` first." and exit.

2. **Read all seed files:** Load all `.yaml` files from `.cocoplus/seeds/` with `status: pending` or `status: triggered`. Skip seeds with `status: promoted` or `status: discarded`.

3. **If no seeds found:** Output: "No pending seeds. Add ideas with `/seed add`." and exit.

4. **Evaluate each trigger condition** against current project state:

   **Filesystem presence checks:**
   - "when coco-map.json exists" / "when CocoMap is committed" → check `.cocoplus/map/coco-map.json`
   - "when [feature] is active" → check corresponding mode flag in `.cocoplus/modes/`
   - "when [filename] exists" → check for that file in `.cocoplus/`

   **Lifecycle phase checks:**
   - "when Build phase completes" → read `.cocoplus/lifecycle/meta.json`, check if `build` phase is in completed phases
   - "when Ship phase completes" → check if lifecycle phase is "shipped"
   - "when [phase] phase begins" → check current phase field

   **Mode flag checks:**
   - "when [feature] is enabled" → check `.cocoplus/modes/[feature].on`

   **Manual conditions** (plain language not matching above patterns):
   - Always show as "pending manual confirmation" — do not auto-trigger

5. **Update triggered status:** For any seed whose condition just fired (was `pending`, now evaluates as triggered), update its `.yaml` file: set `status: triggered`, add `triggered_date: [ISO8601]`.

6. **Display output** in two sections:

```
Seeds Ready to Promote ([N]):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[seed-id] — [idea]
  Triggered: [trigger condition that fired]
  Captured during: [captured_phase] phase on [captured_date]
  Promote with: /seed promote [seed-id]

[repeat for each triggered seed]

Seeds Waiting ([N]):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[seed-id] — [idea]
  Waiting for: [trigger condition]
  Status: [not yet / pending manual confirmation]
  Captured during: [captured_phase] phase on [captured_date]

[repeat for each waiting seed]
```

7. **If no triggered seeds:** Display only the Waiting section with message: "No seeds are ready yet. Trigger conditions are still pending."

## Error Cases

- **Seeds directory missing:** Output "No seeds directory found. Add ideas with `/seed add`." and exit
- **Corrupt YAML file:** Skip and warn: "Could not read [filename]. Check file format."

## Exit Criteria

This skill is complete when:
- All seeds are evaluated against current state
- Triggered seeds have been updated in their YAML files
- Two-section display is shown to developer

## Anti-Rationalization

Do NOT:
- Automatically promote any seed — that is always `/seed promote`
- Create any git commit
- Modify seed content (idea or trigger) — only `status` and `triggered_date` are updated

---
name: bloom-crystallize
description: CocoBloom crystallization — converts a successful ship execution trace into a reusable skill file. Requires recent successful $ship. Invoked via $bloom crystallize.
version: "1.0.0"
author: CocoPlus
tags:
  - cocobloom
  - crystallization
  - skill-promotion
user-invocable: true
blocking: true
---

## Objective

You are executing the CocoBloom crystallization pathway. Your task is to extract a reusable skill from a recently completed and shipped execution trace.

Before proceeding, verify that `.cocoplus/` exists. If not, output: "CocoPlus is not initialized. Run `$pod init` first." Then stop.

## Step 1 — Verify Recent Successful Ship

Read `.cocoplus/lifecycle/meta.json`. Check that:
- `current_phase` is `"ship"` and `ship_completed_at` exists, OR
- The most recent phase entry shows a successful ship within the last 7 days

If no recent successful `$ship` found, output: "CocoBloom crystallization requires a recent successful `$ship`. Complete the lifecycle through the Ship phase before crystallizing." Then stop.

## Step 2 — Read Execution Trace

Read `.cocoplus/lifecycle/deployment.md` and the most recent flow stage outputs from `.cocoplus/flow.json` runtime state. Collect:
- What was built (deliverables)
- Which patterns were applied
- Key decisions made
- Commands and sequences that worked well
- Any non-obvious techniques used

## Step 3 — Spawn Trace Reader (Haiku)

Pass the execution trace to a Haiku sub-agent with this mandate:

"Read the execution trace and identify the most reusable pattern. A reusable pattern is:
1. A sequence of steps that would apply to similar future tasks
2. Not specific to this project's data (generalizable with parameters)
3. Meaningful enough that having it as a skill would save 10+ minutes of re-derivation

Output:
- Pattern name (kebab-case, ≤5 words)
- What problem it solves (1 sentence)
- The generalized step sequence (numbered)
- Parameters that would need to be filled in for a new project
- What makes it non-obvious (why is this worth preserving?)

If no generalizable pattern exists, output: NO_CRYSTALLIZABLE_PATTERN"

If the sub-agent outputs NO_CRYSTALLIZABLE_PATTERN, tell the developer: "No generalizable pattern found in this execution trace. Crystallization requires a pattern that would apply to future projects." Then stop.

## Step 4 — Spawn Pattern Abstractor (Sonnet)

Pass the trace reader output to a Sonnet sub-agent with this mandate:

"Transform the identified pattern into a properly formatted CocoPlus skill file. The skill must:
1. Follow the standard SKILL.md frontmatter format (name, description, version, author, tags)
2. Have a clear objective statement
3. List steps as numbered actions with specific file paths
4. Include an Anti-Rationalization table
5. Include Exit Criteria
6. Use $<parameter> syntax for project-specific values that need to be filled in
7. Be ~50-100 lines — specific enough to be useful, general enough to apply elsewhere

Output the complete skill file content."

## Step 5 — Present Draft for Developer Review

Show the proposed skill:

```
CocoBloom Crystallization — Draft Skill

Name: <slug>
Description: <description>

[skill content preview]

Accept this skill? Type ACCEPT to write, REVISE to provide feedback, or DISCARD to cancel.
```

Wait for developer input.

If REVISE: collect feedback and re-run Step 4 with the feedback as additional constraints.
If DISCARD: output "Crystallization cancelled." and stop.

## Step 6 — Write Skill File

Only after developer ACCEPT, write the skill to `.cortex/skills/crystallized/<slug>.skill.md` with `source: crystallized` in frontmatter metadata.

Create `.cortex/skills/crystallized/` directory if it does not exist.

## Step 7 — Commit

Create git commit: `feat(skills): crystallize <slug> skill from execution trace`

## Step 8 — Output Confirmation

```
CocoBloom: skill crystallized.
  File: .cortex/skills/crystallized/<slug>.skill.md
  Source: crystallized from <deployment.md date>
  Invoke with: $<slug>

The skill is a project artifact — committed to git and available for future sessions.
```

## Anti-Rationalization Table

| Shortcut / Temptation | Why It Fails |
|-----------------------|--------------|
| Skip the ship verification | Crystallizing from an incomplete execution produces a skill that reflects partial work |
| Write the skill without developer ACCEPT | Developer must review — the abstractor may over-generalize or under-generalize |
| Skip the trace reader and go directly to abstractor | Trace reader identifies what is worth crystallizing — without it, the abstractor works on everything |

## Exit Criteria

- Skill file written only after developer ACCEPT
- `source: crystallized` metadata present in frontmatter
- Git commit created
- Skill is general enough to apply to future projects (not hardcoded to current project data)

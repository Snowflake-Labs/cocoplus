---
name: "rewind"
description: "Roll back the CocoBrew lifecycle to a prior phase commit. Performs a git soft reset to the specified phase ID commit, discards subsequent commits, and updates AGENTS.md phase state. Use with caution — subsequent phase artifacts will be removed."
version: "1.0.0"
author: "CocoPlus"
tags:
  - cocoplus
  - lifecycle-engine
---

Your objective is to roll back the CocoBrew lifecycle to a prior phase commit.

Before proceeding, verify that `.cocoplus/` exists.
If not: output "CocoPlus not initialized in this directory. Run `/pod init` to begin." Then stop.

## Usage

`/rewind [step-id]` — e.g., `/rewind spec-20260405-001`

If no step-id is provided, list available phase commits:
```
git log --oneline --grep="feat(spec)\|feat(plan)\|build:\|test:\|docs(review)\|release:"
```

## Confirm Rollback

Display what will be removed:
```
git log [target-commit]..HEAD --oneline
```

Output: "Rolling back to [step-id] will remove these commits. This cannot be undone without using git reflog. Continue? (yes/no)"
If no: stop.

## Perform Rollback

Find the commit SHA for the step-id by searching git log for the phase commit message.
Perform a soft reset:
```
git reset --soft [target-commit-sha]
```

## Update State

Read the phase from the step-id (e.g., `spec-*` → phase is spec).
Update `.cocoplus/lifecycle/meta.json`: set `current_phase` to the target phase, remove subsequent phases from `phases_completed`.

Update AGENTS.md: replace phase line with rolled-back phase.

Output: "Rolled back to [step-id]. Current phase: [phase]. Subsequent phase artifacts have been unstaged. Use `git checkout -- .cocoplus/` to also discard working tree changes if needed."

## Anti-Rationalization

| Shortcut / Temptation | Why It Fails |
|-----------------------|--------------|
| Rewind without showing commit range impact | Developer cannot make an informed rollback decision |
| Use hard reset instead of soft reset | Destroys working changes and increases recovery risk |
| Skip phase-state updates after reset | CocoBrew state diverges from git history and breaks later stages |

## Exit Criteria

- [ ] Available lifecycle commits are shown when no `step-id` is provided
- [ ] Developer receives an explicit confirmation prompt with the commit range to be removed
- [ ] `git reset --soft [target-commit-sha]` is executed only after confirmation
- [ ] `.cocoplus/lifecycle/meta.json` and `.cocoplus/AGENTS.md` phase state are updated to the target lifecycle phase

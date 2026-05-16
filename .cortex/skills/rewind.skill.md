---
name: "rewind"
description: "Roll back the CocoBrew lifecycle to a prior phase commit. Performs a git soft reset to the specified phase ID commit, discards subsequent commits, and updates AGENTS.md phase state. Use with caution — subsequent phase artifacts will be removed."
version: "1.0.1"
author: "CocoPlus"
tags:
  - cocoplus
  - lifecycle-engine
---

Your objective is to roll back the CocoBrew lifecycle to a prior phase commit.

Before proceeding, verify that `.cocoplus/` exists.
If not: output "CocoPlus not initialized in this directory. Run `/pod init` to begin." Then stop.

## Usage

`$rewind [step-id]` — e.g., `$rewind spec-20260405-001`
`$rewind --tag [tag-name]` — e.g., `$rewind --tag cocoplus/harvest/hr-20260511-4a2f/task-007`
`$rewind --tag task-007` — abbreviated form (last segment only for harvest tags)

If no step-id or tag is provided, list available phase commits and CocoPlus tags:
```
git log --oneline --grep="feat(spec)\|feat(plan)\|build:\|test:\|docs(review)\|release:"
git tag --list "cocoplus/*" --sort=-creatordate | head -20
```

## Tag-Based Rollback (--tag flag)

If `--tag` flag provided:
1. Resolve the full tag name — if abbreviated (e.g., `task-007`), search `git tag --list "cocoplus/harvest/*/task-007"` for the full name
2. If not found: output "Tag [tag-name] not found. Run `git tag --list 'cocoplus/*'` to see available tags." Then stop.
3. Resolve the commit SHA: `git rev-list -n 1 [full-tag-name]`
4. Proceed to Confirm Rollback with the resolved commit SHA and tag name as the step-id display

**Sub-phase tags created by CocoHarvest:**
- Format: `cocoplus/harvest/[run-id]/task-[N]` — created on each CocoHarvest task completion
- Format: `cocoplus/fn/[function-name]/v[N]` — created on each Cortex function deployment stage

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

## Prune Stale Worktrees

After the reset, remove any CocoHarvest worktrees from the now-removed Build phase to prevent naming collisions on future builds:
```
node -e "
const { execSync } = require('child_process');
try {
  const out = execSync('git worktree list --porcelain').toString();
  const trees = out.split('\n\n').filter(Boolean);
  for (const tree of trees) {
    const lines = tree.trim().split('\n');
    const wtPath = lines[0].replace(/^worktree /, '');
    if (/[/\\\\]agent[/\\\\]stage-/.test(wtPath)) {
      try { execSync('git worktree remove --force \"' + wtPath + '\"'); } catch(_) {}
    }
  }
  execSync('git worktree prune');
} catch(e) { /* worktree cleanup is best-effort */ }
"
```

## Update State

Read the phase from the step-id (e.g., `spec-*` → phase is spec).
Update `.cocoplus/lifecycle/meta.json`: set `current_phase` to the target phase, remove subsequent phases from `phases_completed`.

Update AGENTS.md: replace phase line with rolled-back phase.

Output: "Rolled back to [step-id]. Current phase: [phase]. Subsequent phase artifacts have been unstaged. Stale build worktrees have been pruned. Use `git checkout -- .cocoplus/` to also discard working tree changes if needed."

## Anti-Rationalization

| Shortcut / Temptation | Why It Fails |
|-----------------------|--------------|
| Rewind without showing commit range impact | Developer cannot make an informed rollback decision |
| Use hard reset instead of soft reset | Destroys working changes and increases recovery risk |
| Skip phase-state updates after reset | CocoBrew state diverges from git history and breaks later stages |

## Exit Criteria

- [ ] Available lifecycle commits and CocoPlus tags are shown when no `step-id` or `--tag` is provided
- [ ] Developer receives an explicit confirmation prompt with the commit range to be removed
- [ ] `git reset --soft [target-commit-sha]` is executed only after confirmation
- [ ] `.cocoplus/lifecycle/meta.json` and `.cocoplus/AGENTS.md` phase state are updated to the target lifecycle phase
- [ ] `--tag` abbreviated form resolves to full tag name before rollback
- [ ] Tag not found produces an actionable error with the list command

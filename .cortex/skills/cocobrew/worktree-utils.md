# Worktree Utilities

Internal documentation for worktree patterns used by CocoHarvest and flow-run.

## create_worktree

```bash
git worktree add .git/worktrees/[stage-id] -b agent/[stage-id]
```

## merge_worktree

```bash
git -C .git/worktrees/[stage-id] add .
git -C .git/worktrees/[stage-id] commit -m "build([stage-id]): stage complete"
git merge agent/[stage-id]
git worktree remove .git/worktrees/[stage-id]
git branch -d agent/[stage-id]
```

## cleanup_worktree (discard)

```bash
git worktree remove --force .git/worktrees/[stage-id]
git branch -D agent/[stage-id]
```

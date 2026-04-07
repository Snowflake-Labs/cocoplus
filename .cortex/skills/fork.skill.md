---
name: "fork"
description: "Create an exploration git worktree on a new branch from the current phase. Allows isolated experimentation that can be merged back or discarded without affecting the main branch."
version: "1.0.0"
author: "CocoPlus"
tags:
  - cocoplus
  - lifecycle-engine
---

Your objective is to create a git worktree for isolated exploration.

Before proceeding, verify that `.cocoplus/` exists.
If not: output "CocoPlus is not initialized. Run `/pod init` first." Then stop.

## Usage

`/fork [branch-name]` — creates a worktree on branch `explore/[branch-name]`

If no branch-name provided: output "Usage: /fork [branch-name] — e.g., /fork try-new-schema" Then stop.

## Create Worktree

```
BRANCH_NAME="explore/[branch-name]"
WORKTREE_PATH="../[project-dir]-explore-[branch-name]"
git worktree add "$WORKTREE_PATH" -b "$BRANCH_NAME"
```

## Output

Output:
```
Exploration worktree created.
Branch: explore/[branch-name]
Path: [worktree-path]

In the new worktree, all .cocoplus/ state is shared (same files).
Your changes in the worktree are isolated on the explore/[branch-name] branch.

To merge back:  git merge explore/[branch-name]
To discard:     git worktree remove [worktree-path] && git branch -d explore/[branch-name]
```

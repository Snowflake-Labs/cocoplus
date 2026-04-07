---
name: "ship"
description: "Enter the Ship phase of CocoBrew. Reads review.md approval, generates structured commit, creates semantic version tag, optionally creates PR via gh CLI, and records deployment details. Requires approved review."
version: "1.0.0"
author: "CocoPlus"
tags:
  - cocoplus
  - lifecycle-engine
---

You are executing the Ship phase (6/6) of CocoBrew.

Before proceeding, verify that `.cocoplus/` exists.
If not: output "CocoPlus is not initialized in this directory. Run `/pod init` first." Then stop.

Read `.cocoplus/lifecycle/meta.json`. Verify `phases_completed` contains `"review"`.
If not: output "The Review phase must be approved before shipping. Run `/review` first." Then stop.

Read `.cocoplus/lifecycle/review.md`. Verify `## Approval Status` contains `APPROVED`.
If not: output "Review has not been approved. Run `/review` to complete the approval process." Then stop.

## Determine Version

Read git tags to find the highest existing version tag matching `v*.*.*`.
Prompt: "Current version: [current or 0.0.0]. What semantic version should this release be? (e.g., v1.0.0, v0.2.1)"
Use the developer's answer as the version.

## Full Diff Review

Show the developer a summary of all changes since the last version tag (or initial commit):
```
git diff [last-tag]..HEAD --stat
```

Ask: "These are all changes included in this release. Proceed with shipping? (yes/no)"
If no: stop.

## Create Deployment Record

Write `.cocoplus/lifecycle/deployment.md`:

```markdown
# Deployment Record

**Date:** [ISO 8601 timestamp]
**Phase:** Ship (6/6)
**Version:** [version]
**Phase ID:** ship-YYYYMMDD-001

## Changes Shipped
[Summary of git diff stat]

## Spec ID
[spec ID from meta.json]

## Plan ID
[plan ID from meta.json]

## Review Approval
Approved: [timestamp from review.md]

## Commit SHA
[will be filled after commit]

## PR URL
[if PR was created, URL here — otherwise "Not created"]
```

## Create Final Commit and Tag

```
git add .cocoplus/lifecycle/deployment.md .cocoplus/lifecycle/meta.json .cocoplus/AGENTS.md
git commit -m "release: [version] — [brief description from project.md goal]"
git tag -a [version] -m "CocoPlus release [version]"
```

## Optional PR Creation

Prompt: "Do you want to create a pull request? (yes/no)"
If yes:
- Check if `gh` CLI is available: `which gh`
- If available: `gh pr create --title "[version]: [project name]" --body "$(cat .cocoplus/lifecycle/review.md)"`
- If not available: output "gh CLI not found. Install it from https://cli.github.com/ to create PRs automatically."

Update `deployment.md` with commit SHA and PR URL.

## Update State

Update `lifecycle/meta.json` — add ship to phases_completed, set current_phase to "shipped".
Append to AGENTS.md (≤200 lines): `Phase: SHIPPED — Version [version] — [timestamp]`

Output:
```
Shipped successfully!
Version: [version]
Tag: [version]
PR: [URL or "not created"]

Full CocoBrew lifecycle complete: Spec → Plan → Build → Test → Review → Ship ✓
```

---
name: "ship"
description: "Enter the Ship phase of CocoBrew. Reads review.md approval, generates structured commit, creates semantic version tag, optionally creates PR via gh CLI, and records deployment details. Requires approved review."
version: "1.1.0"
author: "CocoPlus"
tags:
  - cocoplus
  - lifecycle-engine
---

You are executing the Ship phase (6/6) of CocoBrew.

Before proceeding, verify that `.cocoplus/` exists.
If not: output "CocoPlus not initialized in this directory. Run `$pod init` to begin." Then stop.

Read `.cocoplus/lifecycle/meta.json`. Verify `phases_completed` contains `"review"`.
If not: output "The Review phase must be approved before shipping. Run `$review` first." Then stop.

Verify that required lifecycle artifact files exist on disk — meta.json alone is not sufficient:
- Check `.cocoplus/lifecycle/spec.md` exists. If not: output "spec.md is missing. Run `$spec` to regenerate it before shipping." Then stop.
- Check `.cocoplus/lifecycle/plan.md` exists. If not: output "plan.md is missing. Run `$plan` to regenerate it before shipping." Then stop.
- Check `.cocoplus/lifecycle/review.md` exists. If not: output "review.md is missing. Run `$review` to regenerate it before shipping." Then stop.

Read `.cocoplus/lifecycle/review.md`. Verify `## Approval Status` contains `APPROVED`.
If not: output "Review has not been approved. Run `$review` to complete the approval process." Then stop.

Read `.cocoplus/lifecycle/review-state.json` if it exists. If any finding has `severity: BLOCKED` and `resolved` is not `true`:
Output: "Ship blocked: [N] unresolved BLOCKED finding(s) require a human decision before shipping. Run `$review clear-blocked --id <finding-id> --rationale <text>` to resolve each one." List each unresolved finding's ID and one-line summary. Then stop. **BLOCKED findings are treated identically to BLOCKING findings — there is no override.**

## Determine Version

First inspect the current git branch and look for a semantic version token:
```
node -e "
const { spawnSync } = require('child_process');
const branch = spawnSync('git', ['branch', '--show-current'], { encoding: 'utf8' }).stdout.trim();
const match = branch.match(/(?:^|[^0-9])v?(\d+\.\d+\.\d+)(?:$|[^0-9])/);
console.log(JSON.stringify({ branch, version: match ? 'v' + match[1] : null }));
"
```

If the branch contains a version, normalize it to `v<major>.<minor>.<patch>` and use that as the release version unless the developer explicitly overrides it. Examples: `feature/cocoplus-v1.2.0` and `release/1.2.0` both resolve to `v1.2.0`.

If the branch does **not** contain a version, do not infer or auto-increment one. Prompt:

> "The current git branch does not include a semantic version. What semantic version should this release be? (e.g., v1.2.0)"

Validate the developer's answer matches `v<major>.<minor>.<patch>` exactly. If it does not, re-prompt once. Use the developer's answer as the version.

Use existing tags only as context for the prompt:
```
node -e "
const { spawnSync } = require('child_process');
const tags = spawnSync('git', ['tag', '--list'], { encoding: 'utf8' }).stdout.trim().split(/\r?\n/).filter(Boolean);
const semver = tags.map(t => {
  const m = t.match(/^v?(\d+)\.(\d+)\.(\d+)$/);
  return m ? { tag: 'v' + m.slice(1).join('.'), nums: m.slice(1).map(Number) } : null;
}).filter(Boolean);
semver.sort((a,b)=>{ for(let i=0;i<3;i++){ if(a.nums[i]!==b.nums[i]) return b.nums[i]-a.nums[i]; } return 0; });
console.log(semver[0]?.tag || 'none');
"
```

When updating `CHANGELOG.md`, use the branch-derived release version. If that version already exists, append the new release notes under that version. If the version exists but the current month does not, create a new month subsection under that same version. If the branch has no version, ask for the version before editing the changelog.

## Full Diff Review

Show the developer a summary of all changes since the last version tag (or initial commit):
```
node -e "
const { spawnSync } = require('child_process');
function git(args) {
  const r = spawnSync('git', args, { encoding: 'utf8' });
  return r.status === 0 ? r.stdout.trim() : '';
}
const tags = git(['tag', '--list']).split(/\r?\n/).filter(Boolean)
  .map(t => {
    const m = t.match(/^v?(\d+)\.(\d+)\.(\d+)$/);
    return m ? { tag: t, nums: m.slice(1).map(Number) } : null;
  }).filter(Boolean);
tags.sort((a,b)=>{ for(let i=0;i<3;i++){ if(a.nums[i]!==b.nums[i]) return b.nums[i]-a.nums[i]; } return 0; });
const base = tags[0]?.tag || git(['rev-list', '--max-parents=0', 'HEAD']).split(/\r?\n/)[0];
const range = base ? [base + '..HEAD', '--stat'] : ['--stat'];
process.stdout.write(git(['diff', ...range]));
"
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

## Prune Stale Worktrees

Remove any CocoHarvest worktrees that remain from the Build phase:
```
node -e "
const { spawnSync } = require('child_process');
try {
  const out = spawnSync('git', ['worktree', 'list', '--porcelain'], { encoding: 'utf8' }).stdout;
  const trees = out.split('\n\n').filter(Boolean);
  let removed = 0;
  for (const tree of trees) {
    const lines = tree.trim().split('\n');
    const wtPath = lines[0].replace(/^worktree /, '');
    if (/[/\\\\]agent[/\\\\]stage-/.test(wtPath)) {
      const r = spawnSync('git', ['worktree', 'remove', '--force', wtPath], { encoding: 'utf8' });
      if (r.status === 0) removed++;
    }
  }
  spawnSync('git', ['worktree', 'prune'], { encoding: 'utf8' });
  if (!removed) console.log('No stale CocoHarvest worktrees found.');
} catch(e) { /* worktree cleanup is best-effort */ }
"
```

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

## Anti-Rationalization

| Shortcut / Temptation | Why It Fails |
|-----------------------|--------------|
| Skip the full diff review and proceed to tag directly | Developer must consciously review what goes out — blind shipping can include unintended changes |
| Auto-increment the version when the branch has no version | Semantic versioning is a project decision; without a branch version, ask explicitly before changing release files |
| Create the git tag before the deployment record commit | Tag must point to the final commit that includes deployment.md — out-of-order tagging creates a misleading release point |

## Exit Criteria

- [ ] `.cocoplus/lifecycle/deployment.md` exists with Version, Spec ID, Plan ID, and Review Approval fields
- [ ] Git tag matching `v*.*.*` exists pointing to the release commit
- [ ] `.cocoplus/lifecycle/meta.json` `current_phase` is `"shipped"` and `phases_completed` contains `"ship"`
- [ ] `.cocoplus/AGENTS.md` contains `Phase: SHIPPED` with version and timestamp
- [ ] `$ship` is blocked when any `BLOCKED` finding in `review-state.json` is unresolved, with no override path

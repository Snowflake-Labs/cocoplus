---
name: map-diff
description: Analyze the impact of staged git changes against the committed Cortex function knowledge graph — shows which downstream functions are affected before you commit
version: 1.0.2
user-invocable: true
command: /map diff
feature: CocoMap (Feature 28)
---

# /map diff

Trace the downstream impact of staged git changes using the committed `coco-map.json`. Shows which other functions, evaluation sets, and capability definitions are affected before the commit lands.

## Preconditions

- `.cocoplus/` must be initialized
- `.cocoplus/map/coco-map.json` must exist (run `/map` first)
- Staged git changes must exist (`git diff --staged` must be non-empty)

## Step-by-Step Behavior

1. **Verify initialization:** Check `.cocoplus/` exists. If not, output: "CocoPlus not initialized. Run `/pod init` first." and exit.

2. **Verify map exists:** Check `.cocoplus/map/coco-map.json` exists. If not, output:
   ```
   No function knowledge graph found. Run /map first to build it.
   ```
   and exit.

3. **Read staged changes:** Run `git diff --staged --name-only` to get the list of staged files.
   - If no staged changes, output: "No staged changes found. Stage changes with `git add` before running `/map diff`." and exit.

4. **Read `coco-map.json`:** Load the structural dependency graph from `coco-map.json`.

5. **Identify modified functions:** For each staged file path, check if any function in `coco-map.json` has a matching file path. Collect the set of modified functions.

6. **Trace downstream dependents:** For each modified function, traverse the dependency graph in `coco-map.json`:
   - Find all functions that list the modified function as a dependency (direct dependents)
   - Find their dependents (transitive — stop at 5 hops)
   - Collect the full impact set

7. **Check shared evaluation sets:** Identify whether any modified function shares an evaluation set with other functions. If so, those other functions are also affected — they may produce different results after the change.

8. **Check capability definitions:** Identify whether the modified functions belong to any named business capabilities in the domain section. If a capability definition changes, note it.

9. **Build impact report** and display:

```
CocoMap Impact Analysis — [timestamp]
Staged files: [N]

Modified functions: [N]
  - [function-name] ([file-path])
  - ...

Downstream impact:
  Direct dependents: [N]
    - [dependent-function] — depends on [modified-function] via [dependency-type]
  Transitive dependents (up to 5 hops): [N]
    - [transitive-function] — [hop-count] hops from modified

Shared evaluation sets affected:
  - [eval-set-name] — also used by [other-functions] (those evaluations may produce different results)
  [or: "None"]

Business capabilities affected:
  - [capability-name]: [description of what changes]
  [or: "None"]

Gaps surfaced:
  - [any new gaps the change would introduce, e.g. adding a dependency on an unevaluated function]
  [or: "None"]

Recommendation: [brief summary of what to review before committing]
```

10. **No impact case:** If staged files do not touch any mapped function, output:
   ```
   Staged changes do not affect any mapped Cortex AI functions.
   Functions modified: [list of files]
   Safe to commit — no downstream impact detected.
   ```

## Error Cases

- **`coco-map.json` missing:** Output message directing user to run `/map` first
- **No staged changes:** Output message and exit
- **`coco-map.json` parse error:** Output warning and suggest re-running `/map`
- **`git diff --staged` fails:** Output error and suggest checking git status

## Exit Criteria

This skill is complete when:
- Impact report is displayed showing all affected functions, evaluation sets, and capabilities
- No files are written (this is a read-only analysis tool)

## Anti-Rationalization

Do NOT:
- Create any git commit
- Modify `coco-map.json` or any project file
- Analyze unstaged changes — only staged changes (`git diff --staged`) are in scope
- Chase dependency chains deeper than 5 hops

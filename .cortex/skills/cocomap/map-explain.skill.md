---
name: map-explain
description: Produce a natural-language explanation of a specific Cortex function, business capability, or schema element from the committed knowledge graph
version: 1.0.2
user-invocable: true
command: /map explain <target>
feature: CocoMap (Feature 28)
---

# /map explain \<target\>

Explain a specific function, capability, or schema element in domain terms using the committed `coco-map.json`. Answers: what it does, what depends on it, what it depends on, and how it relates to the nearest business capability.

## Preconditions

- `.cocoplus/` must be initialized
- `.cocoplus/map/coco-map.json` must exist (run `/map` first)
- `<target>` argument must be provided

## Arguments

- `<target>` (required): A function name, business capability name, or schema element name to explain. Case-insensitive matching is applied.

## Step-by-Step Behavior

1. **Verify initialization:** Check `.cocoplus/` exists. If not, output: "CocoPlus not initialized. Run `/pod init` first." and exit.

2. **Verify map exists:** Check `.cocoplus/map/coco-map.json` exists. If not, output:
   ```
   No function knowledge graph found. Run /map first to build it.
   ```
   and exit.

3. **Read `coco-map.json`:** Load all structural and domain sections.

4. **Locate target:** Search for `<target>` across:
   - Function names in `structural.functions`
   - Capability names in `domain.capabilities`
   - Vocabulary terms in `domain.vocabulary`
   - Apply case-insensitive fuzzy match (substring match if exact match not found)

5. **If not found:** Output:
   ```
   No function or capability named '[target]' found in coco-map.json.
   Available functions: [comma-separated list]
   Available capabilities: [comma-separated list]
   Run /map to refresh the map if the project has changed.
   ```
   and exit.

6. **Build explanation** depending on target type:

**For a function:**
```
[function-name] — Cortex AI Function
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

What it does:
  [domain-level description from domain.vocabulary and domain.capabilities]
  Cortex API: [AI_CLASSIFY / AI_COMPLETE / etc.]
  File: [file-path]
  Schema: [database.schema.function-name]

Business capability:
  [nearest capability from domain.capabilities, or "Not associated with a named capability"]

Dependencies (what it depends on):
  Direct: [list of functions/tables this function depends on]
  Transitive: [second-level dependencies if notable]
  [or: "No upstream dependencies"]

Dependents (what depends on it):
  Direct: [list of functions that call or depend on this one]
  Transitive: [downstream functions up to 3 hops]
  [or: "No downstream dependents — this is a leaf function"]

Evaluation coverage:
  [Evaluation set name and baseline accuracy if available, or "No evaluation baseline — Gap detected"]

Last analyzed: [timestamp from coco-map.json meta.generated_at]
```

**For a business capability:**
```
[capability-name] — Business Capability
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

What it does:
  [description from domain.capabilities]

Functions implementing this capability:
  - [function-name]: [brief role]
  - ...

Evaluation health:
  [N of M functions have evaluation baselines]

Dependencies across functions in this capability:
  [Internal dependency structure, or "Functions in this capability are independent"]

Last analyzed: [timestamp from coco-map.json meta.generated_at]
```

**For a vocabulary term:**
```
[term] — Domain Vocabulary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Definition: [from domain.vocabulary]
Associated functions: [list]
Aliases: [if any]

Last analyzed: [timestamp from coco-map.json meta.generated_at]
```

## Error Cases

- **Target not found:** Output message with available functions/capabilities list and suggestion to run `/map` to refresh
- **`coco-map.json` parse error:** Output warning and suggest re-running `/map`
- **`coco-map.json` missing:** Redirect to run `/map` first

## Exit Criteria

This skill is complete when:
- Natural language explanation is displayed for the specified target
- No files are written (this is a read-only lookup tool)

## Anti-Rationalization

Do NOT:
- Create any git commit
- Modify `coco-map.json` or any other file
- Fetch external documentation (that is CocoScout's role)
- Chase dependency chains beyond 3 hops for the explanation (deeper analysis belongs in `/map`)

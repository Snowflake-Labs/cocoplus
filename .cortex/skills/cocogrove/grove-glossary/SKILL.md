---
name: grove-glossary
description: Scan project artifacts for domain vocabulary candidates and propose additions to the CocoGrove ubiquitous language glossary — developer reviews and confirms before entries are written
version: 1.0.2
user-invocable: true
command: $grove glossary
author: "CocoPlus"
tags:
  - cocoplus
feature: CocoGrove — Ubiquitous Language Section (Feature 12 improvement)
---

# $grove glossary

Scan project artifacts for candidate domain terms and propose additions to `.cocoplus/grove/language/glossary.md`. Developer reviews and confirms each proposed entry before it is written.

## Preconditions

- `.cocoplus/` must be initialized
- At least one of: `lifecycle/spec.md`, `flow.json`, `lifecycle/plan.md`, `prompts/*.md`, or CocoCupper findings must exist

## Step-by-Step Behavior

1. **Verify initialization:** Check `.cocoplus/` exists. If not, output: "CocoPlus not initialized. Run `$pod init` first." and exit.

2. **Create glossary directory:** Ensure `.cocoplus/grove/language/` exists. Create if missing.

3. **Read existing glossary:** Read `.cocoplus/grove/language/glossary.md` if it exists. Extract already-defined terms and aliases using case-insensitive normalization:
   - Trim leading/trailing whitespace
   - Collapse repeated spaces
   - Compare lowercase term text
   - Compare aliases as duplicate keys for the canonical term

4. **Scan project artifacts for candidate terms:**
   - `lifecycle/spec.md` — function names, capability descriptions, domain nouns
   - `.cocoplus/flow.json` — stage names and descriptions
   - `lifecycle/plan.md` — decision terms, evaluation references
   - `lifecycle/discuss.md` — threshold names, methodology terms
   - `.cocoplus/prompts/*.md` — AI function input/output descriptions
   - `.cocoplus/grove/cupper-findings.md` — pattern names, anti-pattern terms
   - `.cocoplus/map/coco-map.json` — capability names from domain section (if exists)

5. **Extract candidate terms:** Look for multi-word noun phrases that appear as key concepts:
   - Function names used as domain concepts (e.g., "sentiment score", "churn propensity")
   - Metric and threshold names (e.g., "accuracy baseline", "gold standard dataset")
   - Process terms that appear in multiple artifacts (e.g., "evaluation harness", "prompt iteration")
   - Exclude generic technical terms (SQL keywords, standard Snowflake function names)

6. **Filter known terms:** Remove any candidates that already appear in the existing glossary as either a canonical term or an alias. If a candidate duplicates an alias but adds useful context, propose an update to the existing entry instead of a new term.

7. **Present candidates to developer** one at a time (or in a numbered list for batch review):
   ```
   Proposed glossary additions ([N] candidates):
   
   [N] terms found that are not yet in the glossary.
   
   1. "customer churn propensity"
      Appears in: spec.md, prompts/classifier-v2.md
      Proposed definition: [AI-inferred brief definition based on context]
      Aliases (optional): churn score, propensity score
      Associated functions: [function names where this term appears]
      
      Accept? [Y to add / N to skip / E to edit definition]
   
   2. "gold standard dataset"
      ...
   ```

8. **For each accepted entry or update:** Write to `.cocoplus/grove/language/glossary.md` in the following format:
   ```markdown
   ## [Term]
   
   **Definition:** [definition text]
   **Aliases:** [alias1, alias2] (or "None")
   **Associated functions:** [list of function names]
   **Added:** [ISO8601 date]
   ```

   If updating an existing term, preserve its current definition unless the developer explicitly accepts the edited definition. Append new aliases/functions without duplicating existing values.

9. **Create git commit** after all accepted entries are written: `feat(grove): add [N] glossary terms`

10. **Confirm to developer:**
    ```
    ✓ Glossary updated
    [N] terms added. [M] skipped.
    
    View glossary: $grove glossary view
    Glossary is available to CocoScout for context loading.
    ```

## Empty results case

If no new candidates are found beyond existing glossary terms:
```
No new domain terms found.
[N] terms already in glossary.

Run $grove glossary view to see existing entries.
```

## Error Cases

- **No source artifacts found:** Output warning and list which artifacts are missing; suggest running `$spec` first
- **Cannot write glossary file:** Output filesystem error; do not commit partial entries
- **Developer skips all candidates:** Output: "No terms added. Run again after adding more project artifacts."

## Exit Criteria

This skill is complete when:
- Candidate terms have been presented for developer review
- Accepted terms are written to `glossary.md`
- Git commit is created (if at least one term was added)

## Anti-Rationalization

Do NOT:
- Auto-write any term without developer confirmation
- Add generic SQL/Snowflake technical terms (SELECT, CREATE, AI_CLASSIFY without domain context)
- Fail silently if no artifacts are found — always report what was scanned
- Create a new glossary entry when the term already exists as an alias or case-only variant

---
name: grove-glossary-view
description: Display the current CocoGrove ubiquitous language glossary in alphabetical order — shows all defined domain terms, definitions, aliases, and associated functions
version: 1.0.2
user-invocable: true
command: /grove glossary view
feature: CocoGrove — Ubiquitous Language Section (Feature 12 improvement)
---

# /grove glossary view

Display the current glossary at `.cocoplus/grove/language/glossary.md` in alphabetical order.

## Preconditions

- `.cocoplus/` must be initialized

## Step-by-Step Behavior

1. **Verify initialization:** Check `.cocoplus/` exists. If not, output: "CocoPlus not initialized. Run `/pod init` first." and exit.

2. **Check glossary file:** Read `.cocoplus/grove/language/glossary.md`.
   - If the file does not exist or is empty, output:
     ```
     Glossary is empty.
     Run /grove glossary to propose and add domain terms from project artifacts.
     ```
     and exit.

3. **Parse and sort entries** alphabetically by term name.

4. **Display each entry:**
```
CocoGrove Ubiquitous Language Glossary
[N] terms  |  Last updated: [date from most recent git commit on glossary.md]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

accuracy baseline
  Definition: The measured accuracy of a model version used as the reference
              point for evaluating whether a new version improves or regresses.
  Aliases: evaluation baseline, baseline score
  Associated functions: ai-classifier-v2, sentiment-scorer
  Added: 2026-05-01

churn propensity
  Definition: A numeric score (0-1) representing a customer's likelihood to
              cancel or disengage within the next 90-day period.
  Aliases: churn score, propensity score
  Associated functions: churn-predictor
  Added: 2026-04-28

gold standard dataset
  Definition: A manually labeled dataset used as the canonical evaluation set
              for all accuracy measurements on a Cortex AI function.
  Aliases: labeled test set, evaluation set
  Associated functions: sentiment-scorer, ai-classifier-v2
  Added: 2026-04-20

[...continues alphabetically...]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Run /grove glossary to add new terms.
```

## Error Cases

- **Glossary file missing or empty:** Prompt user to run `/grove glossary`
- **Cannot read glossary file:** Output filesystem error

## Exit Criteria

This skill is complete when:
- Glossary entries are displayed in alphabetical order
- No files are written (this is a read-only display)

## Anti-Rationalization

Do NOT:
- Create any git commit
- Modify the glossary file
- Reorder or restructure glossary entries — display in alphabetical order as-is

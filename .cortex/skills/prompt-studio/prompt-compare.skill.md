---
name: "prompt-compare"
description: "Compare two prompt versions by running both against the same test inputs and showing output differences. Usage: /prompt compare [prompt-a-path] [prompt-b-path]."
version: "1.0.0"
author: "CocoPlus"
tags:
  - cocoplus
  - prompt-studio
---

Your objective is to compare two prompt versions.

Before proceeding, verify that `.cocoplus/` exists.
If not: output "CocoPlus not initialized in this directory. Run `/pod init` to begin." Then stop.

Parse arguments: `/prompt compare [path-a] [path-b]`
If arguments missing: output "Usage: /prompt compare [path-a] [path-b]" Then stop.

Read both prompt files. If either does not exist: output error with which file is missing. Then stop.

## Test Input Collection

Ask: "Provide 3-5 test inputs to compare the prompts against (one per line):"

## Run Comparison

For each test input, generate output using both prompts (invoke Cortex COMPLETE function via SnowflakeSqlExecute with each prompt as system context).

## Output Comparison Table

```
# Prompt Comparison: [prompt-a name] vs [prompt-b name]

| Test Input | Prompt A Output | Prompt B Output | Difference |
|------------|----------------|----------------|------------|
[one row per test input]

## Analysis
Prompt A: [strengths and weaknesses]
Prompt B: [strengths and weaknesses]
Recommendation: [which prompt to use and why]
```

## Anti-Rationalization

| Shortcut / Temptation | Why It Fails |
|-----------------------|--------------|
| Compare with only one input | A single case hides regressions and overfits the recommendation |
| Skip difference column details | Without explicit diffs, recommendation becomes subjective |
| Ignore missing prompt file validation | Comparison output becomes misleading and non-reproducible |

## Exit Criteria

- [ ] Both prompt files were validated as existing before comparison
- [ ] Comparison output includes rows for each provided test input with Prompt A output, Prompt B output, and a difference summary
- [ ] `## Analysis` section includes strengths and weaknesses for each prompt plus a recommendation
- [ ] Errors for missing arguments or missing files are handled with clear usage guidance

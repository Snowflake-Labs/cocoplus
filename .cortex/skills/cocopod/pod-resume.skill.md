---
name: "pod-resume"
description: "Reconstruct context for a returning developer. Reads .cocoplus/ state and generates a narrative summary of project status, last achievements, pending tasks, recent decisions, available patterns, CocoCupper insights, and recommended next action."
version: "1.0.0"
author: "CocoPlus"
tags:
  - cocoplus
  - cocopod
---

Your objective is to reconstruct context for a developer returning to this project after time away.

Before proceeding, verify that `.cocoplus/` exists in the current directory.
If it does not, output: "CocoPlus not initialized in this directory. Run `/pod init` to begin." Then stop.

## Read Context

Read the following files in this order:

1. `.cocoplus/project.md` — project name, goal, description
2. `.cocoplus/lifecycle/meta.json` — current phase, phases completed
3. `.cocoplus/lifecycle/plan.md` — approved plan (first 500 characters only)
4. `.cocoplus/flow.json` — pending stages (extract stages where status != "completed")
5. `.cocoplus/memory/decisions.md` — last 3 decision entries
6. `.cocoplus/grove/patterns/` — list of pattern files (names only)
7. `.cocoplus/grove/cupper-findings.md` — last 3 finding summaries

## Generate Narrative

Output a narrative markdown document:

```
# Welcome Back

## Project
**Name:** [project name from project.md]
**Goal:** [goal from project.md]

## Where You Left Off
Last phase completed: [phase] on [date]
[1-2 sentence summary of what was accomplished]

## Approved Plan (excerpt)
[First 500 characters of plan.md]

## Pending Build Tasks
[List of pending flow.json stages: id, name, persona assigned]
If no pending stages: "All stages complete."

## Recent Decisions
[Last 3 decisions from memory/decisions.md]
If none: "No decisions recorded yet."

## Available Patterns
[List of pattern file names from grove/patterns/]
If none: "No patterns promoted yet."

## Intelligence Insights
[Last 3 CocoCupper finding summaries]
If none: "No CocoCupper analysis yet."

## Recommended Next Action
[Based on current phase — specific command to run next]
```

Complete in under 5 seconds.

## Anti-Rationalization

| Shortcut / Temptation | Why It Fails |
|-----------------------|--------------|
| Read only AGENTS.md and skip the other context files | AGENTS.md is a summary; accurate resume context requires reading meta.json, flow.json, and memory files directly |
| Show a long verbose dump of all files | Resume is a narrative oriented output — overwhelming detail defeats the purpose of fast re-orientation |
| Recommend a next action without checking current phase | Recommending `/spec` when the project is in the Test phase gives actively wrong guidance |

## Exit Criteria

- [ ] Output contains `## Project` section with project name and goal
- [ ] Output contains `## Where You Left Off` with last completed phase and brief summary
- [ ] Output contains `## Recommended Next Action` with a specific command to run next
- [ ] All sections completed in under 5 seconds (no slow file scans)

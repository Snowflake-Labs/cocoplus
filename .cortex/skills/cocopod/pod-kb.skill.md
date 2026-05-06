---
name: pod-kb
description: Display the project knowledge base (lifecycle/kb.md) — project-specific patterns, decisions, and gotchas accumulated by CocoCupper across sessions
version: 1.0.2
user-invocable: true
command: /pod kb
feature: CocoPod — Project Knowledge Base (Feature 5 improvement)
---

# /pod kb

Display `lifecycle/kb.md` — the project-specific, session-spanning knowledge base populated by CocoCupper after each completed stage. Distinct from CocoGrove (team-level patterns) and CocoDream (prompt optimization lessons).

## Preconditions

- `.cocoplus/` must be initialized

## Step-by-Step Behavior

1. **Verify initialization:** Check `.cocoplus/` exists. If not, output: "CocoPlus not initialized. Run `/pod init` first." and exit.

2. **Check kb.md:** Read `.cocoplus/lifecycle/kb.md`.

3. **If file does not exist or is empty:**
   ```
   No project knowledge accumulated yet.
   Run /build to begin a session — CocoCupper will populate the knowledge base
   after each completed stage.
   ```
   Exit.

4. **Count entries:** Count entries in each section (## Patterns, ## Decisions, ## Gotchas).

5. **Display kb.md content:**
   ```
   Project Knowledge Base — [project name from project.md]
   [N] patterns · [M] decisions · [K] gotchas
   Last updated: [date from git log on kb.md]
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   
   [Full content of kb.md displayed as-is]
   
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   CocoScout loads this file for every Build task.
   CocoCupper adds entries after completed stages.
   ```

## kb.md Content Structure (for reference)

CocoCupper populates `kb.md` with entries in this format:
```markdown
## Patterns
- [Pattern name]: [Description] — discovered in [session/phase]

## Decisions
- [Decision]: [Rationale] — [date]

## Gotchas
- [Pitfall]: [Description and how to avoid it]
```

## Error Cases

- **kb.md does not exist:** Display informational message and exit (not an error)
- **kb.md corrupted:** Output warning: "kb.md appears to have formatting issues. Showing raw content:" and display raw content for manual inspection

## Exit Criteria

This skill is complete when:
- kb.md content is displayed (or the "not yet populated" message shown)
- No files are written (this is a read-only display command)

## Anti-Rationalization

Do NOT:
- Create any git commit
- Modify kb.md
- Confuse this with CocoGrove patterns (CocoGrove is team-level; kb.md is project-specific)

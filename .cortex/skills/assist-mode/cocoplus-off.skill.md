---
name: "cocoplus-off"
description: "Deactivate Full Assist Mode — removes all CocoPlus feature flags. Data files (memory, meter history, grove patterns) are preserved. Idempotent."
version: "1.0.0"
author: "CocoPlus"
tags:
  - cocoplus
  - assist-mode
---

Your objective is to deactivate Full Assist Mode.

Before proceeding, verify that `.cocoplus/` exists.
If not: output "CocoPlus not initialized in this directory. Run `/pod init` to begin." Then stop.

## Check Which Flags Exist

Record which flags currently exist before removing them (for reporting).

## Remove All Feature Flags

Delete each of the following flag files if they exist (use the Bash tool with a cross-platform command, or the Write tool set to empty — do not assume `rm` is available on Windows):

Cross-platform deletion using Node.js via the Bash tool:
```
node -e "
  const fs=require('fs');
  const flags=[
    '.cocoplus/modes/memory.on',
    '.cocoplus/modes/inspector.on',
    '.cocoplus/modes/quality.on',
    '.cocoplus/modes/context-mode.on',
    '.cocoplus/modes/cocometer.on',
    '.cocoplus/modes/full-assist.on',
    '.cocoplus/modes/safety.strict',
    '.cocoplus/modes/safety.normal',
    '.cocoplus/modes/safety.off',
  ];
  flags.forEach(f=>{try{fs.unlinkSync(f)}catch(_){}});
  console.log('All feature flags removed.');
"
```

**DO NOT delete any data files.** Only flag files are removed. These data files are NEVER deleted:
- `.cocoplus/memory/` directory and all files
- `.cocoplus/meter/history.jsonl`
- `.cocoplus/grove/patterns/` and all files
- `.cocoplus/grove/cupper-findings.md`

## Update AGENTS.md

Update AGENTS.md (keep ≤200 lines).
Replace Active Modes section with:
```
## Active Modes
- FULL ASSIST MODE: OFF
- Safety: off (deactivated)
- Memory: off
- Inspector: off
- Context Mode: off
- CocoMeter: off
- Code Quality: off
```

## Create Git Commit

```
git add .cocoplus/modes/ .cocoplus/AGENTS.md
git commit -m "chore(cocopod): deactivate full assist mode"
```

## Output

```
Full Assist Mode deactivated.

Deactivated: [list of flags that were removed]

Preserved (not deleted):
- .cocoplus/memory/ — decisions, patterns, errors files
- .cocoplus/meter/history.jsonl
- .cocoplus/grove/patterns/
- .cocoplus/grove/cupper-findings.md

Run `/cocoplus on` to re-activate all features.
```

## Anti-Rationalization

| Shortcut / Temptation | Why It Fails |
|-----------------------|--------------|
| Only remove the `full-assist.on` flag and leave others | Stale feature flags cause incorrect mode detection on next session — remove all of them |
| Skip updating AGENTS.md | AGENTS.md is the hot context file read at every session start; stale mode info misleads the AI |
| Delete memory or meter history files "to clean up" | Data files are permanent records; this skill explicitly must NOT delete them |

## Exit Criteria

- [ ] All nine flag files (`memory.on`, `inspector.on`, `quality.on`, `context-mode.on`, `cocometer.on`, `full-assist.on`, `safety.strict`, `safety.normal`, `safety.off`) do NOT exist in `.cocoplus/modes/`
- [ ] `.cocoplus/AGENTS.md` `## Active Modes` section shows `FULL ASSIST MODE: OFF` with all features listed as `off`
- [ ] Git commit with message `chore(cocopod): deactivate full assist mode` exists in log
- [ ] `.cocoplus/memory/`, `.cocoplus/meter/history.jsonl`, and `.cocoplus/grove/` data files still exist (not deleted)

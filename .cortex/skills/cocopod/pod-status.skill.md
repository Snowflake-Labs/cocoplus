---
name: "pod-status"
description: "Display complete CocoPlus project state: lifecycle phase, CocoFlow pipeline status, active modes, memory state, safety gate, inspector, meter, personas, patterns, and cupper findings. Run at any time to get a full project overview."
version: "1.0.1"
author: "CocoPlus"
tags:
  - cocoplus
  - cocopod
---

Your objective is to produce a comprehensive status report of the CocoPlus project bundle.

Before proceeding, verify that `.cocoplus/` exists in the current directory.
If it does not, output: "CocoPlus not initialized in this directory. Run `/pod init` to begin." Then stop.

## Read State From These Files

Read each file listed below. If a file is missing, use the default value shown. Do NOT error on missing files.

| File | Default if Missing |
|------|--------------------|
| `.cocoplus/lifecycle/meta.json` | `{"current_phase":"not_started","phases_completed":[]}` |
| `.cocoplus/flow.json` | `{"stages":[]}` |
| `.cocoplus/memory/decisions.md` | empty |
| `.cocoplus/meter/current-session.json` | not tracking |
| `.cocoplus/grove/cupper-findings.md` | no findings |
| `.cocoplus/modes/` directory listing | no modes active |

## Generate Status Report

Output a structured report with these sections:

### 1. CocoBrew Lifecycle
- Current phase (from `lifecycle/meta.json`)
- Phases completed and their timestamps
- Next recommended action

### 2. CocoFlow Pipeline
- Pipeline name and version (from `flow.json`)
- Total stages / completed stages / pending stages
- Most recently completed stage

### 3. Active Modes
Check for presence of these flag files and report on/off:
- `.cocoplus/modes/memory.on` → Memory Engine
- `.cocoplus/modes/inspector.on` → Environment Inspector
- `.cocoplus/modes/context-mode.on` → Context Mode
- `.cocoplus/modes/quality.on` → Code Quality Advisor
- `.cocoplus/modes/cocometer.on` → CocoMeter
- `.cocoplus/modes/safety.strict` or `safety.normal` or `safety.off` → Safety Gate level
- `.cocoplus/modes/full-assist.on` → Full Assist Mode

### 4. Memory Engine
- Mode: on/off
- Decision count (count lines starting with "##" in `memory/decisions.md`)
- Pattern count (count lines starting with "##" in `memory/patterns.md`)

### 5. CocoMeter
- Current session tokens (from `meter/current-session.json` if exists)
- Sessions tracked (count lines in `meter/history.jsonl`)

### 6. CocoGrove
- Pattern count (count `.md` files in `grove/patterns/`)
- CocoCupper findings (line count of `grove/cupper-findings.md`)

### 7. Safety Gate
- Current level (strict / normal / off)

### 8. Personas Used
- List any subagent IDs recorded in `lifecycle/meta.json` or `AGENTS.md`

Output as a clean markdown table per section. Complete in under 2 seconds.

## Self-Heal: Modes Sync Check

After rendering the Active Modes section, perform a cross-check between the `modes/` directory and the `## Active Modes` section in `.cocoplus/AGENTS.md`:

1. Read the list of flag files present in `.cocoplus/modes/` (e.g., `memory.on`, `quality.on`, `safety.strict`).
2. Read the `## Active Modes` block from `.cocoplus/AGENTS.md`.
3. Compare them. If any mode flag exists on disk but is NOT reflected in AGENTS.md, or vice versa:
   - Output a warning: "⚠️  Modes out of sync: [list discrepancies]. AGENTS.md reports [X] but modes/ directory has [Y]."
   - Offer: "Sync AGENTS.md to match the modes/ directory now? (yes/no)"
   - If yes: rewrite the `## Active Modes` section of AGENTS.md to match the current `modes/` directory state (keep ≤200 lines total).
   - If no: continue.

If no discrepancy exists, output nothing for this section (silent pass).

## Anti-Rationalization

| Shortcut / Temptation | Why It Fails |
|-----------------------|--------------|
| Error out if any state file is missing | Status must be readable at any project stage; use the defined defaults for missing files rather than failing |
| Read full file contents instead of just checking file existence for mode flags | Mode flags are sentinel files — only presence/absence matters; reading content wastes time on binary state |

## Exit Criteria

- [ ] Report contains all 8 sections: CocoBrew Lifecycle, CocoFlow Pipeline, Active Modes, Memory Engine, CocoMeter, CocoGrove, Safety Gate, Personas Used
- [ ] Active Modes section correctly reflects which flag files exist in `.cocoplus/modes/`
- [ ] Report completed in under 2 seconds

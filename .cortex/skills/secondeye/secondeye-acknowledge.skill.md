---
name: "secondeye-acknowledge"
description: "Review and acknowledge open Critical findings from a SecondEye report. Supports --hitl-only (acknowledge HITL-classified stages) and --blocking-only (acknowledge BLOCKING-classified findings only). Clears /build soft gate when all critical findings are acknowledged."
version: "1.0.2"
author: "CocoPlus"
tags:
  - cocoplus
  - secondeye
---

Your objective is to process Critical SecondEye findings and clear the build gate.

Before proceeding, verify that `.cocoplus/` exists.
If not: output "CocoPlus not initialized in this directory. Run `/pod init` to begin." Then stop.

## Parse Arguments

- `--hitl-only`: acknowledge only HITL-classified findings. MINOR/AFK findings are queued for autonomous resolution in the next `/build` pass.
- `--blocking-only`: acknowledge only BLOCKING-classified findings, leaving MINOR findings for autonomous resolution.
- No flag: present all Critical findings for acknowledgment (existing behavior).

## Find Unacknowledged Reports

Scan `.cocoplus/lifecycle/` for files matching `secondeye-*.md`.
Read YAML frontmatter of each file.
Find files with `critical_open: true` AND `acknowledged: false`.

If none found:
Output: "No unacknowledged Critical SecondEye findings. /build is not gated." Then stop.

## Present Findings Based on Mode

**No flag (default):** Present all Critical findings one at a time. For each:
"Acknowledge finding [SE-NNN]: [title] [[HITL/AFK]] [[BLOCKING/MINOR]]? (yes to acknowledge / no to keep it open)"

**`--hitl-only`:** Present only HITL-classified findings. AFK findings are listed as "queued for autonomous resolution" and not presented for acknowledgment.

**`--blocking-only`:** Present only BLOCKING-classified findings. MINOR findings are listed as "queued for autonomous resolution" and not presented for acknowledgment.

## Update Report Metadata

If all required findings acknowledged (based on mode):
Update the report file's YAML frontmatter:
- `acknowledged: true`
- `acknowledged_at: [ISO 8601 timestamp]`
- `critical_open: false`

Track which findings were acknowledged vs. queued. Update `action_summary` in frontmatter to reflect remaining counts.

If any required finding left unacknowledged:
Output: "[N] findings still unacknowledged. /build remains gated."

## Output

If all required findings acknowledged:
Output: "All required findings acknowledged. /build gate cleared. You may now run `/build`."
If AFK or MINOR findings were queued: "Note: [N] AFK/MINOR findings queued for autonomous resolution in next `/build` pass."

## Anti-Rationalization

| Shortcut / Temptation | Why It Fails |
|-----------------------|--------------|
| Mark report acknowledged without per-finding confirmation | Critical risks can be bypassed without review |
| Clear `critical_open` when any finding remains unresolved | Build gate semantics become untrustworthy |
| Ignore missing report files | Produces false confidence that gate is clear |

## Exit Criteria

- [ ] Unacknowledged reports are identified using `critical_open: true` and `acknowledged: false`
- [ ] Each finding is presented with its HITL/AFK and BLOCKING/MINOR tags
- [ ] `--hitl-only` presents only HITL-classified findings; AFK findings listed as queued
- [ ] `--blocking-only` presents only BLOCKING-classified findings; MINOR findings listed as queued
- [ ] Report frontmatter is updated to `acknowledged: true`, `acknowledged_at: [ISO timestamp]`, and `critical_open: false` only when all required findings are acknowledged
- [ ] Output states whether `/build` remains gated or is cleared, and how many findings were queued for autonomous resolution

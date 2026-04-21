---
name: "secondeye-acknowledge"
description: "Review and acknowledge open Critical findings from a SecondEye report. Presents each Critical finding to the developer, requires confirmation, then clears the /build soft gate."
version: "1.0.0"
author: "CocoPlus"
tags:
  - cocoplus
  - secondeye
---

Your objective is to process Critical SecondEye findings and clear the build gate.

Before proceeding, verify that `.cocoplus/` exists.
If not: output "CocoPlus not initialized in this directory. Run `/pod init` to begin." Then stop.

## Find Unacknowledged Reports

Scan `.cocoplus/lifecycle/` for files matching `secondeye-*.md`.
Read YAML frontmatter of each file.
Find files with `critical_open: true` AND `acknowledged: false`.

If none found:
Output: "No unacknowledged Critical SecondEye findings. /build is not gated." Then stop.

## Present Each Critical Finding

For each unacknowledged report:
Display all Critical findings.
For each finding ask:
"Acknowledge finding [SE-NNN]: [title]? (yes to acknowledge / no to keep it open)"

## Update Report Metadata

If all Critical findings acknowledged:
Update the report file's YAML frontmatter:
- `acknowledged: true`
- `acknowledged_at: [ISO 8601 timestamp]`
- `critical_open: false`

If any critical finding left unacknowledged:
Output: "[N] findings still unacknowledged. /build remains gated."

## Output

If all acknowledged:
Output: "All Critical findings acknowledged. /build gate cleared. You may now run `/build`."

## Anti-Rationalization

| Shortcut / Temptation | Why It Fails |
|-----------------------|--------------|
| Mark report acknowledged without per-finding confirmation | Critical risks can be bypassed without review |
| Clear `critical_open` when any finding remains unresolved | Build gate semantics become untrustworthy |
| Ignore missing report files | Produces false confidence that gate is clear |

## Exit Criteria

- [ ] Unacknowledged reports are identified using `critical_open: true` and `acknowledged: false`
- [ ] Each critical finding is presented for explicit acknowledgment decision
- [ ] Report frontmatter is updated to `acknowledged: true`, `acknowledged_at: [ISO timestamp]`, and `critical_open: false` only when all critical findings are acknowledged
- [ ] Output states whether `/build` remains gated or is cleared

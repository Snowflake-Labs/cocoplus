---
name: "fleet-comms"
description: "Show the CocoFleet dispatch and heartbeat event feed. Usage: $fleet comms [fleet-id]."
version: "2.0.0"
author: "CocoPlus"
tags:
  - cocoplus
  - cocofleet
---

Your objective is to display the read-only CocoFleet communications feed.

Before proceeding, verify that `.cocoplus/` exists.
If not: output "CocoPlus not initialized in this directory. Run `$pod init` to begin." Then stop.

Parse argument: `$fleet comms [fleet-id]`

If no fleet-id is supplied, select the most recently modified fleet directory under `.cocoplus/fleet/` that contains `comms.log`. If none exists, output "No CocoFleet comms log found." Then stop.

Read `.cocoplus/fleet/[fleet-id]/comms.log`.

Output:

```text
# Fleet Comms: [fleet-id]

| Time | Role | Instance | Event | Summary |
|------|------|----------|-------|---------|
[last 50 events, oldest to newest]
```

Support optional filters when present in the user request:

- `--role planner|producer|critic`
- `--event dispatch|heartbeat|completion|blocker|signoff`
- `--tail N`

## Safety Rules

- Do not write to `state.json` or `comms.log`.
- Do not approve, resume, pause, or stop a fleet from this skill.
- Treat malformed lines as skipped input and report the skipped count.

## Exit Criteria

- [ ] The selected fleet id is shown.
- [ ] The feed is read from `.cocoplus/fleet/[fleet-id]/comms.log`.
- [ ] Role, event, and tail filters are applied when requested.
- [ ] No project state is mutated.

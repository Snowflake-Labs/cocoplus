---
name: "fleet-status"
description: "Show the current execution state of a CocoFleet run. Displays per-instance status, runtime, and checkpoint results. Usage: $fleet status [fleet-id]."
version: "1.0.0"
author: "CocoPlus"
tags:
  - cocoplus
  - cocofleet
---

Your objective is to display CocoFleet execution status.

Before proceeding, verify that `.cocoplus/` exists.
If not: output "CocoPlus not initialized in this directory. Run `$pod init` to begin." Then stop.

Parse argument: `$fleet status [fleet-id]`
If no fleet-id: list all fleet directories in `.cocoplus/fleet/` that contain `state.json` and show their fleet names, modes, and statuses. Then stop.

Read `.cocoplus/fleet/[fleet-id]/state.json`. For legacy fleet state files matching `.cocoplus/fleet/[fleet-id]-state.json`, read them only as fallback and report that the fleet should be migrated to the directory layout.

For each running instance (status == "running"), check if PID is still alive using a cross-platform Node.js one-liner via the Bash tool:
```
node -e "try{process.kill([pid],0);console.log('alive')}catch(e){console.log('dead')}"
```

Output:

```
# Fleet Status: [fleet-name]
Fleet ID: [fleet-id]
Started: [started_at]
Overall: [running/complete/failed]

| Instance | Name | Status | PID | Runtime | Checkpoints |
|----------|------|--------|-----|---------|-------------|
[one row per instance, with checkpoints satisfied: ✓ or ✗]

## Role View
| Role | Instance | Model Tier | Status | Last Heartbeat | Current Task |
|------|----------|------------|--------|----------------|--------------|
[group planner, producer, and critic instances separately; show current_task_summary when present]

## Recent Comms
[last 10 lines from .cocoplus/fleet/[fleet-id]/comms.log, newest last]

For failed instances, last 3 lines of output.log:
[instance-id]: [last 3 log lines]
```

## Anti-Rationalization

| Shortcut / Temptation | Why It Fails |
|-----------------------|--------------|
| Show cached status without re-checking PID liveness | A process may have died without updating state.json; always verify PID is alive for "running" instances |
| Report all instances as "pending" if state.json is missing | Missing state file means fleet was never started — output a clear error rather than misleading status |

## Exit Criteria

- [ ] A status table with columns Instance, Name, Status, PID, Runtime, Checkpoints is output for each instance
- [ ] Role-grouped planner, producer, and critic rows include model tier, heartbeat, and current task summary when present
- [ ] Recent comms events are shown from comms.log when the file exists
- [ ] For each "running" instance, PID liveness was checked with `node -e "process.kill([pid],0)"` before reporting status
- [ ] Failed instances show last 3 lines of their `output.log`

---
name: "fleet-run"
description: "Execute a CocoFleet manifest. Spawns independent Coco processes for each instance, respects dependency order, polls for completion, and writes an aggregated results summary. Usage: /fleet run [fleet-name]."
version: "1.0.0"
author: "CocoPlus"
tags:
  - cocoplus
  - cocofleet
---

Your objective is to execute a CocoFleet manifest.

Before proceeding, verify that `.cocoplus/` exists.
If not: output "CocoPlus is not initialized. Run `/pod init` first." Then stop.

Parse argument: `/fleet run [manifest-path]`
If no manifest-path: output "Usage: /fleet run [manifest-path]" Then stop.

Read the manifest file at `[manifest-path]`. If not found: output "Manifest not found: [manifest-path]" Then stop.

## Validate Manifest

Check: instance count ≤ 10. If exceeded: output "WARNING: Fleet has [N] instances, exceeding the 10-instance maximum. Edit manifest to reduce instance count." Then stop.

Check `which coco` is available. If not: output "ERROR: 'coco' CLI not in PATH." Then stop.

## Create Fleet State File

Generate fleet-id: `fleet-YYYYMMDD-HHMMSS`

Write `.cocoplus/fleet/[fleet-id]-state.json`:
```json
{
  "fleet_id": "[fleet-id]",
  "manifest_path": "[manifest-path]",
  "started_at": "[ISO 8601 timestamp]",
  "status": "running",
  "instances": {}
}
```

Initialize each instance in the state with status "pending".

## Resolve and Execute Instances

Algorithm:
1. Find all instances with no `depends_on` or with all dependencies satisfied in state.json
2. For each ready instance:
   a. Create directory: `.cocoplus/fleet/[instance-id]/`
   b. Verify task_file exists. If not: mark instance as failed, log error.
   c. Spawn Coco process via Bash:
      ```bash
      coco --task-file .cocoplus/fleet/[instance-id]/task.md > .cocoplus/fleet/[instance-id]/output.log 2>&1 &
      echo $! > .cocoplus/fleet/[instance-id]/pid.txt
      ```
   d. Record PID in state.json, set status = "running", started_at = [timestamp]

3. Record each launched instance in state.json and leave blocked instances in `pending`.
4. Return control to the developer immediately after the initial ready set is launched.
5. Do NOT poll in this command. Ongoing monitoring belongs to `/fleet status` and follow-up fleet orchestration logic.

## Write Aggregated Results

When later orchestration determines the fleet is complete, write `.cocoplus/fleet/[fleet-id]-aggregated-results.md`:
```markdown
# Fleet Results: [manifest-path]

**Fleet ID:** [fleet-id]
**Completed:** [ISO 8601 timestamp]
**Duration:** [seconds]

## Instance Summary
| Instance | Status | Duration | Checkpoints |
|----------|--------|----------|-------------|
[one row per instance]

## Overall Status
[COMPLETE / PARTIAL (N failed) / FAILED]
```

Output: "Fleet started from [manifest-path]. Fleet ID: [fleet-id]. Initial ready instances were launched and the session returned immediately. Use `/fleet status [fleet-id]` to monitor. Use `/fleet stop [fleet-id]` to terminate all processes."

## Anti-Rationalization

| Temptation | Why Not |
|------------|---------|
| Block waiting for all instances | Fleet must return control to developer immediately |
| Share context between instances | Instances are process-isolated by design — no shared context |
| Exceed 10 instances without warning | 10 is the safety limit — always enforce |

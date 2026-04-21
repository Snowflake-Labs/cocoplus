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
If not: output "CocoPlus not initialized in this directory. Run `/pod init` to begin." Then stop.

Parse argument: `/fleet run [manifest-path]`
If no manifest-path: output "Usage: /fleet run [manifest-path]" Then stop.

Read the manifest file at `[manifest-path]`. If not found: output "Manifest not found: [manifest-path]" Then stop.

## Validate Manifest

Check: instance count ≤ 10. If exceeded: output "WARNING: Fleet has [N] instances, exceeding the 10-instance maximum. Edit manifest to reduce instance count." Then stop.

Check if `coco` is available (cross-platform: run `coco --version` and verify exit code 0). If not found: output "ERROR: 'coco' CLI not in PATH. Install Coco and ensure it is accessible before running a fleet." Then stop.

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
   c. Spawn Coco process using the Bash tool (cross-platform):
      - On Windows (PowerShell): `Start-Process coco -ArgumentList "--task-file .cocoplus/fleet/[instance-id]/task.md" -RedirectStandardOutput ".cocoplus/fleet/[instance-id]/output.log" -PassThru | Select-Object -ExpandProperty Id | Out-File ".cocoplus/fleet/[instance-id]/pid.txt"`
      - On Mac/Linux (bash): `coco --task-file .cocoplus/fleet/[instance-id]/task.md > .cocoplus/fleet/[instance-id]/output.log 2>&1 & echo $! > .cocoplus/fleet/[instance-id]/pid.txt`
      - Detect platform with `node -e "console.log(process.platform)"` — use `win32` for Windows check.
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

## Exit Criteria

- [ ] `.cocoplus/fleet/[fleet-id]-state.json` exists with `status: "running"` and an entry for each instance
- [ ] All ready instances (no unmet dependencies) have been spawned with PIDs recorded in state.json
- [ ] `output.log` and `pid.txt` files exist in each launched instance's directory
- [ ] Control is returned to the developer immediately after launching the initial ready set — the command does not block

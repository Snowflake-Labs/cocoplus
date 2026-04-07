---
name: "fleet-init"
description: "Initialize a CocoFleet manifest for multi-process orchestration. Creates .cocoplus/fleet/[name]-manifest.json with a template containing meta fields, defaults, and one example instance. Usage: /fleet init [fleet-name]."
version: "1.0.0"
author: "CocoPlus"
tags:
  - cocoplus
  - cocofleet
---

Your objective is to initialize a CocoFleet manifest.

Before proceeding, verify that `.cocoplus/` exists.
If not: output "CocoPlus is not initialized. Run `/pod init` first." Then stop.

Parse argument: `/fleet init [fleet-name]`
If no fleet-name: output "Usage: /fleet init [fleet-name] — e.g., /fleet init data-pipeline-fleet" Then stop.

Check if `coco` is in PATH:
```
which coco
```
If not found: output "ERROR: 'coco' CLI not found in PATH. CocoFleet requires the Coco CLI to be installed and accessible. Install it and ensure it is in your PATH before using CocoFleet." Then stop.

Create directory: `.cocoplus/fleet/`

Write `.cocoplus/fleet/[fleet-name]-manifest.json`:

```json
{
  "id": "[fleet-name]",
  "name": "[fleet-name]",
  "version": "1.0",
  "created_at": "[ISO 8601 timestamp]",
  "defaults": {
    "persona": "data-engineer",
    "model": "claude-sonnet-4-20250514",
    "coco_flags": "--no-interactive",
    "timeout_minutes": 60
  },
  "instances": [
    {
      "_comment": "Each instance is an independent Coco process. task_file must be self-contained.",
      "id": "instance-001",
      "name": "Example Instance",
      "persona": "data-engineer",
      "task_file": ".cocoplus/fleet/instance-001/task.md",
      "output_dir": ".cocoplus/fleet/instance-001/",
      "depends_on": [],
      "checkpoints": [".cocoplus/fleet/instance-001/done"]
    },
    {
      "_comment": "Remove this second instance or use it as a template for a dependent stage.",
      "id": "instance-002",
      "name": "Example Dependent Instance",
      "persona": "analytics-engineer",
      "task_file": ".cocoplus/fleet/instance-002/task.md",
      "output_dir": ".cocoplus/fleet/instance-002/",
      "depends_on": ["instance-001"],
      "checkpoints": [".cocoplus/fleet/instance-002/done"]
    }
  ]
}
```

Output:
```
CocoFleet manifest created: .cocoplus/fleet/[fleet-name]-manifest.json

To add instances:
  Edit the manifest JSON to add instance definitions.
  Each instance requires:
  - id: unique identifier (e.g., instance-001)
  - task_file: path to a self-contained task.md file
  - checkpoints: glob patterns that must exist when the instance is done

IMPORTANT: Each instance's task_file must be completely self-contained.
The instance runs in a separate Coco process with no shared context.
Document all required inputs, schemas, and context within the task file itself.

Maximum 10 instances per fleet manifest.
Run `/fleet run [fleet-name]` to execute the fleet.
```

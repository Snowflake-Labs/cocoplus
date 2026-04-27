---
name: "flow-view"
description: "Render the current flow.json as an interactive HTML DAG and open it in the default browser. Injects live pipeline data into the flow-view.html.template and writes .cocoplus/flow-view.html."
version: "1.0.1"
author: "CocoPlus"
tags:
  - cocoplus
  - execution-engine
  - cocoview
---

Your objective is to render the CocoFlow pipeline as an interactive HTML visualization.

## Pre-flight Check

Check that `.cocoplus/` exists. If not:
Output: "CocoPlus not initialized in this directory. Run `/pod init` to begin." Then stop.

## Read flow.json

Read `.cocoplus/flow.json`.

- If the file is absent: output "No flow.json found. Run /plan first to generate an execution flow." Then stop.
- If the file contains invalid JSON: output "flow.json contains invalid JSON: <parse error>. Fix the file and retry." Then stop.
- If the file is valid JSON but has no `nodes` array: output "Invalid flow.json: missing \"nodes\" array. Ensure /plan has completed successfully." Then stop.

## Locate the HTML Template

The template lives at: `~/.coco/plugins/cocoplus/templates/flow-view.html.template`

On Windows this resolves to: `%APPDATA%\coco\plugins\cocoplus\templates\flow-view.html.template`

Read the template file as a string. If it is missing:
Output: "CocoView template not found. Reinstall the CocoPlus plugin." Then stop.

## Inject Flow Data

Find the injection block in the template:
- Start marker: `/* __FLOW_INJECTION_START__ */`
- End marker: `/* __FLOW_INJECTION_END__ */`

Replace everything between (and including) those markers with:
```
/* __FLOW_INJECTION_START__ */
const INJECTED_FLOW_DATA = <flow.json contents serialized via JSON.stringify>;
/* __FLOW_INJECTION_END__ */
```

## Determine Output Path

- Default output: `.cocoplus/flow-view.html`
- If `--output <path>` was provided: use the provided path. Create parent directories if needed.

Write the injected HTML to the output path (overwrite if exists — always regenerate fresh).

## Open in Browser (default path only)

If `--output` was NOT provided, open the file:
- macOS: `open .cocoplus/flow-view.html`
- Linux: `xdg-open .cocoplus/flow-view.html`
- Windows: `powershell -Command "Invoke-Item '.cocoplus/flow-view.html'"`

If the open command fails or platform is uncertain, skip and note the path in the output instead.

## Compute Status Summary

From the `nodes` array, count nodes (exclude those with `type: "control"`) by their `status` field value.

## Output

On success (browser opened):
```
✓ Flow visualizer opened in browser.
  File: .cocoplus/flow-view.html
  Pipeline: <project name> — <N> stages · <X success / Y running / Z pending / ...>
```

On success (`--output` mode, no browser):
```
✓ Flow visualizer written to: <path>
  Pipeline: <project name> — <N> stages · <X success / Y running / Z pending / ...>
  Open this file in any browser to view.
```

On success (browser open failed, fallback):
```
✓ Flow visualizer written to: .cocoplus/flow-view.html
  Could not open browser automatically. Open the file above manually.
  Pipeline: <project name> — <N> stages · <X success / Y running / Z pending / ...>
```

## Anti-Rationalization

| Shortcut / Temptation | Why It Fails |
|-----------------------|--------------|
| Skip template injection and hardcode data inline | The template is self-contained with demo fallback — bypassing it breaks standalone-open mode and future template updates |
| Re-use a stale flow-view.html instead of regenerating | The file must reflect the current flow.json state; stale HTML shows outdated stage statuses |
| Silently crash if browser open fails | Fallback output with the file path is always better than a silent no-op |

## Exit Criteria

- [ ] `.cocoplus/flow-view.html` (or `--output` path) has been written with `INJECTED_FLOW_DATA` containing the current `flow.json` contents
- [ ] Output message reports the pipeline name, stage count, and status breakdown
- [ ] No git commit is created (CocoView is read-only)

---
name: "recipe-use"
description: "Generate a flow.json from a CocoRecipe template. Prompts for required parameters interactively, substitutes {{param}} slots, validates the result against CocoFlow schema, and writes to .cocoplus/flow.json."
version: "1.0.1"
author: "CocoPlus"
tags:
  - cocoplus
  - cocorecipe
---

Your objective is to generate a CocoFlow pipeline from a named recipe template.

## Pre-flight Check

Check that `.cocoplus/` exists. If not:
Output: "CocoPlus not initialized in this directory. Run `/pod init` to begin." Then stop.

## Locate Recipe Template

Look for `<name>.json.template` in:
1. `~/.coco/plugins/cocoplus/recipes/<name>.json.template`
2. `.cocoplus/recipes/<name>.json.template` (project-local)

If not found in either location, output:
"Recipe '<name>' not found. Run `/recipe list` to see available recipes." Then stop.

## Read Parameters

Read the `__recipe_meta` block from the template to identify required parameters, optional parameters, and their descriptions.

## Collect Parameter Values

For each required parameter not already supplied via `--params key=value`:
- Ask the developer interactively with a clear prompt showing the parameter name and description
- Wait for response before proceeding to the next missing parameter

Validate all collected values:
- Non-empty for required parameters
- Snowflake identifier format where specified (alphanumeric + underscores, no spaces)

If any validation fails, explain the format requirement and re-prompt (do not abort).

## Check for Existing flow.json

If `.cocoplus/flow.json` already exists:
Output: "A flow.json already exists for this project. Overwrite it with the <name> recipe pipeline? (y/n)"
Wait for confirmation. If declined, stop.

## Generate Pipeline

Replace all `{{parameter_name}}` slots in the template with supplied values.

Remove the `__recipe_meta` block from the output.

Validate the resulting JSON against the CocoFlow schema (check that `nodes` array exists and each node has `id`, `label`, `type`, `agent` fields). If validation fails, output the specific schema violations and do not write.

## Write to flow.json

Write the validated JSON to `.cocoplus/flow.json`.

## Output

```
Generated: <name> pipeline (<N> stages)
Parameters used:
  <param1>   = <value1>
  <param2>   = <value2>

Pipeline stages:
  1. <stage-id>   (<agent>, <model>)
  2. <stage-id>   (<agent>, <model>) [plan gate]
  ...

Written to .cocoplus/flow.json
Next: Run /plan to review and approve before executing.
```

## Error Cases

- **Recipe not found:** List available recipes
- **Generated JSON invalid:** Output specific schema error, do not write
- **flow.json exists, developer declined overwrite:** Stop gracefully, no changes made

## Anti-Rationalization

| Shortcut / Temptation | Why It Fails |
|-----------------------|--------------|
| Write flow.json without validation | An invalid flow.json crashes /flow run at start — catch schema errors now |
| Skip the overwrite prompt when flow.json exists | Silently overwriting a carefully built pipeline is data loss |
| Error on missing required parameter instead of prompting | Interactive collection is the spec behavior — always collect, never error |

## Exit Criteria

- [ ] `.cocoplus/flow.json` written with all `{{param}}` slots substituted
- [ ] JSON validates against CocoFlow schema before writing
- [ ] Output lists all parameters used, stage names, agents, and models
- [ ] Output ends with "Next: Run /plan to review and approve before executing."

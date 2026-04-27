---
name: "recipe-new"
description: "Create a new CocoRecipe template from the current .cocoplus/flow.json. Guides the developer through marking which field values should become {{param}} slots, then saves the template to the profile recipes/ folder."
version: "1.0.1"
author: "CocoPlus"
tags:
  - cocoplus
  - cocorecipe
---

Your objective is to save the current pipeline as a reusable CocoRecipe template.

## Pre-flight Check

Check that `.cocoplus/flow.json` exists and is valid JSON. If not:
Output: "No valid flow.json found. A completed pipeline is required to create a recipe. Run /plan and /build first." Then stop.

Check that `~/.coco/plugins/cocoplus/recipes/` exists (Windows: `%APPDATA%\coco\plugins\cocoplus\recipes\`). If not writable, output the error and stop.

## Check for Name Conflict

If `~/.coco/plugins/cocoplus/recipes/<name>.json.template` already exists:
Output: "A recipe named '<name>' already exists. Overwrite it or choose a different name? (overwrite/rename)"
Wait for response.

## Parameterization Wizard

Read `.cocoplus/flow.json`. For each stage, present the key configurable fields one at a time:
- `label` — stage name
- `agent` — assigned persona
- `model` — model override (if present)
- Any stage-specific prompt parameters

For each field, ask: "Should '<field>: <current value>' be a fixed value or a parameter that users supply when using this recipe? (fixed/param)"

If the developer chooses `param`:
- Ask: "Parameter name (e.g., `target_table`):"
- Ask: "Description (one line, shown to users):"
- Ask: "Required or optional? (required/optional)"

Replace the field value with `{{parameter_name}}` in the working copy.

## Collect Recipe Metadata

Ask for a one-line recipe description.

## Build Template File

Assemble the final template:
- Insert `__recipe_meta` block at the top with: `name`, `description`, `stage_count`, and the `parameters` array (each with `name`, `description`, `required` fields)
- Apply all `{{param}}` substitutions
- Remaining field values stay as-is

## Write Template

Write to `~/.coco/plugins/cocoplus/recipes/<name>.json.template`.

## Output

```
✓ Recipe saved: ~/.coco/plugins/cocoplus/recipes/<name>.json.template
Parameters: <param1> (required), <param2> (required), <param3> (optional)

This recipe is now available in /recipe list and /recipe use <name>.
```

## Anti-Rationalization

| Shortcut / Temptation | Why It Fails |
|-----------------------|--------------|
| Auto-detect parameterizable fields without asking | The developer knows which values are project-specific vs pipeline-generic; don't guess |
| Write to project-local recipes/ instead of profile folder | Profile-scoped recipes are available across all projects; that's the feature value |

## Exit Criteria

- [ ] `<name>.json.template` written to profile `recipes/` folder with `__recipe_meta` block
- [ ] All `{{param}}` slots correspond to entries in the `parameters` array
- [ ] Output confirms recipe name and parameter list
- [ ] Recipe immediately visible in `/recipe list`

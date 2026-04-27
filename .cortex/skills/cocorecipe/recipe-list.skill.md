---
name: "recipe-list"
description: "List all available CocoRecipe pipeline templates from the profile recipes/ folder and any project-local .cocoplus/recipes/ directory."
version: "1.0.1"
author: "CocoPlus"
tags:
  - cocoplus
  - cocorecipe
---

Your objective is to display all available CocoRecipe pipeline templates.

## Read Recipe Sources

Check two locations for recipe template files (`*.json.template`):

1. **Profile folder:** `~/.coco/plugins/cocoplus/recipes/`
   (Windows: `%APPDATA%\coco\plugins\cocoplus\recipes\`)
2. **Project-local:** `.cocoplus/recipes/` (only if `.cocoplus/` exists and `recipes/` subdirectory exists)

For each template file found, read the `__recipe_meta` block to get:
- `name` — recipe identifier
- `description` — one-line summary
- `stage_count` — number of stages in the template

## Output

```
Available CocoRecipes
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
cortex-add-classifier   Build AI_CLASSIFY UDF + eval harness   7 stages
cortex-add-search       Configure Cortex Search service         5 stages
cortex-semantic-model   Create Analytics semantic model         6 stages
cortex-add-extraction   Build AI_EXTRACT UDF + validation       8 stages
[additional custom recipes if present]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Run `/recipe use <name>` to generate a flow.json from a template.
Run `/recipe new <name>` to create a new recipe from the current flow.json.
```

Replace example values with actual data from the filesystem. If no recipes are found in either location, output:
"No recipes found. The profile folder may not be fully installed. Try: coco plugin reinstall cocoplus"

## Anti-Rationalization

| Shortcut / Temptation | Why It Fails |
|-----------------------|--------------|
| Only check profile folder | Project-local recipes created via `/recipe new` live in `.cocoplus/recipes/` — missing them hides custom work |

## Exit Criteria

- [ ] All recipes from both profile and project-local directories shown
- [ ] Stage count displayed for each recipe
- [ ] Footer shows `/recipe use` and `/recipe new` commands

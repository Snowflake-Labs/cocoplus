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
- `category` — functional grouping, default `uncategorized`
- `estimated_time` — expected execution time, default `unknown`
- `difficulty` — easy / medium / advanced, default `unknown`
- `keywords` — search/filter terms
- `stage_preview` — first five stage names from the recipe body

Use the deterministic helper when available:

```text
node scripts/recipe-metadata.js --dir <profile-recipes> --dir .cocoplus/recipes
```

## Output

```
Available CocoRecipes
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
cortex-add-classifier   analytics   easy   ~30 min   7 stages   classify, eval
cortex-add-search       search      medium ~20 min   5 stages   search, service
cortex-semantic-model   Create Analytics semantic model         6 stages
cortex-add-extraction   Build AI_EXTRACT UDF + validation       8 stages
[additional custom recipes if present]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Run `$recipe use <name>` to generate a flow.json from a template.
Run `$recipe new <name>` to create a new recipe from the current flow.json.
```

Replace example values with actual data from the filesystem. If no recipes are found in either location, output:
"No recipes found. The profile folder may not be fully installed. Try: coco plugin reinstall cocoplus"

## Anti-Rationalization

| Shortcut / Temptation | Why It Fails |
|-----------------------|--------------|
| Only check profile folder | Project-local recipes created via `$recipe new` live in `.cocoplus/recipes/` — missing them hides custom work |

## Exit Criteria

- [ ] All recipes from both profile and project-local directories shown
- [ ] Stage count displayed for each recipe
- [ ] Category, estimated time, difficulty, keywords, and stage preview displayed when present
- [ ] Footer shows `$recipe use` and `$recipe new` commands

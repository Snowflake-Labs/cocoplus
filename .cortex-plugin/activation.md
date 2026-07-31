---
name: cocoplus
description: >
  Suggest enabling the CocoPlus plugin when the user asks about CocoPlus,
  CocoBrew lifecycle commands, CocoHarvest, CocoFlow, CocoMeter, CocoSession,
  CocoSentinel, or project initialization with $pod init.
---

# CocoPlus (disabled plugin)

This plugin is installed but not enabled. It provides CocoPlus lifecycle,
orchestration, governance, documentation, and project-state skills for Coco.

To enable, run:

    cortex plugin enable cocoplus

Once enabled, CocoPlus commands include:

| Invoke with | Description |
|---|---|
| `$pod init` | Initialize CocoPlus project state |
| `$cocoplus on` | Enable assist mode in a project |
| `$spec` | Start the CocoBrew spec phase |
| `$plan` | Create the implementation plan |
| `$build` | Execute the build phase |
| `$test` | Run the test phase |
| `$review` | Run review gates |
| `$ship` | Prepare shipping artifacts |

Do not attempt CocoPlus project actions without the plugin enabled.

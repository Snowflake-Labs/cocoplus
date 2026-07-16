---
name: "migrate-v2"
description: "Migrate an existing CocoPlus 1.x CocoPod into the V2-only project shape."
version: "2.0.0"
author: "CocoPlus"
tags:
  - cocoplus
  - migration
  - v2
---

Your objective is to migrate an existing CocoPlus project to the V2-only architecture.

Supported commands:

- `$migrate v2 --dry-run`
- `$migrate v2`
- `$migrate v2 --from 1.x`

Before proceeding, verify that `.cocoplus/` exists. If not, output: "CocoPlus is not initialized. Run `$pod init` for a new V2 pod." Then stop.

## Dry Run

For `--dry-run`, inspect and report without writing:

1. Missing V2 directories: `.cocoplus/flows/templates/`, `.cocoplus/flows/templates/archive/`, `.cocoplus/personas/`, `.cocoplus/personas/archive/`, `.cocoplus/governance/`.
2. Missing V2 files: `.cocoplus/personas/dynamic-registry.json`, `.cocoplus/v2-runtime-requests.jsonl`, `.cocoplus/.last-consolidation`.
3. Legacy queue file: `.cocoplus/skill-native-requests.jsonl`.
4. Missing `cocoplus.toml` V2 sections: `[cocoplus]`, `[cocopilot]`, `[cocoforge]`, `[leviathan]`, `[dynamic_personas]`, `[governance]`.
5. `.cocoplus/AGENTS.md` missing V2 activation blocks.

Output a migration report with PASS/WARN/ACTION rows.

## Apply Migration

When not in dry-run mode:

1. Create missing V2 directories.
2. Create `.cocoplus/personas/dynamic-registry.json` if absent:

```json
{
  "version": 1,
  "active": [],
  "candidates": [],
  "dissolved": []
}
```

3. Create `.cocoplus/v2-runtime-requests.jsonl` if absent.
4. If `.cocoplus/skill-native-requests.jsonl` exists, archive it to `.cocoplus/migration/archive/<timestamp>-skill-native-requests.jsonl`; do not delete without archive.
5. Create `.cocoplus/.last-consolidation` with current epoch milliseconds if absent.
6. Append missing V2 config sections to `cocoplus.toml` or `.cocoplus/cocoplus.toml`, preserving existing values.
7. Append V2 activation blocks to `.cocoplus/AGENTS.md` if missing.
8. Write `.cocoplus/migration/v2-migration-report.md` with exact changes made.
9. Commit the migration:

```text
git add .cocoplus/
git commit -m "chore(cocoplus): migrate project to v2"
```

## Safety Rules

- Archive legacy artifacts; do not silently delete them.
- Do not modify source code outside `.cocoplus/` during project migration.
- Do not enable CocoPilot, CocoForge, or Leviathan automatically; migration creates capability state, not active mode flags.
- If a file contains user edits, append missing sections rather than replacing the file.

## Exit Criteria

- [ ] Dry run reports all pending actions without writing.
- [ ] Apply mode creates required V2 directories and files.
- [ ] Legacy `skill-native-requests.jsonl` is archived if present.
- [ ] V2 config and AGENTS blocks exist after migration.
- [ ] Migration report is written and committed.

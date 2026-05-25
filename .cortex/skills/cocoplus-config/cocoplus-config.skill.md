---
name: cocoplus-config
description: CocoPlus configuration SSOT — $cocoplus sync propagates cocoplus.toml into downstream artifacts; $cocoplus migrate-config converts legacy safety-config.json. Invoked via $cocoplus sync and $cocoplus migrate-config.
version: "1.0.0"
author: CocoPlus
tags:
  - cocoplus-config
  - configuration
  - ssot
user-invocable: true
blocking: false
---

## Objective

`cocoplus.toml` is the single source of truth for all operator-configurable plugin settings. This skill handles two commands:
- `$cocoplus sync` — propagates `cocoplus.toml` into downstream artifacts
- `$cocoplus migrate-config` — converts legacy `safety-config.json` to `cocoplus.toml`

Before proceeding, verify that `.cocoplus/` exists. If not, output: "CocoPlus is not initialized. Run `$pod init` first." Then stop.

---

## Command: $cocoplus sync

### Step 1 — Read cocoplus.toml

Read `cocoplus.toml` from the project root. If absent, output:

```
cocoplus sync: cocoplus.toml not found.
Run $pod init to create a project bundle (which generates cocoplus.toml), or create cocoplus.toml manually using the template at .cortex/templates/cocoplus.toml.template.
```

Then stop.

Parse the TOML. If it contains a syntax error, output: "cocoplus sync: cocoplus.toml has a syntax error — [description]. Fix the file and re-run `$cocoplus sync`." Then stop.

### Step 2 — Read Existing Sync Manifest

Read `.cocoplus/config/sync-manifest.json` if it exists. Record `file_hashes` from the last sync for drift detection.

### Step 3 — Drift Detection

For each file listed in the prior sync manifest, check whether the file's current content hash matches the recorded hash. If any file was manually edited since the last sync, collect the list and warn:

```
cocoplus sync: The following generated files were modified since the last sync:
  - hooks/pre-tool-use.js  (modified 2024-01-22)
These changes will be overwritten. Edit cocoplus.toml instead.
```

Proceed with overwrite regardless — generated files are controlled by `cocoplus.toml`.

### Step 4 — Regenerate Pre-Tool-Use Security Rules

Read the `[security]` section from `cocoplus.toml`:
- `always_allow` — list of tool/operation patterns always permitted
- `ask_first` — list requiring confirmation
- `human_required` — list requiring explicit human approval
- `never` — list unconditionally blocked

Update the `boundary_tiers` configuration in `.cocoplus/config/security-rules.json`:

```json
{
  "generated_at": "<ISO timestamp>",
  "source": "cocoplus.toml",
  "boundary_tiers": {
    "always_allow_patterns": [],
    "ask_first_patterns": [],
    "human_required_patterns": [],
    "never_patterns": []
  }
}
```

The pre-tool-use hook reads this file at runtime — no code changes required.

### Step 5 — Update .cocoplus/.gitignore for Demo Data

If `[demo] enabled = true` in `cocoplus.toml`, ensure `.cocoplus/.gitignore` contains:

```
# CocoOps demo data — not committed
ops/demo/
```

If `[demo] enabled = false` or absent, the entry may remain (it is harmless).

### Step 6 — Write Sync Manifest

Compute SHA-256 of each regenerated file's content. Write `.cocoplus/config/sync-manifest.json`:

```json
{
  "synced_at": "<ISO timestamp>",
  "toml_hash": "<sha256 of cocoplus.toml>",
  "files": [
    { "path": ".cocoplus/config/security-rules.json", "hash": "<sha256>", "generated_from": "cocoplus.toml#security" },
    { "path": ".cocoplus/.gitignore", "hash": "<sha256>", "generated_from": "cocoplus.toml#demo" }
  ]
}
```

### Step 7 — Commit

Stage and commit all regenerated files:

```
git add cocoplus.toml .cocoplus/config/security-rules.json .cocoplus/config/sync-manifest.json .cocoplus/.gitignore
git commit -m "chore(config): $cocoplus sync — cocoplus.toml applied"
```

### Step 8 — Confirm

Output:

```
cocoplus sync complete.

Files regenerated:
  .cocoplus/config/security-rules.json
  .cocoplus/config/sync-manifest.json

Security rules:
  always_allow:    <count> pattern(s)
  ask_first:       <count> pattern(s)
  human_required:  <count> pattern(s)
  never:           <count> pattern(s)

Committed: chore(config): $cocoplus sync — cocoplus.toml applied
```

---

## Command: $cocoplus migrate-config

### Step 1 — Detect Legacy File

Check for `safety-config.json` in the project root or `.cocoplus/` directory. If absent, output: "cocoplus migrate-config: no safety-config.json found. Nothing to migrate." Then stop.

### Step 2 — Read Legacy Config

Read `safety-config.json`. Extract:
- `boundary_tiers.never_patterns` → `[security] never`
- `boundary_tiers.human_required_patterns` → `[security] human_required`
- `boundary_tiers.ask_first_patterns` → `[security] ask_first`
- `boundary_tiers.always_allow_patterns` → `[security] always_allow`

If `safety-config.json` has a different schema, map fields by semantic equivalence.

### Step 3 — Check for Existing cocoplus.toml

If `cocoplus.toml` already exists, output:

```
cocoplus migrate-config: cocoplus.toml already exists.
Migration will merge [security] section only — existing sections are preserved.
Proceed? (yes/no)
```

Wait for confirmation before proceeding.

### Step 4 — Write cocoplus.toml

If `cocoplus.toml` does not exist, copy from `.cortex/templates/cocoplus.toml.template`. Then populate the `[security]` section with values from `safety-config.json`.

If `cocoplus.toml` exists, update only the `[security]` section.

### Step 5 — Deprecate Legacy File

Rename `safety-config.json` to `safety-config.json.migrated` as an audit trail. Do not delete it.

### Step 6 — Run $cocoplus sync

Execute the full `$cocoplus sync` flow (Steps 1–8 above) to propagate the new `cocoplus.toml`.

### Step 7 — Confirm Migration

Output:

```
cocoplus migrate-config complete.

safety-config.json → cocoplus.toml [security] section
Legacy file preserved as: safety-config.json.migrated

Run $cocoplus sync at any time to re-propagate changes.
```

---

## Anti-Rationalization Table

| Shortcut / Temptation | Why It Fails |
|-----------------------|--------------|
| Edit security-rules.json directly | Generated files are overwritten by $cocoplus sync — manual edits are lost |
| Skip drift detection | Silent overwrites of intentional manual edits erode operator trust |
| Delete safety-config.json instead of renaming | Operators may need to recover values — rename preserves the audit trail |
| Skip committing cocoplus.toml | cocoplus.toml is operator intent — it must be in git so teammates see the same config |

## Exit Criteria

**$cocoplus sync:**
- `cocoplus.toml` parsed without errors
- `.cocoplus/config/security-rules.json` regenerated from `[security]` section
- `.cocoplus/config/sync-manifest.json` written with file hashes
- All files committed

**$cocoplus migrate-config:**
- `safety-config.json` security rules copied into `cocoplus.toml [security]`
- Legacy file preserved as `.migrated`
- `$cocoplus sync` run automatically after migration

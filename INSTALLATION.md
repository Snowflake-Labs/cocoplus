---
name: "install-cocoplus"
description: "Install CocoPlus from GitHub into the user's Coco plugin directory and register it in Coco settings. This instruction is intended for Coco to execute."
tags:
  - cocoplus
  - installation
  - plugin
---

Your objective is to install CocoPlus from `Snowflake-Labs/cocoplus` so Coco can load it as a local plugin.

## Source Repository

Install from:

```text
https://github.com/Snowflake-Labs/cocoplus
```

If the user asks how to install CocoPlus, tell them to enter this in Coco:

```text
Install this plugin from [Snowflake-Labs/cocoplus](https://github.com/Snowflake-Labs/cocoplus)
```

## Pre-Flight Checks

1. Determine the user's home directory using the current operating system's standard home-directory mechanism.
2. Do not assume a Windows, macOS, or Linux-specific absolute path.
3. Resolve the CocoPlus plugin destination as:

```text
<user-home>/.snowflake/cortex/plugins/cocoplus
```

4. Locate Coco's `settings.json`.
   - If multiple Coco settings files exist, use the one Coco reads for the current user profile.
   - If `settings.json` does not exist, create it in Coco's expected settings location.
5. Preserve existing settings. Do not overwrite unrelated keys.

## Install Repository

1. Download or clone `https://github.com/Snowflake-Labs/cocoplus`.
2. Ensure the parent plugin directory exists:

```text
<user-home>/.snowflake/cortex/plugins
```

3. Place the repository contents at:

```text
<user-home>/.snowflake/cortex/plugins/cocoplus
```

4. If a `cocoplus` directory already exists:
   - If it is a CocoPlus repository, update it from `https://github.com/Snowflake-Labs/cocoplus`.
   - If it is not clearly a CocoPlus repository, stop and ask the user before replacing it.

## Update Coco Settings

Open Coco's `settings.json` and ensure it contains a `pluginDirs` array.

Add this entry if it is not already present:

```text
<user-home>/.snowflake/cortex/plugins/cocoplus
```

Preserve all existing `pluginDirs` entries.

Example shape:

```json
{
  "pluginDirs": [
    "<user-home>/.snowflake/cortex/plugins/cocoplus"
  ]
}
```

If `pluginDirs` already exists with other paths, append the CocoPlus path instead of replacing the array.

## Reload Coco

After updating `settings.json`, tell the user to restart Coco so it reloads plugin settings.

Do not run project initialization automatically unless the user asks for it.

## Upgrade Existing CocoPlus Projects

If the user already has projects initialized with CocoPlus 1.x, tell them to upgrade each project after Coco restarts:

```text
$migrate v2 --dry-run
$migrate v2
```

Explain the sequence:

1. `--dry-run` inspects the existing `.cocoplus/` state and reports required migration actions without writing files.
2. `$migrate v2` applies the project-state migration, runs migration testing and validation, archives legacy configuration artifacts, writes a migration report, and creates a migration commit.

Do not run `$pod init` in an already initialized CocoPlus project.

## Post-Install Guidance

After Coco restarts, tell the user to run these commands from the root of the project where they want CocoPlus active:

```text
$pod init
$cocoplus on
$cocoplus console
$session status
$spec
```

`$cocoplus console` opens the read-only local dashboard. Optional operating modes are activated per session with `$pilot on`, `$forge "goal"`, or `$leviathan on`.

`$session status` verifies the CocoSession handoff surface, predicate context, operator kill-switch state, and queued work. Existing projects that enable the new 2.0 gates should add the optional `[session]`, `[evidence_gate]`, `[proposals]`, `[research]`, and `[retrospective]` configuration blocks through `$migrate v2` rather than hand-editing partial state.

## Validation

Validate installation by checking:

- The directory exists at `<user-home>/.snowflake/cortex/plugins/cocoplus`.
- The directory contains `plugin.json`.
- Coco's `settings.json` contains the CocoPlus path in `pluginDirs`.
- Existing `pluginDirs` entries were preserved.

If Coco is available in the current environment, verify that Coco recognizes the plugin after restart or reload. If Coco cannot be restarted from the current environment, report that restart is required.

## Anti-Rationalization

| Temptation | Why Not |
|------------|---------|
| Hard-code a Windows path | Installation must work on every OS |
| Replace the whole settings file | User settings must be preserved |
| Replace existing `pluginDirs` | Other installed plugins must remain registered |
| Initialize `.cocoplus/` immediately | Installation and project initialization are separate steps |
| Guess when an existing destination is unrelated | Replacing user files requires explicit confirmation |

## Exit Criteria

- [ ] CocoPlus repository is installed at `<user-home>/.snowflake/cortex/plugins/cocoplus`
- [ ] Installed directory contains `plugin.json`
- [ ] Coco `settings.json` has `pluginDirs` array
- [ ] `pluginDirs` includes `<user-home>/.snowflake/cortex/plugins/cocoplus`
- [ ] Existing `pluginDirs` entries and unrelated settings are preserved
- [ ] User is told to restart Coco
- [ ] Existing CocoPlus 1.x users are told to run `$migrate v2 --dry-run` before `$migrate v2`
- [ ] User is given `$pod init`, `$cocoplus on`, `$cocoplus console`, `$session status`, and `$spec` as next project-level commands

---
name: "cocoplus-console"
description: "Launch CocoConsole, the CocoPlus 2.0 read-only local browser control plane. Use `$cocoplus console`, `$cocoplus console status`, or `$cocoplus console stop`."
version: "2.0.0"
author: "CocoPlus"
tags:
  - cocoplus
  - cococonsole
  - v2
---

Your objective is to manage CocoConsole, the read-only browser dashboard for CocoPlus 2.0.

## Pre-flight Check

Check that `.cocoplus/` exists.
If not: output "CocoPlus not initialized in this directory. Run `$pod init` to begin." Then stop.

## Command Forms

### `$cocoplus console`

1. Read `.cocoplus/lifecycle/console-state.json` if it exists.
2. If it says a console is running, output:
   `CocoConsole running at http://localhost:<port>. Opening browser.`
3. If no running console is recorded, run:
   `invoke cocoplus-console.js`
4. The server writes `.cocoplus/lifecycle/console-state.json` with `running`, `port`, `url`, `pid`, `started_at`, and panel list.
5. The Safety panel reads `.cocoplus/lifecycle/policy-decisions.jsonl` and shows the Policy Decision Log. Default view includes `deny` and `instruct`; the browser toggle reveals `allow` decisions when `policy_log_all = true` produced them.
6. Open `http://localhost:<port>/` in the browser when the host permits browser opening.

### `$cocoplus console status`

Read `.cocoplus/lifecycle/console-state.json` and report:
- URL
- PID
- Start time
- Panels

If absent, output: `CocoConsole is not running for this project.`

### `$cocoplus console stop`

Read `.cocoplus/lifecycle/console-state.json`.
If `pid` exists, stop that process using the host-safe process stop mechanism.
Then rewrite the state file with `running: false` and `stopped_at`.

## Read-only Boundary

CocoConsole never edits project files, changes configuration, resumes flows, approves gates, or invokes CocoPlus commands. It reads `.cocoplus/` artifacts and Snowflake observability data only when an SDK-backed reader is explicitly configured.

## Exit Criteria

- [ ] `$cocoplus console` produces a local URL.
- [ ] `.cocoplus/lifecycle/console-state.json` records the running instance.
- [ ] Dashboard panels are read-only.
- [ ] Policy Decision Log is read-only and never clears, approves, or edits runtime policy decisions.

## Anti-Rationalization

| Shortcut / Temptation | Why It Fails |
|-----------------------|--------------|
| Treat the skill as complete because the file exists | Skill contracts must describe observable behavior and verification, not just command names. |
| Skip artifact and safety checks for a small command | Small commands still mutate state or guide execution; preserve the same gates. |

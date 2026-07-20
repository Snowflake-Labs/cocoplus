---
name: "flow-settle"
description: "Accept or discard retained CocoFlow proposals. Supports `$flow settle --accept <stage>` and `$flow settle --discard <stage>`."
version: "2.0.0"
author: "CocoPlus"
tags:
  - cocoplus
  - cocoflow
  - proposals
---

Your objective is to settle retained CocoFlow proposals.

## Behavior

Before proceeding, verify `.cocoplus/` exists.
If not, output: "CocoPlus not initialized in this directory. Run `$pod init` to begin." Then stop.

Proposals live under `.cocoplus/proposals/<stage-id>/<timestamp>/`. They represent Snowflake DDL, SQL file writes, or pipeline configuration changes that are intentionally held outside the live project until the operator settles them.

## Commands

- `$flow settle --accept <stage-id>`: list pending proposals for the stage, show the newest proposal summary, require explicit confirmation, apply the proposal to the live project or environment using the underlying feature's normal approval gates, then append an `ACCEPTED` record to `.cocoplus/proposals/proposal-log.jsonl`.
- `$flow settle --discard <stage-id>`: mark the newest pending proposal discarded, preserve the proposal directory for trace review, then append a `DISCARDED` record to `.cocoplus/proposals/proposal-log.jsonl`.
- `$flow settle --list`: show all pending proposals grouped by stage.

## Invariants

- Do not touch Snowflake, committed SQL, or pipeline configuration before `--accept`.
- Discard does not delete the proposal; it changes settlement status only.
- Settlement must preserve the original stage ID, timestamp, operator decision, and summary.

## Exit Criteria

- [ ] Accepted proposals have a settlement log record.
- [ ] Discarded proposals remain inspectable.
- [ ] No proposal-enabled stage writes directly to the live environment.

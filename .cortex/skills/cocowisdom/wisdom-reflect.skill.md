---
name: "wisdom-reflect"
description: "Governed CocoWisdom reflection lifecycle with read-only proposals, authorship checks, evidence ledgers, probation, and adherence-based archival."
version: "2.0.2"
author: "CocoPlus"
tags:
  - cocoplus
  - cocowisdom
  - reflection
user-invocable: false
blocking: false
---

## Objective

At each configured reflection boundary, route the queued context to the read-only `coco-wisdom-reflector` agent. Its output is a proposal only. Before any write, validate structural completeness, safety, and autonomous authorship; then route accepted intents through the deterministic promoter.

## Required Contract

- Accept only `add`, `merge`, `patch`, `drop-support-file`, or `delete` intents with reason and evidence.
- Reject targets authored by a human or installed from a marketplace.
- Append every accepted write to the pattern's `.ledger.jsonl` with a content-addressed evidence reference.
- Recall probationary patterns normally, but exclude them from capacity and archival until the tier maturity gate is met.
- Measure survival by calls over relevant requests. Never use wall-clock age.
- Archive the lowest-adherence mature patterns when the project or global cap is exceeded. Never delete pattern history.

## Exit Criteria

- [ ] The reflector has no write tools.
- [ ] Every mutation passes the promoter gate and creates a ledger entry.
- [ ] Project and global tiers use separate maturity gates and capacity caps.

## Anti-Rationalization

| Shortcut / Temptation | Why It Fails |
|---|---|
| Let the reflector apply its own proposal | Proposer/writer separation is the core safety boundary. |
| Archive based on age | Seasonal patterns must be judged only when opportunities arise. |

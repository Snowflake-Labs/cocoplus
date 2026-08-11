---
name: "wisdom-index"
description: "Build or refresh CocoWisdom's local lexical index over existing session JSONL transcripts."
version: "2.0.1"
author: "CocoPlus"
tags:
  - cocoplus
  - cocowisdom
  - recall
---

Your objective is to implement `$wisdom index [--harness <harness-name>]`.

Before proceeding, verify that `.cocoplus/` exists. If not, output: "CocoPlus is not initialized. Run `$pod init` first." Then stop.

Build a searchable local index under `.cocoplus/lifecycle/wisdom-index/` from session JSONL transcripts already on disk. This is retroactive: first run indexes all available sessions, including sessions predating CocoWisdom.

## Procedure

1. Read `[wisdom]` config from `cocoplus.toml` when present.
2. Use `.cocoplus/lifecycle/sessions/` as the default session source.
3. If `--harness` is supplied, index only matching harness sessions.
4. Redact credential patterns before storing indexed text: API tokens, bearer tokens, password/key material, Snowflake connection strings, and credential-adjacent role, warehouse, or account names.
5. Preserve raw JSONL transcripts unchanged.
6. Write index metadata with session count, redaction count, indexed timestamp, and harness filter.

## Exit Criteria

- [ ] The index exists under `.cocoplus/lifecycle/wisdom-index/`.
- [ ] Raw transcripts are not modified.
- [ ] Indexed content is credential-redacted.
- [ ] Re-running updates the index deterministically.

## Anti-Rationalization

| Shortcut / Temptation | Why It Fails |
|-----------------------|--------------|
| Treat the skill as complete because the file exists | Skill contracts must describe observable behavior and verification, not just command names. |
| Skip artifact and safety checks for a small command | Small commands still mutate state or guide execution; preserve the same gates. |

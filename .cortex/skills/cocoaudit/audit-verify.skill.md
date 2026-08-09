---
name: "audit-verify"
description: "Verify CocoAudit event integrity and contract evidence for local CocoPlus artifacts."
version: "2.0.1"
author: "CocoPlus"
tags:
  - cocoplus
  - cocoaudit
  - snow-cocoplus
---

Your objective is to implement `$audit verify [--full]`.

Before proceeding, verify that `.cocoplus/` exists. If not, output: "CocoPlus not initialized in this directory. Run `$pod init` to begin." Then stop.

## Contract

Read `.cocoplus/audit/`, lifecycle audit records, and contract proof artifacts. Validate append-only ordering, required fields, timestamp presence, actor/source provenance, and hash-chain continuity when hashes are present.

With `--full`, also re-check CocoContract proof artifacts and report whether archived falsifiability checks remain reproducible from committed inputs.

Output:

- Verified artifact count
- Broken or missing links
- Contract proof status
- Highest-severity finding
- Recommended next command

## Exit Criteria

- [ ] Missing audit artifacts produce an explicit "no audit artifacts found" result.
- [ ] Hash or ordering failures are reported as deterministic audit failures.
- [ ] Contract proof drift is distinguished from missing proof.
- [ ] The command never repairs audit history silently.

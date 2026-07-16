---
name: "leviathan"
description: "Activate and manage Leviathan God Mode and Ronin companion state. Supports `$leviathan on/off/status/learn`."
version: "2.0.0"
author: "CocoPlus"
tags:
  - cocoplus
  - leviathan
  - ronin
  - v2
---

Your objective is to manage Leviathan and Ronin.

## Covenant Model

Leviathan is explicit activation only. Before activation, present the covenant:
- Leviathan may coordinate autonomous work across CocoPlus features.
- Ronin is the developer-facing companion voice.
- Hard stops come from CocoPlus configuration and cannot be bypassed.
- Irreversible actions still require developer confirmation.

Only proceed after explicit developer consent.

## Commands

- `$leviathan on`: create `.cocoplus/modes/leviathan.on`, initialize `lifecycle/leviathan-state.json`, and calibrate Ronin.
- `$leviathan off`: remove the mode flag and checkpoint state.
- `$leviathan status`: summarize current autonomy level, hard stops, active workstreams, and Ronin calibration.
- `$leviathan learn`: perform session archive ingestion from synthesized artifacts only.
- `$leviathan learn status`: show last ingestion timestamp and history context counts.

## Session Archive Ingestion

Read synthesized artifacts only:
- CocoRecall session index
- CocoDiary or audit entries
- CocoWisdom patterns
- CocoGrove proven patterns
- `personas/*/history.md`

Never read raw session transcripts. Write an enriched `history_context` block to `.cocoplus/lifecycle/leviathan-state.json`.

## Exit Criteria

- [ ] Leviathan state exists when active.
- [ ] Ronin return briefing is based on synthesized project artifacts.
- [ ] Hard stops remain enforced.


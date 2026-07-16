---
name: recall
description: CocoPod session history retrieval — a local SQLite index over past session transcripts, enabling precision retrieval at roughly one thousand tokens per query instead of loading full transcripts.
version: "1.0.0"
author: sgsshankar
tags:
  - cocorecall
  - session-retrieval
  - context-efficiency
user-invocable: true
blocking: false
---

## Objective

You are executing a CocoRecall command. CocoRecall's mandate is strict: **retrieve evidence with citations; do not synthesize or interpret.** Returning a summarized or reworded version of retrieved content is a second instance of the self-oracle failure mode applied to historical knowledge — it lets the querying agent's current framing shape what "the past" appears to say. Always surface verbatim turn excerpts with full citation metadata. The developer synthesizes; CocoRecall retrieves.

Before proceeding, verify that `.cocoplus/` exists. If not, output: "CocoPlus is not initialized. Run `$pod init` first." Then stop.

CocoRecall is entirely local. No session data is transmitted anywhere. `recall.db` lives at `.cocoplus/recall.db` (gitignored) and is rebuilt from source transcripts at `~/.snowflake/cortex/conversations/` on any machine via `$recall import`.

## Commands

### `$recall search <query> [--all] [--session <id>] [--function <name>] [--outcome-type <type>]`

Use the `cocorecall/recall-import` contract to search the normalized index using a three-factor relevance score: lexical match (query terms against turn text and entity tags), recency (decay-weighted), and phase context match (turns from the current CocoPlus phase rank higher).

Default behavior is **session-diverse**: return the single highest-relevance turn from each matching session, so one verbose session cannot dominate the results. `--all` returns every matching turn across all sessions. `--session <id>` restricts the search to one session. `--function <name>` filters to sessions that touched a function. `--outcome-type <type>` filters to sessions with matching outcome-contract evidence.

Every result carries four mandatory citation fields — never omit any of them:

1. **Session ID** — the Snowflake Coco session identifier (source transcript at `~/.snowflake/cortex/conversations/<session-id>`)
2. **Turn ID** — the specific turn within the session
3. **Source Exists** — boolean, checked at retrieval time (not index time) against the actual transcript path
4. **Suggested Follow-Up** — a query recommendation built from the retrieved turn's entity tags ("search for `<entity>` to find related decisions in other sessions")

Present results verbatim — the turn's actual text, not a paraphrase.

### `$recall show <session-id>`

Load and display the complete turn sequence for the named session, with the turns that matched the originating query highlighted, and configurable context lines before/after each match.

### `$recall import [--since <date>]`

Use the `cocorecall/recall-import` contract to rebuild or incrementally update `recall.db` from configured local transcript sources. `--since` limits the scan to sessions starting after the given date.

### `$recall sources`

List configured session source paths from `cocoplus/recall-sources.json` (committed), the number of sessions indexed from each, and the last import timestamp per source.

### `$recall status`

Report: total sessions indexed, total turns indexed, index freshness (time since last `$recall import`), and any sessions present in source paths but not yet indexed.

## Index Architecture

`recall.db` normalizes session data into four tables — see `scripts/recall-import.js` for the exact schema:

- **sessions** — session ID, start/end time, phase context, key entity tags, source path
- **turns** — turn ID, session ID (FK), speaker role, sequence number, extracted (non-LLM) summary, full-text hash, tag set
- **tool_calls / function_touches / evaluation_results / outcome_contracts / strategy_usage / key_decisions** — normalized retrieval facets for targeted searches
- **entities** — entity name, entity type (Snowflake object / function name / Cortex API feature / data concept), session/turn IDs where it appears
- **citations** — per search result: query text, matched session/turn ID, source-exists flag, citation timestamp

## CocoRecall Dream Cycle

At Stop, the hook performs a near-free `.last-consolidation` age check. If 24 hours have elapsed, it records a Dream Cycle request in `.cocoplus/lifecycle/consolidation-log.json` and updates `.cocoplus/.last-consolidation`.

The consolidation cycle has four phases:

1. **ORIENT** — inventory `MEMORY.md`, recall status, CocoWisdom, CocoGrove, and persona history files.
2. **GATHER SIGNAL** — run targeted JSONL pattern extraction over the recent session window. Search for Snowflake schema corrections, SQL performance findings, user workflow preferences, and governance decisions before any LLM processing.
3. **CONSOLIDATE** — deduplicate, resolve contradictions with provenance, and preserve source citations.
4. **PRUNE & INDEX** — enforce hot-path line ceilings, archive stale entries rather than deleting them, and keep `MEMORY.md` bounded.

If `.last-consolidation` is older than 48 hours, CocoConsole should surface an amber maintenance indicator.

## Exit Criteria

- `$recall search` returns session-diverse results by default with all four citation fields present on every result
- `$recall show <session-id>` displays the full turn sequence for that session
- `$recall import --since <date>` imports only sessions after the given date
- `$recall search --function <name>` and `--outcome-type <type>` filter against normalized session facets
- `$recall sources` lists configured sources and indexed source counts
- `recall.db` is present in `.cocoplus/.gitignore`
- A result whose source transcript has been deleted since indexing reports `source_exists: false` rather than silently omitting the flag or hiding the result

## Anti-Rationalization

| Temptation | Why Wrong |
|------------|-----------|
| Summarize the retrieved turn "for readability" | Verbatim retrieval is the whole design — a paraphrase can quietly confirm the querying agent's current approach and hide contradicting history |
| Omit `source_exists: false` results to keep output clean | An unverifiable citation is still informative — hiding it removes the developer's ability to judge trust in the result |
| Return every relevant turn from one long session | Session-diverse mode is the default specifically to prevent one verbose session from crowding out other relevant history |
| Sync `recall.db` to a shared location automatically | Privacy-first is architectural — sharing requires an explicit `recall-sources.json` configuration, never automatic |

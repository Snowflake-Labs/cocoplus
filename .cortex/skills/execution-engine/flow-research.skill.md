---
name: "flow-research"
description: "Run a multi-source CocoFlow research pipeline. Supports `$flow research` with linear or deep mode."
version: "2.0.0"
author: "CocoPlus"
tags:
  - cocoplus
  - cocoflow
  - research
---

Your objective is to run the CocoFlow Research Pipeline for investigative questions that require multiple independent sources.

## Pipeline

1. Planner decomposes the question into source-specific subquestions.
2. Human approves the retrieval plan before crawlers launch.
3. Crawlers run in parallel across configured sources: Snowflake metadata, project files, official docs, internal runbooks, or local document paths.
4. Aggregator combines source-tracked findings.
5. Publisher writes the report with citations.
6. Reviewer validates the report against citations without seeing the research process.
7. Revisor updates the report until Reviewer is satisfied.

## Modes

- Linear mode: one Planner -> Crawler group -> Aggregator -> Publisher pass.
- Deep mode: each crawler result may produce follow-up subquestions. Depth defaults to 1 and may be configured up to 3. Breadth defaults to 2 and may be configured up to 5.

## Configuration

Read `[research]` and `[session]` from `cocoplus.toml` when present:

- `local_doc_paths`
- `default_mode`
- `max_depth`
- `max_breadth`
- `require_plan_approval`

## Exit Criteria

- [ ] The approved plan is recorded before retrieval.
- [ ] Every claim in the report traces to at least one source.
- [ ] Reviewer and Revisor are separated from the crawler process.

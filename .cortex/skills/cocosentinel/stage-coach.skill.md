---
name: "stage-coach"
description: "Consume CocoSentinel per-stage external coach requests and produce stage quality scores."
version: "1.0.0"
author: "CocoPlus"
tags:
  - cocoplus
  - cocosentinel
  - quality
---

Use this skill for queued per-stage coach reviews from `.cocoplus/sentinel/coach-requests.jsonl`.

## Objective

Evaluate completed CocoFlow stages with a separate coach model so generator and critic remain structurally separated.

## Workflow

1. Verify `.cocoplus/` exists.
2. Read `.cocoplus/sentinel/coach-requests.jsonl`.
3. For each queued request, collect:
   - stage role and task brief from `.cocoplus/flow.json`
   - declared `artifacts.reads` and `artifacts.writes`
   - produced artifact paths under `.cocoplus/flow/artifacts/<run-id>/`
   - downstream missing artifact status
4. Verify `coach_model` differs from the executor model. If not, write `.cocoplus/sentinel/known-gaps.jsonl` and skip the request.
5. Run an external coach evaluation using the configured coach model.
6. Write `.cocoplus/sentinel/stage-quality.jsonl`:

```json
{
  "ts": "...",
  "stage_id": "function-designer",
  "score": 7,
  "reasoning": "Specific evidence-backed rationale.",
  "attributed_to": "function-designer",
  "coach_model": "haiku"
}
```

7. Mark consumed requests as processed by writing `.cocoplus/sentinel/coach-requests.processed.jsonl`.

## Scoring

- `8-10`: usable output with clear artifact handoff
- `5-7`: core output exists but a declared contract, evidence item, or handoff is incomplete
- `<5`: missing required output, ungrounded result, or downstream blocker attributable to this stage

## Exit Criteria

- [ ] Each score cites produced or missing artifacts.
- [ ] The coach never evaluates its own generation.
- [ ] Missing artifacts are attributed to the stage that declared them.
- [ ] Console-readable `stage-quality.jsonl` is updated.

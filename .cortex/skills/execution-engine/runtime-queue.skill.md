---
name: "runtime-queue"
description: "V2-native request queue contract for work that hooks cannot complete inline. Defines the durable JSONL handoff used by skill-owned background operations."
version: "2.0.1"
author: "CocoPlus"
tags:
  - cocoplus
  - execution-engine
  - skill-native
---

Your objective is to process `.cocoplus/v2-runtime-requests.jsonl` as a durable handoff queue between fast hooks and feature-owned skills.

Hooks must stay fast, deterministic, and side-effect constrained. When a hook observes work that belongs to a feature skill, it appends a request envelope to the queue and returns. The owning skill later claims, executes, and settles that request.

## Request Envelope

Each queue line is one JSON object. Required fields:

- `skill`: owning skill contract, such as `cocometer/meter-reconcile`
- `requested_at`: ISO timestamp from the hook
- `source`: hook or skill that wrote the request
- `idempotency_key`: deterministic key for the semantic work item

Recommended fields:

- `operation`: skill-specific verb
- `session_id`, `run_id`, `stage_id`, or `subagent_id` when available
- `input`, `input_data`, or explicit path fields
- `out` or `output_path` when the skill writes an artifact
- `priority`: `inline-followup`, `background`, or `maintenance`

Never include raw secrets, full transcripts, or large payloads. Prefer paths and stable identifiers.

## Claim Protocol

Before executing a request, write a claim record to `.cocoplus/v2-runtime-claims.jsonl`:

```json
{
  "idempotency_key": "<key>",
  "skill": "<skill>",
  "claim_token": "<session-or-process-token>",
  "claimed_at": "<ISO timestamp>",
  "state": "claimed"
}
```

If a completed settlement already exists for the same `idempotency_key`, do not execute the request again. If a stale claim exists without settlement, a later worker may supersede it by writing a new claim with `state: "superseded"` for the old `claim_token`.

## Settlement States

Every claimed request must settle in `.cocoplus/v2-runtime-settlements.jsonl` with one of:

- `claimed`
- `completed`
- `failed`
- `superseded`

The compact state vocabulary is `claimed|completed|failed|superseded`.

Settlement fields:

- `idempotency_key`
- `skill`
- `claim_token`
- `state`
- `settled_at`
- `artifact` or `output_path` when produced
- `error` only for `failed`

## Execution Rules

- Execute the owning skill contract directly.
- Do not execute JavaScript helpers.
- Do not treat queue append as completion.
- Do not delete queue lines; append settlements instead.
- Do not silently skip failed requests. Record `failed` with a concise reason.
- Do not weaken active run policy while processing a queued request.

## Exit Criteria

- [ ] Every processed request has a stable `idempotency_key`.
- [ ] Every execution writes a claim before doing feature work.
- [ ] Every claim settles as `completed`, `failed`, or `superseded`.
- [ ] Replayed queue lines do not duplicate artifacts or metrics.
- [ ] No non-console runtime script is invoked.

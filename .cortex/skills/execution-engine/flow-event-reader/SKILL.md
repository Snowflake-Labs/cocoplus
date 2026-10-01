---
name: "flow-event-reader"
description: "Skill-native CocoFlow transcript completion-event reader. Replaces the former flow-event-reader runtime helper."
version: "2.0.1"
author: "CocoPlus"
tags:
  - cocoplus
  - execution-engine
  - skill-native
---

Your objective is to correct background CocoPod completion timestamps from authoritative transcript queue records.

## Inputs

Accept direct arguments or a queued request from `.cocoplus/v2-runtime-requests.jsonl`:

- `transcript_path`
- `flow_state` (default `.cocoplus/lifecycle/flow-state.json`)
- `idempotency_key`

## Timestamp Precedence

Use transcript-derived completion records as the strongest source:

1. `completed_at` from a terminal transcript record
2. `timestamp` from a terminal transcript record
3. `enqueued_at` only when no completion timestamp exists
4. existing hook/tool-result timing as fallback

Do not overwrite transcript-derived timestamps with hook timing. If a pod already has `completion_source: "enqueue_record"` and `completion_timestamp_reliable: true`, preserve it unless a newer transcript record for the same pod has an explicit terminal `completed_at`.

## Procedure

1. Read the existing flow-state JSON if present; otherwise start with `{ "pods": [] }`.
2. Read the transcript JSONL line by line.
3. Identify queue/subagent completion records using named fields only:
   - `subagent_id`, `pod_id`, `agent_id`, or `task_id`
   - `status`, `event`, or `type`
   - `completed_at`, `timestamp`, or `enqueued_at`
4. For each terminal completion event (`completed`, `failed`, `exited`, `cancelled`), update the matching pod record:
   - `completed_at`
   - `completion_source: "enqueue_record"`
   - `completion_timestamp_reliable: true`
5. If a pod has only hook/tool-result timing, preserve it but mark:
   - `completion_source: "tool_result_fallback"`
   - `completion_timestamp_reliable: false`
6. Write `flow_state` atomically.

## Queue Settlement

When invoked from `.cocoplus/v2-runtime-requests.jsonl`, follow `execution-engine/runtime-queue`:

1. Claim the request using `idempotency_key` or a derived key from `transcript_path` and `flow_state`.
2. Reconcile the flow-state file.
3. Append `completed` settlement with `artifact: flow_state`.
4. Append `failed` if the transcript cannot be read or `flow_state` cannot be written.

## Output

Report:

```text
CocoFlow completion events reconciled.
Pods corrected: <N>
Fallback records retained: <N>
Flow state: <path>
```

## Exit Criteria

- [ ] Transcript-derived completion records set `completion_source`.
- [ ] Fallback records are explicitly marked unreliable.
- [ ] The flow-state file remains valid JSON.
- [ ] Queued requests are settled and can be replayed without duplicating state changes.

## Anti-Rationalization

| Shortcut / Temptation | Why It Fails |
|-----------------------|--------------|
| Treat the skill as complete because the file exists | Skill contracts must describe observable behavior and verification, not just command names. |
| Skip artifact and safety checks for a small command | Small commands still mutate state or guide execution; preserve the same gates. |

---
name: "meter-reconcile"
description: "Skill-native CocoMeter transcript reconciliation and adapter canary. Replaces the former meter-reconcile and adapter-self-test runtime helpers."
version: "2.0.1"
author: "CocoPlus"
tags:
  - cocoplus
  - cocometer
  - skill-native
---

Your objective is to reconcile CocoMeter session totals against an authoritative JSONL transcript using only named transcript fields.

## Inputs

Accept either direct invocation arguments or a queued request from `.cocoplus/v2-runtime-requests.jsonl`:

- `transcript_path`
- `session_file`
- `out`
- `threshold` (default `0.05`)
- `session_id`
- `idempotency_key`
- optional `operation: "adapter-canary"` for migration self-tests

## Idempotency

Use `idempotency_key` when supplied. Otherwise derive it from `session_id`, `transcript_path`, `session_file`, and `out`. If `.cocoplus/v2-runtime-settlements.jsonl` already contains `state: "completed"` for the key and `out` exists, report the existing artifact path and stop.

Do not infer token totals from prose. Only named usage fields from the transcript adapter and numeric runtime meter fields may contribute to totals.

## Transcript Adapter Rules

Read JSONL one line at a time. For each valid JSON object, preserve only named fields needed for metering:

- `id`, `message_id`, `parent_id`
- `timestamp`
- `type`, `role`, `event`, `kind`
- `model`, `model_tier`, `actual_model`
- `usage`, `tokens`, `input_tokens`, `output_tokens`, `cache_read_input`, `cache_write_input`

Unknown fields are ignored. Malformed lines produce `kind: "other"` adapter records and never abort reconciliation.

Deduplicate assistant messages by `message_id` when present; otherwise use a stable fingerprint of role, timestamp, model, and usage fields.

## Reconciliation

1. Read `session_file` if present and capture runtime token totals.
2. Read the transcript through the adapter rules above.
3. Sum transcript-derived token totals from assistant/tool usage records.
4. Compute `gap_fraction = abs(runtime_tokens - transcript_tokens) / max(runtime_tokens, transcript_tokens, 1)`.
5. Mark `reconciliation_status` as:
   - `matched` when `gap_fraction <= threshold`
   - `gap` when above threshold
   - `transcript_only` when runtime file is absent but transcript has usage
   - `not_run` when neither source has usage
6. Preserve configured and actual model tier when available. Set `model_drift = true` when both exist and differ.

Write `out` atomically:

```json
{
  "session_id": "<session-id>",
  "reconciliation_status": "matched|gap|transcript_only|not_run",
  "runtime_tokens": 0,
  "transcript_derived_tokens": 0,
  "authoritative_tokens": 0,
  "gap_fraction": 0,
  "duplicate_count": 0,
  "model_tier_configured": null,
  "model_tier_actual": null,
  "model_drift": false,
  "adapter_records": 0,
  "computed_at": "<ISO timestamp>"
}
```

For `operation: "adapter-canary"`, write the same adapter summary plus a `canary_status` field to `.cocoplus/meter/adapter-self-test.json`.

## Queue Settlement

When invoked from `.cocoplus/v2-runtime-requests.jsonl`, follow `execution-engine/runtime-queue`:

1. Claim the request with a `claim_token`.
2. Write the reconciliation artifact atomically.
3. Append `completed` settlement with `artifact: out`.
4. On malformed transcript, missing files, or unexpected field shapes, append `failed` with the reason unless the contract explicitly permits `not_run`.

## Exit Criteria

- [ ] Transcript reads use the named-field adapter only.
- [ ] Duplicate assistant messages are deduplicated before totals are finalized.
- [ ] Material gaps write a reconciliation artifact.
- [ ] Model drift is visible when configured and actual models differ.
- [ ] Queued requests settle exactly once per `idempotency_key`.

## Anti-Rationalization

| Shortcut / Temptation | Why It Fails |
|-----------------------|--------------|
| Treat the skill as complete because the file exists | Skill contracts must describe observable behavior and verification, not just command names. |
| Skip artifact and safety checks for a small command | Small commands still mutate state or guide execution; preserve the same gates. |

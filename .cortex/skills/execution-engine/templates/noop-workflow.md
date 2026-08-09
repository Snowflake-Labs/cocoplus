# No-op Workflow Template

Use this pattern when the correct outcome may be "nothing changed".

```json
{
  "id": "noop-check",
  "type": "check",
  "handler": "noop-check",
  "model_tier": "smol",
  "command": "invoke execution-engine/noop-check --state .cocoplus/flow/noop-state.json",
  "checkpoints": [".cocoplus/flow/noop-log.jsonl"]
}
```

No-op is valid only when `execution-engine/noop-check` records the reason in `noop-log.jsonl`.

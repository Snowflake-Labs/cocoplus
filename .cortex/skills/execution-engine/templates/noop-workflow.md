# No-op Workflow Template

Use this pattern when the correct outcome may be "nothing changed".

```json
{
  "id": "noop-check",
  "type": "check",
  "handler": "noop-check",
  "model_tier": "smol",
  "command": "node scripts/noop-check.js --state .cocoplus/flow/noop-state.json",
  "checkpoints": [".cocoplus/flow/noop-log.jsonl"]
}
```

No-op is valid only when `noop-check.js` records the reason in `noop-log.jsonl`.

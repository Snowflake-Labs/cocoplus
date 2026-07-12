# Drain Loop Template

Use this pattern when a queue of small findings must be processed until empty with an explicit cap.

```json
{
  "id": "drain-findings",
  "type": "loop",
  "model_tier": "regular",
  "until": { "condition": "queue_empty", "limit": 5 },
  "checkpoints": [".cocoplus/lifecycle/drain-status.json"]
}
```

The loop must record item counts before and after each iteration.

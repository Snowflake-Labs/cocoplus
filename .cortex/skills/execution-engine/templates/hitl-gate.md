# HITL Gate Template

Use this pattern when a downstream step depends on an explicit human decision.

```json
{
  "id": "approval-gate",
  "type": "gate",
  "hitl": true,
  "checkpoint_type": "MANDATORY",
  "model_tier": "smol",
  "checkpoints": [".cocoplus/lifecycle/approval.md"]
}
```

Downstream stages must not spawn until the approval artifact exists.

# Litmus Test Template

Use this pattern when a stage needs a tiny, deterministic check before expensive work begins.

```json
{
  "id": "litmus-check",
  "type": "check",
  "label": "Litmus check",
  "model_tier": "smol",
  "checkpoints": [".cocoplus/lifecycle/litmus-result.json"],
  "on_failure": "stop"
}
```

The litmus stage must produce a binary pass/fail artifact and a one-line rationale.

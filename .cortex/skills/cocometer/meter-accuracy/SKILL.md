---
name: "meter-accuracy"
description: "CocoMeter accuracy learning — displays estimation history, current adjustment factor, sample size, and trend from the accuracy learning feedback loop. Usage: $meter accuracy"
version: "1.0.3"
author: "CocoPlus"
tags:
  - cocoplus
  - cocometer
---

Your objective is to display CocoMeter's estimation accuracy learning data.

Before proceeding, verify that `.cocoplus/` exists.
If not: output "CocoPlus not initialized in this directory. Run `$pod init` to begin." Then stop.

## Read Accuracy Data

Read `.cocoplus/meter/accuracy-history.jsonl` — each line is a session record:
```json
{ "session_id": "...", "estimated_tokens": N, "actual_tokens": N, "estimated_credits": N, "actual_credits": N, "ratio": N, "timestamp": "..." }
```

If the file does not exist or has fewer than 2 entries: output "Not enough sessions to compute calibration factor. Run at least 2 complete sessions with pre-flight estimates to begin accuracy learning." Then stop.

Read `.cocoplus/meter/adjustment-factor.json`:
```json
{ "factor": N, "sample_size": N, "computed_at": "..." }
```

## Compute Trend

From the last 5 session ratios in `accuracy-history.jsonl`:
- If max − min < 0.1: trend = "Stable"
- If last ratio > first ratio by >0.1: trend = "Increasing"
- If last ratio < first ratio by >0.1: trend = "Decreasing"

## Output

```
CocoMeter Accuracy Learning
Adjustment Factor: [factor]x  (from [sample_size] sessions)
Trend: [Stable/Increasing/Decreasing] ([±delta] over last 5 sessions)
Recent sessions: [last 5 ratios, comma-separated]
Advice: [one sentence — e.g. "Your pipelines consistently use ~[factor]x the baseline estimate."]
Pre-flight estimates are being automatically calibrated.
```

## Anti-Rationalization

| Shortcut / Temptation | Why It Fails |
|-----------------------|--------------|
| Show calibrated estimates without surfacing the factor | Developer cannot assess whether the calibration is trustworthy without seeing it |
| Use mean instead of median for adjustment factor | Mean is skewed by outlier sessions; median is more robust |

## Exit Criteria

- [ ] Adjustment factor and sample size are shown
- [ ] Trend is computed from last 5 sessions
- [ ] Recent session ratios are listed
- [ ] Output is shown only when at least 2 sessions of data exist

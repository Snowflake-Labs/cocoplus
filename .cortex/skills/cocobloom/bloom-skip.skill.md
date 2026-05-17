---
name: bloom-skip
description: Waive CocoBloom's working-backwards pre-commitment step by recording bloom_waived=true in lifecycle/meta.json before $spec runs
version: 1.0.0
user-invocable: true
command: $bloom --skip
author: "CocoPlus"
tags:
  - cocoplus
feature: CocoBloom (Feature 33)
---

# $bloom --skip

Waive the CocoBloom commitment dialogue for the current project. This command is intentionally separate from `$bloom` so command loaders can route the flag path directly.

## Preconditions

- `.cocoplus/` must be initialized.

## Behavior

1. Verify `.cocoplus/` exists. If absent, output: "CocoPlus not initialized. Run `$pod init` first." Then stop.
2. Read `.cocoplus/lifecycle/meta.json` if it exists. If missing, create a new metadata object.
3. Set `"bloom_waived": true`.
4. Preserve all existing metadata fields, including `current_phase`, `phases_completed`, `flow_type`, and `phase_history`.
5. Write the updated JSON atomically.
6. Output:

```text
Bloom waived. Run $spec — no advisory message will appear.
```

## Downstream Effect

When `$spec` sees `"bloom_waived": true`, it does not display the CocoBloom advisory and does not attempt to load `lifecycle/bloom.md`.

## Exit Criteria

- `.cocoplus/lifecycle/meta.json` exists.
- `bloom_waived` is exactly `true`.
- No bloom document is created.


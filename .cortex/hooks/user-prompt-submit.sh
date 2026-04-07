#!/bin/bash
# UserPromptSubmit hook — extended for Context Mode and persona routing

COCOPLUS_DIR=".cocoplus"
HOOK_LOG="${COCOPLUS_DIR}/hook-log.jsonl"
TS="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

if [ ! -d "$COCOPLUS_DIR" ]; then
  exit 0
fi

echo "{\"hook\":\"user-prompt-submit\",\"ts\":\"${TS}\"}" >> "$HOOK_LOG" 2>/dev/null || true

# Context Mode: prepend current phase context
if [ -f "${COCOPLUS_DIR}/modes/context-mode.on" ]; then
  PHASE="unknown"
  if [ -f "${COCOPLUS_DIR}/lifecycle/meta.json" ]; then
    PHASE=$(grep '"current_phase"' "${COCOPLUS_DIR}/lifecycle/meta.json" 2>/dev/null | sed 's/.*"current_phase"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/' || echo "unknown")
  fi

  MODES=""
  [ -f "${COCOPLUS_DIR}/modes/memory.on" ] && MODES="${MODES}memory, "
  [ -f "${COCOPLUS_DIR}/modes/inspector.on" ] && MODES="${MODES}inspector, "
  [ -f "${COCOPLUS_DIR}/modes/quality.on" ] && MODES="${MODES}quality, "
  [ -f "${COCOPLUS_DIR}/modes/safety.strict" ] && MODES="${MODES}safety:strict, "
  [ -f "${COCOPLUS_DIR}/modes/safety.normal" ] && MODES="${MODES}safety:normal, "
  MODES="${MODES%, }"

  echo "{\"hook\":\"user-prompt-submit\",\"action\":\"context_prepended\",\"phase\":\"${PHASE}\",\"ts\":\"${TS}\"}" >> "$HOOK_LOG" 2>/dev/null || true
fi

exit 0

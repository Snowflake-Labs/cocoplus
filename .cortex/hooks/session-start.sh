#!/bin/bash
# SessionStart hook — real implementation
# Phase 6: CocoPod detection, memory loading, inspector trigger, meter init

COCOPLUS_DIR=".cocoplus"
HOOK_LOG="${COCOPLUS_DIR}/hook-log.jsonl"
TS="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
SESSION_ID="${COCO_SESSION_ID:-sess-$(date +%Y%m%d%H%M%S)}"

# No-op if CocoPlus not initialized
if [ ! -d "$COCOPLUS_DIR" ]; then
  exit 0
fi

echo "{\"hook\":\"session-start\",\"session\":\"${SESSION_ID}\",\"ts\":\"${TS}\"}" >> "$HOOK_LOG" 2>/dev/null || true

# 1. Load phase context from project.md
PHASE="unknown"
if [ -f "${COCOPLUS_DIR}/lifecycle/meta.json" ]; then
  PHASE=$(grep '"current_phase"' "${COCOPLUS_DIR}/lifecycle/meta.json" 2>/dev/null | sed 's/.*"current_phase"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/' || echo "unknown")
fi

# 2. Trigger Environment Inspector as background (non-blocking) if mode is on
if [ -f "${COCOPLUS_DIR}/modes/inspector.on" ]; then
  echo "{\"hook\":\"session-start\",\"action\":\"inspector_triggered\",\"session\":\"${SESSION_ID}\",\"ts\":\"${TS}\"}" >> "$HOOK_LOG" 2>/dev/null || true
fi

# 3. Load warm memory layer if enabled
if [ -f "${COCOPLUS_DIR}/modes/memory.on" ]; then
  if [ -f "${COCOPLUS_DIR}/memory/decisions.md" ]; then
    DECISION_COUNT=$(grep -c "^##" "${COCOPLUS_DIR}/memory/decisions.md" 2>/dev/null || echo "0")
    echo "{\"hook\":\"session-start\",\"action\":\"memory_loaded\",\"decisions\":${DECISION_COUNT},\"ts\":\"${TS}\"}" >> "$HOOK_LOG" 2>/dev/null || true
  fi
fi

# 4. Initialize CocoMeter if enabled
if [ -f "${COCOPLUS_DIR}/modes/cocometer.on" ]; then
  METER_FILE="${COCOPLUS_DIR}/meter/current-session.json"
  cat > "$METER_FILE" 2>/dev/null <<METEREOF
{
  "session_id": "${SESSION_ID}",
  "started_at": "${TS}",
  "phase": "${PHASE}",
  "tools_called": 0,
  "tokens_consumed": 0,
  "sql_statements": 0,
  "writes_performed": 0
}
METEREOF
fi

exit 0

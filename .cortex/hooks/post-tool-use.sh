#!/bin/bash
# PostToolUse hook — real implementation
# Phase 6: Decision capture, token tracking

COCOPLUS_DIR=".cocoplus"
HOOK_LOG="${COCOPLUS_DIR}/hook-log.jsonl"
TOOL_NAME="${COCO_TOOL_NAME:-unknown}"
TS="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

if [ ! -d "$COCOPLUS_DIR" ]; then
  exit 0
fi

echo "{\"hook\":\"post-tool-use\",\"tool\":\"${TOOL_NAME}\",\"ts\":\"${TS}\"}" >> "$HOOK_LOG" 2>/dev/null || true

# 1. Memory Engine: capture decisions if mode is on
if [ -f "${COCOPLUS_DIR}/modes/memory.on" ]; then
  TOOL_RESULT="${COCO_TOOL_RESULT:-}"
  if echo "$TOOL_RESULT" | grep -qiE "decided|determined|approved|pattern|chosen|selected"; then
    DECISION_BUFFER="${COCOPLUS_DIR}/.decision-buffer"
    echo "- [${TS}] Tool: ${TOOL_NAME}" >> "$DECISION_BUFFER" 2>/dev/null || true
  fi
fi

# 2. CocoMeter: update token tracking if enabled
if [ -f "${COCOPLUS_DIR}/modes/cocometer.on" ]; then
  METER_FILE="${COCOPLUS_DIR}/meter/current-session.json"
  if [ -f "$METER_FILE" ]; then
    CURRENT=$(grep '"tools_called"' "$METER_FILE" 2>/dev/null | grep -o '[0-9]*' | head -1 || echo "0")
    NEW_COUNT=$((CURRENT + 1))
    sed -i.bak "s/\"tools_called\": [0-9]*/\"tools_called\": ${NEW_COUNT}/" "$METER_FILE" 2>/dev/null || true
    rm -f "${METER_FILE}.bak"

    if [ "$TOOL_NAME" = "SnowflakeSqlExecute" ]; then
      SQL_CURRENT=$(grep '"sql_statements"' "$METER_FILE" 2>/dev/null | grep -o '[0-9]*' | head -1 || echo "0")
      NEW_SQL=$((SQL_CURRENT + 1))
      sed -i.bak "s/\"sql_statements\": [0-9]*/\"sql_statements\": ${NEW_SQL}/" "$METER_FILE" 2>/dev/null || true
      rm -f "${METER_FILE}.bak"
    fi
  fi
fi

exit 0

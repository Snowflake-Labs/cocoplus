#!/bin/bash
# SessionEnd hook — finalize CocoMeter, flush memory

COCOPLUS_DIR=".cocoplus"
HOOK_LOG="${COCOPLUS_DIR}/hook-log.jsonl"
TS="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
SESSION_ID="${COCO_SESSION_ID:-unknown}"

if [ ! -d "$COCOPLUS_DIR" ]; then
  exit 0
fi

echo "{\"hook\":\"session-end\",\"session\":\"${SESSION_ID}\",\"ts\":\"${TS}\"}" >> "$HOOK_LOG" 2>/dev/null || true

# 1. Finalize CocoMeter session
if [ -f "${COCOPLUS_DIR}/modes/cocometer.on" ]; then
  METER_FILE="${COCOPLUS_DIR}/meter/current-session.json"
  HISTORY_FILE="${COCOPLUS_DIR}/meter/history.jsonl"
  if [ -f "$METER_FILE" ]; then
    # Add ended_at timestamp
    sed -i.bak "s/\"started_at\"/\"ended_at\": \"${TS}\", \"started_at\"/" "$METER_FILE" 2>/dev/null || true
    rm -f "${METER_FILE}.bak"
    # Append to history (one JSON per line)
    tr -d '\n' < "$METER_FILE" >> "$HISTORY_FILE" 2>/dev/null || true
    echo "" >> "$HISTORY_FILE" 2>/dev/null || true
    rm -f "$METER_FILE"
    echo "{\"hook\":\"session-end\",\"action\":\"meter_finalized\",\"session\":\"${SESSION_ID}\",\"ts\":\"${TS}\"}" >> "$HOOK_LOG" 2>/dev/null || true
  fi
fi

# 2. Flush memory decision buffer if memory mode is on
if [ -f "${COCOPLUS_DIR}/modes/memory.on" ]; then
  DECISION_BUFFER="${COCOPLUS_DIR}/.decision-buffer"
  DECISIONS_FILE="${COCOPLUS_DIR}/memory/decisions.md"
  if [ -f "$DECISION_BUFFER" ] && [ -s "$DECISION_BUFFER" ]; then
    echo "" >> "$DECISIONS_FILE" 2>/dev/null || true
    echo "## Session ${SESSION_ID} — ${TS}" >> "$DECISIONS_FILE" 2>/dev/null || true
    cat "$DECISION_BUFFER" >> "$DECISIONS_FILE" 2>/dev/null || true
    rm -f "$DECISION_BUFFER"
    echo "{\"hook\":\"session-end\",\"action\":\"memory_flushed\",\"session\":\"${SESSION_ID}\",\"ts\":\"${TS}\"}" >> "$HOOK_LOG" 2>/dev/null || true
  fi
fi

exit 0

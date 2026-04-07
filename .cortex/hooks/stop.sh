#!/bin/bash
# Stop hook — real implementation
# Triggers CocoCupper background analysis on session end

COCOPLUS_DIR=".cocoplus"
HOOK_LOG="${COCOPLUS_DIR}/hook-log.jsonl"
TS="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
SESSION_ID="${COCO_SESSION_ID:-unknown}"

if [ ! -d "$COCOPLUS_DIR" ]; then
  exit 0
fi

echo "{\"hook\":\"stop\",\"session\":\"${SESSION_ID}\",\"ts\":\"${TS}\",\"action\":\"cupper_triggered\"}" >> "$HOOK_LOG" 2>/dev/null || true

# Finalize meter if enabled
if [ -f "${COCOPLUS_DIR}/modes/cocometer.on" ]; then
  METER_FILE="${COCOPLUS_DIR}/meter/current-session.json"
  HISTORY_FILE="${COCOPLUS_DIR}/meter/history.jsonl"
  if [ -f "$METER_FILE" ]; then
    sed -i.bak "s/\"started_at\"/\"ended_at\": \"${TS}\", \"started_at\"/" "$METER_FILE" 2>/dev/null || true
    rm -f "${METER_FILE}.bak"
    cat "$METER_FILE" >> "$HISTORY_FILE" 2>/dev/null || true
    echo "" >> "$HISTORY_FILE" 2>/dev/null || true
  fi
fi

# CocoCupper is triggered as a background subagent — Coco handles the actual spawning
echo "{\"hook\":\"stop\",\"cupper\":\"scheduled\",\"session\":\"${SESSION_ID}\",\"ts\":\"${TS}\"}" >> "$HOOK_LOG" 2>/dev/null || true

exit 0

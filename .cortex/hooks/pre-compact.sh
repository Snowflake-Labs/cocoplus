#!/bin/bash
# PreCompact hook — real implementation
# Phase 6: Memory flush to warm layer

COCOPLUS_DIR=".cocoplus"
HOOK_LOG="${COCOPLUS_DIR}/hook-log.jsonl"
TS="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

if [ ! -d "$COCOPLUS_DIR" ]; then
  exit 0
fi

echo "{\"hook\":\"pre-compact\",\"ts\":\"${TS}\"}" >> "$HOOK_LOG" 2>/dev/null || true

# Flush decision buffer to warm memory if memory mode is on
if [ -f "${COCOPLUS_DIR}/modes/memory.on" ]; then
  DECISION_BUFFER="${COCOPLUS_DIR}/.decision-buffer"
  DECISIONS_FILE="${COCOPLUS_DIR}/memory/decisions.md"

  if [ -f "$DECISION_BUFFER" ] && [ -s "$DECISION_BUFFER" ]; then
    echo "" >> "$DECISIONS_FILE" 2>/dev/null || true
    echo "## Session ${TS}" >> "$DECISIONS_FILE" 2>/dev/null || true
    cat "$DECISION_BUFFER" >> "$DECISIONS_FILE" 2>/dev/null || true
    rm -f "$DECISION_BUFFER"
    echo "{\"hook\":\"pre-compact\",\"action\":\"decisions_flushed\",\"ts\":\"${TS}\"}" >> "$HOOK_LOG" 2>/dev/null || true
  fi
fi

exit 0

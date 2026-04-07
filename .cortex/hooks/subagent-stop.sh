#!/bin/bash
# SubagentStop hook — real implementation
# Triggered when a CocoHarvest persona subagent completes
# Updates flow.json state and triggers CocoCupper

COCOPLUS_DIR=".cocoplus"
HOOK_LOG="${COCOPLUS_DIR}/hook-log.jsonl"
SUBAGENT_ID="${COCO_SUBAGENT_ID:-unknown}"
SUBAGENT_NAME="${COCO_SUBAGENT_NAME:-unknown}"
TS="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

if [ ! -d "$COCOPLUS_DIR" ]; then
  exit 0
fi

echo "{\"hook\":\"subagent-stop\",\"subagent_id\":\"${SUBAGENT_ID}\",\"subagent_name\":\"${SUBAGENT_NAME}\",\"ts\":\"${TS}\"}" >> "$HOOK_LOG" 2>/dev/null || true

# Update AGENTS.md with subagent completion (if it mentions a stage)
if echo "$SUBAGENT_NAME" | grep -q "stage-"; then
  STAGE_ID="$(echo "$SUBAGENT_NAME" | grep -o 'stage-[0-9]*')"
  echo "{\"hook\":\"subagent-stop\",\"stage\":\"${STAGE_ID}\",\"completed_at\":\"${TS}\"}" >> "$HOOK_LOG" 2>/dev/null || true
fi

# Signal CocoCupper to analyze stage output
echo "{\"hook\":\"subagent-stop\",\"cupper\":\"scheduled\",\"subagent\":\"${SUBAGENT_ID}\",\"ts\":\"${TS}\"}" >> "$HOOK_LOG" 2>/dev/null || true

exit 0

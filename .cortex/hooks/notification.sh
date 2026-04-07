#!/bin/bash
# Notification hook — routes CocoPlus events to UI or log file

COCOPLUS_DIR=".cocoplus"
HOOK_LOG="${COCOPLUS_DIR}/hook-log.jsonl"
NOTIF_TYPE="${COCO_NOTIFICATION_TYPE:-unknown}"
NOTIF_PAYLOAD="${COCO_NOTIFICATION_PAYLOAD:-}"
TS="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

if [ ! -d "$COCOPLUS_DIR" ]; then
  exit 0
fi

echo "{\"hook\":\"notification\",\"type\":\"${NOTIF_TYPE}\",\"ts\":\"${TS}\"}" >> "$HOOK_LOG" 2>/dev/null || true

# Log to notifications log file
LOG_FILE="${COCOPLUS_DIR}/notifications.log"
echo "[${TS}] ${NOTIF_TYPE}: ${NOTIF_PAYLOAD}" >> "$LOG_FILE" 2>/dev/null || true

# Route high-priority events to UI notifications queue
case "$NOTIF_TYPE" in
  phase_transition|agent_completion|safety_gate_trigger|cupper_findings_ready|meter_budget_threshold|flow_stage_completion)
    echo "{\"notify\":\"${NOTIF_TYPE}\",\"payload\":\"${NOTIF_PAYLOAD}\",\"ts\":\"${TS}\"}" >> "${COCOPLUS_DIR}/ui-notifications.jsonl" 2>/dev/null || true
    ;;
esac

exit 0

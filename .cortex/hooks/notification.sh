#!/usr/bin/env bash
set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
. "${SCRIPT_DIR}/_common.sh"

main() {
  local cocoplus_dir=".cocoplus"
  local hook_log="${cocoplus_dir}/hook-log.jsonl"
  local notif_type="${COCO_NOTIFICATION_TYPE:-unknown}"
  local notif_payload="${COCO_NOTIFICATION_PAYLOAD:-}"
  local ts
  ts="$(iso_utc)"

  if [[ ! -d "$cocoplus_dir" ]]; then
    return 0
  fi

  append_json_line "$hook_log" "{\"hook\":\"notification\",\"type\":\"$(json_escape "$notif_type")\",\"ts\":\"${ts}\"}"
  printf '[%s] %s: %s\n' "$ts" "$notif_type" "$notif_payload" >> "${cocoplus_dir}/notifications.log" 2>/dev/null || true

  case "$notif_type" in
    phase_transition|agent_completion|safety_gate_trigger|cupper_findings_ready|meter_budget_threshold|flow_stage_completion)
      append_json_line "${cocoplus_dir}/ui-notifications.jsonl" "{\"notify\":\"$(json_escape "$notif_type")\",\"payload\":\"$(json_escape "$notif_payload")\",\"ts\":\"${ts}\"}"
      ;;
  esac
}

if ! main "$@"; then
  log_error "notification" "failed to route notification"
fi

exit 0

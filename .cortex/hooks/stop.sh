#!/usr/bin/env bash
set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
. "${SCRIPT_DIR}/_common.sh"

main() {
  local cocoplus_dir=".cocoplus"
  local hook_log="${cocoplus_dir}/hook-log.jsonl"
  local meter_file history_file ts session_id
  ts="$(iso_utc)"
  session_id="${COCO_SESSION_ID:-unknown}"

  if [[ ! -d "$cocoplus_dir" ]]; then
    return 0
  fi

  append_json_line "$hook_log" "{\"hook\":\"stop\",\"session\":\"$(json_escape "$session_id")\",\"ts\":\"${ts}\",\"action\":\"cupper_triggered\"}"

  if [[ -f "${cocoplus_dir}/modes/cocometer.on" ]]; then
    meter_file="${cocoplus_dir}/meter/current-session.json"
    history_file="${cocoplus_dir}/meter/history.jsonl"
    if [[ -f "$meter_file" ]]; then
      append_json_line "$history_file" "{\"session_id\":\"$(json_escape "$session_id")\",\"stopped_at\":\"${ts}\",\"source\":\"stop-hook\"}"
    fi
  fi

  append_json_line "$hook_log" "{\"hook\":\"stop\",\"cupper\":\"scheduled\",\"session\":\"$(json_escape "$session_id")\",\"ts\":\"${ts}\"}"
}

if ! main "$@"; then
  log_error "stop" "failed to process stop event"
fi

exit 0

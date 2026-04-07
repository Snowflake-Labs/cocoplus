#!/usr/bin/env bash
set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
. "${SCRIPT_DIR}/_common.sh"

main() {
  local cocoplus_dir=".cocoplus"
  local hook_log="${cocoplus_dir}/hook-log.jsonl"
  local ts session_id phase meter_file decision_count
  ts="$(iso_utc)"
  session_id="${COCO_SESSION_ID:-sess-$(date +%Y%m%d-%H%M%S)}"

  if [[ ! -d "$cocoplus_dir" ]]; then
    return 0
  fi

  append_json_line "$hook_log" "{\"hook\":\"session-start\",\"session\":\"$(json_escape "$session_id")\",\"ts\":\"${ts}\"}"

  phase="unknown"
  if [[ -f "${cocoplus_dir}/lifecycle/meta.json" ]]; then
    phase="$(read_json_string "${cocoplus_dir}/lifecycle/meta.json" "current_phase")"
    phase="${phase:-unknown}"
  fi

  if [[ -f "${cocoplus_dir}/modes/inspector.on" ]]; then
    append_json_line "$hook_log" "{\"hook\":\"session-start\",\"action\":\"inspector_triggered\",\"session\":\"$(json_escape "$session_id")\",\"ts\":\"${ts}\"}"
  fi

  if [[ -f "${cocoplus_dir}/modes/memory.on" && -f "${cocoplus_dir}/memory/decisions.md" ]]; then
    decision_count="$(grep -c "^##" "${cocoplus_dir}/memory/decisions.md" 2>/dev/null || printf '0')"
    append_json_line "$hook_log" "{\"hook\":\"session-start\",\"action\":\"memory_loaded\",\"decisions\":${decision_count},\"ts\":\"${ts}\"}"
  fi

  if [[ -f "${cocoplus_dir}/modes/cocometer.on" ]]; then
    meter_file="${cocoplus_dir}/meter/current-session.json"
    atomic_write "$meter_file" <<EOF
{
  "session_id": "$(json_escape "$session_id")",
  "started_at": "${ts}",
  "phase": "$(json_escape "$phase")",
  "tools_called": 0,
  "tokens_consumed": 0,
  "sql_statements": 0,
  "writes_performed": 0
}
EOF
  fi
}

if ! main "$@"; then
  log_error "session-start" "failed to initialize session state"
fi

exit 0

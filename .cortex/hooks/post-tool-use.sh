#!/usr/bin/env bash
set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
. "${SCRIPT_DIR}/_common.sh"

main() {
  local cocoplus_dir=".cocoplus"
  local hook_log="${cocoplus_dir}/hook-log.jsonl"
  local tool_name="${COCO_TOOL_NAME:-unknown}"
  local ts
  ts="$(iso_utc)"

  if [[ ! -d "$cocoplus_dir" ]]; then
    return 0
  fi

  append_json_line "$hook_log" "{\"hook\":\"post-tool-use\",\"tool\":\"$(json_escape "$tool_name")\",\"ts\":\"${ts}\"}"

  if [[ -f "${cocoplus_dir}/modes/memory.on" ]]; then
    local tool_result decision_buffer
    tool_result="${COCO_TOOL_RESULT:-}"
    decision_buffer="${cocoplus_dir}/.decision-buffer"
    if printf '%s' "$tool_result" | grep -qiE "decided|determined|approved|pattern|chosen|selected"; then
      printf -- '- [%s] Tool: %s\n' "$ts" "$tool_name" >> "$decision_buffer" 2>/dev/null || true
    fi
  fi

  if [[ -f "${cocoplus_dir}/modes/cocometer.on" ]]; then
    local meter_file session_id started_at phase tokens tools sql writes
    meter_file="${cocoplus_dir}/meter/current-session.json"
    if [[ -f "$meter_file" ]]; then
      session_id="$(read_json_string "$meter_file" "session_id")"
      started_at="$(read_json_string "$meter_file" "started_at")"
      phase="$(read_json_string "$meter_file" "phase")"
      tokens="$(read_json_number "$meter_file" "tokens_consumed")"
      tools="$(read_json_number "$meter_file" "tools_called")"
      sql="$(read_json_number "$meter_file" "sql_statements")"
      writes="$(read_json_number "$meter_file" "writes_performed")"

      tokens="${tokens:-0}"
      tools="$(( ${tools:-0} + 1 ))"
      sql="${sql:-0}"
      writes="${writes:-0}"

      if [[ "$tool_name" == "SnowflakeSqlExecute" ]]; then
        sql="$((sql + 1))"
      fi
      if [[ "$tool_name" == "Write" || "$tool_name" == "Edit" ]]; then
        writes="$((writes + 1))"
      fi

      atomic_write "$meter_file" <<EOF
{
  "session_id": "$(json_escape "$session_id")",
  "started_at": "$(json_escape "$started_at")",
  "phase": "$(json_escape "$phase")",
  "tools_called": ${tools},
  "tokens_consumed": ${tokens},
  "sql_statements": ${sql},
  "writes_performed": ${writes}
}
EOF
    fi
  fi
}

if ! main "$@"; then
  log_error "post-tool-use" "failed to record post-tool metrics"
fi

exit 0

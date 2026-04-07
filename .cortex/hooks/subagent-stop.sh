#!/usr/bin/env bash
set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
. "${SCRIPT_DIR}/_common.sh"

main() {
  local cocoplus_dir=".cocoplus"
  local hook_log="${cocoplus_dir}/hook-log.jsonl"
  local subagent_id subagent_name ts stage_id
  subagent_id="${COCO_SUBAGENT_ID:-unknown}"
  subagent_name="${COCO_SUBAGENT_NAME:-unknown}"
  ts="$(iso_utc)"

  if [[ ! -d "$cocoplus_dir" ]]; then
    return 0
  fi

  append_json_line "$hook_log" "{\"hook\":\"subagent-stop\",\"subagent_id\":\"$(json_escape "$subagent_id")\",\"subagent_name\":\"$(json_escape "$subagent_name")\",\"ts\":\"${ts}\"}"

  if printf '%s' "$subagent_name" | grep -q "stage-"; then
    stage_id="$(printf '%s' "$subagent_name" | grep -o 'stage-[0-9]*' | head -1)"
    append_json_line "$hook_log" "{\"hook\":\"subagent-stop\",\"stage\":\"$(json_escape "$stage_id")\",\"completed_at\":\"${ts}\"}"
  fi

  append_json_line "$hook_log" "{\"hook\":\"subagent-stop\",\"cupper\":\"scheduled\",\"subagent\":\"$(json_escape "$subagent_id")\",\"ts\":\"${ts}\"}"
}

if ! main "$@"; then
  log_error "subagent-stop" "failed to process subagent completion"
fi

exit 0

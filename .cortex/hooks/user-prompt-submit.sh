#!/usr/bin/env bash
set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
. "${SCRIPT_DIR}/_common.sh"

main() {
  local cocoplus_dir=".cocoplus"
  local hook_log="${cocoplus_dir}/hook-log.jsonl"
  local ts phase
  ts="$(iso_utc)"

  if [[ ! -d "$cocoplus_dir" ]]; then
    return 0
  fi

  append_json_line "$hook_log" "{\"hook\":\"user-prompt-submit\",\"ts\":\"${ts}\"}"

  if [[ -f "${cocoplus_dir}/modes/context-mode.on" ]]; then
    phase="unknown"
    if [[ -f "${cocoplus_dir}/lifecycle/meta.json" ]]; then
      phase="$(read_json_string "${cocoplus_dir}/lifecycle/meta.json" "current_phase")"
      phase="${phase:-unknown}"
    fi
    append_json_line "$hook_log" "{\"hook\":\"user-prompt-submit\",\"action\":\"context_prepended\",\"phase\":\"$(json_escape "$phase")\",\"ts\":\"${ts}\"}"
  fi
}

if ! main "$@"; then
  log_error "user-prompt-submit" "failed while processing prompt submission"
fi

exit 0

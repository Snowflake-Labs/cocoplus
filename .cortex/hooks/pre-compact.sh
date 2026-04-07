#!/usr/bin/env bash
set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
. "${SCRIPT_DIR}/_common.sh"

main() {
  local cocoplus_dir=".cocoplus"
  local hook_log="${cocoplus_dir}/hook-log.jsonl"
  local decision_buffer decisions_file ts
  ts="$(iso_utc)"

  if [[ ! -d "$cocoplus_dir" ]]; then
    return 0
  fi

  append_json_line "$hook_log" "{\"hook\":\"pre-compact\",\"ts\":\"${ts}\"}"

  if [[ -f "${cocoplus_dir}/modes/memory.on" ]]; then
    decision_buffer="${cocoplus_dir}/.decision-buffer"
    decisions_file="${cocoplus_dir}/memory/decisions.md"

    if [[ -f "$decision_buffer" && -s "$decision_buffer" ]]; then
      {
        printf '\n## Session %s\n' "$ts"
        cat "$decision_buffer"
      } >> "$decisions_file" 2>/dev/null || true
      rm -f "$decision_buffer"
      append_json_line "$hook_log" "{\"hook\":\"pre-compact\",\"action\":\"decisions_flushed\",\"ts\":\"${ts}\"}"
    fi
  fi
}

if ! main "$@"; then
  log_error "pre-compact" "failed to flush pre-compact memory state"
fi

exit 0

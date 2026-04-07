#!/usr/bin/env bash
set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
. "${SCRIPT_DIR}/_common.sh"

main() {
  local cocoplus_dir=".cocoplus"
  local hook_log="${cocoplus_dir}/hook-log.jsonl"
  local safety_log="${cocoplus_dir}/safety-decisions.log"
  local tool_name="${COCO_TOOL_NAME:-unknown}"
  local ts
  ts="$(iso_utc)"

  if [[ ! -d "$cocoplus_dir" ]]; then
    printf '{"action":"allow"}\n'
    return 0
  fi

  append_json_line "$hook_log" "{\"hook\":\"pre-tool-use\",\"tool\":\"$(json_escape "$tool_name")\",\"ts\":\"${ts}\"}"

  if [[ "$tool_name" != "SnowflakeSqlExecute" ]]; then
    printf '{"action":"allow"}\n'
    return 0
  fi

  local input payload sql_input sql_upper pattern="" safety_mode="normal"
  input="${COCO_TOOL_INPUT:-}"
  if [[ -z "$input" && ! -t 0 ]]; then
    input="$(cat 2>/dev/null || true)"
  fi
  payload="$(printf '%s' "$input" | tr '\n' ' ')"
  sql_input="$(printf '%s' "$payload" | sed -n 's/.*"sql"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' | head -1)"
  sql_upper="$(printf '%s' "$sql_input" | tr '[:lower:]' '[:upper:]')"

  if printf '%s' "$sql_upper" | grep -qE "DROP[[:space:]]+(TABLE|DATABASE|SCHEMA|INDEX|PROCEDURE|FUNCTION)"; then
    pattern="DROP statement"
  elif printf '%s' "$sql_upper" | grep -qE "TRUNCATE[[:space:]]+TABLE"; then
    pattern="TRUNCATE TABLE"
  elif printf '%s' "$sql_upper" | grep -qE "DELETE[[:space:]]+FROM[[:space:]]+[^[:space:];]+([[:space:]]*;)?$"; then
    pattern="DELETE without WHERE"
  elif printf '%s' "$sql_upper" | grep -qE "ALTER[[:space:]]+TABLE.*DROP[[:space:]]+COLUMN"; then
    pattern="ALTER TABLE DROP COLUMN"
  fi

  if [[ -z "$pattern" ]]; then
    printf '{"action":"allow"}\n'
    return 0
  fi

  if [[ -f "${cocoplus_dir}/modes/safety.strict" ]]; then
    safety_mode="strict"
  elif [[ -f "${cocoplus_dir}/modes/safety.off" ]]; then
    safety_mode="off"
  fi

  append_json_line "$safety_log" "{\"ts\":\"${ts}\",\"tool\":\"$(json_escape "$tool_name")\",\"pattern\":\"$(json_escape "$pattern")\",\"mode\":\"${safety_mode}\"}"

  case "$safety_mode" in
    strict)
      printf '{"action":"block","reason":"SnowflakeSqlExecute: %s detected in safety.strict mode. This operation is blocked."}\n' "$(json_escape "$pattern")"
      ;;
    normal)
      printf '{"action":"allow","warning":"SnowflakeSqlExecute: %s detected in safety.normal mode. This operation is allowed but flagged."}\n' "$(json_escape "$pattern")"
      ;;
    *)
      printf '{"action":"allow"}\n'
      ;;
  esac
}

if ! main "$@"; then
  log_error "pre-tool-use" "failed to evaluate tool payload"
  printf '{"action":"allow"}\n'
fi

exit 0

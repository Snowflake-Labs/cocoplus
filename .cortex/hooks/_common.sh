#!/usr/bin/env bash

json_escape() {
  printf '%s' "${1:-}" | sed \
    -e 's/\\/\\\\/g' \
    -e 's/"/\\"/g' \
    -e ':a' -e 'N' -e '$!ba' \
    -e 's/\r/\\r/g' \
    -e 's/\n/\\n/g' \
    -e 's/\t/\\t/g'
}

iso_utc() {
  date -u +%Y-%m-%dT%H:%M:%SZ
}

append_json_line() {
  local file="$1"
  local line="$2"
  mkdir -p "$(dirname "$file")" 2>/dev/null || true
  printf '%s\n' "$line" >> "$file" 2>/dev/null || true
}

log_error() {
  local hook_name="$1"
  local message="$2"
  append_json_line ".cocoplus/hook-errors.log" "{\"ts\":\"$(iso_utc)\",\"hook\":\"$(json_escape "$hook_name")\",\"error\":\"$(json_escape "$message")\"}"
}

read_json_string() {
  local file="$1"
  local key="$2"
  grep "\"${key}\"" "$file" 2>/dev/null | head -1 | sed -E "s/.*\"${key}\"[[:space:]]*:[[:space:]]*\"([^\"]*)\".*/\\1/"
}

read_json_number() {
  local file="$1"
  local key="$2"
  grep "\"${key}\"" "$file" 2>/dev/null | head -1 | sed -E "s/.*\"${key}\"[[:space:]]*:[[:space:]]*([0-9]+).*/\\1/"
}

atomic_write() {
  local target="$1"
  local tmp="${target}.tmp.$$"
  cat > "$tmp"
  mv "$tmp" "$target"
}

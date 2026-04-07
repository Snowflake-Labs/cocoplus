#!/bin/bash
# PreToolUse hook — Safety Gate implementation
# Receives: COCO_TOOL_NAME env var, tool input via stdin JSON
# Purpose: Intercept SnowflakeSqlExecute for destructive SQL patterns

COCOPLUS_DIR=".cocoplus"
HOOK_LOG="${COCOPLUS_DIR}/hook-log.jsonl"
SAFETY_LOG="${COCOPLUS_DIR}/safety-decisions.log"
TOOL_NAME="${COCO_TOOL_NAME:-unknown}"
TS="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

# No-op if CocoPlus not initialized
if [ ! -d "$COCOPLUS_DIR" ]; then
  exit 0
fi

# Log hook invocation
echo "{\"hook\":\"pre-tool-use\",\"tool\":\"${TOOL_NAME}\",\"ts\":\"${TS}\"}" >> "$HOOK_LOG" 2>/dev/null || true

# Only intercept SnowflakeSqlExecute
if [ "$TOOL_NAME" != "SnowflakeSqlExecute" ]; then
  exit 0
fi

# Read SQL input from stdin or COCO_TOOL_INPUT
SQL_INPUT="${COCO_TOOL_INPUT:-}"
if [ -z "$SQL_INPUT" ] && [ ! -t 0 ]; then
  SQL_INPUT="$(cat 2>/dev/null || true)"
fi
SQL_UPPER="$(echo "$SQL_INPUT" | tr '[:lower:]' '[:upper:]')"

# Detect destructive patterns
IS_DESTRUCTIVE=0
PATTERN_MATCHED=""

if echo "$SQL_UPPER" | grep -qE "DROP[[:space:]]+(TABLE|DATABASE|SCHEMA|INDEX)"; then
  IS_DESTRUCTIVE=1; PATTERN_MATCHED="DROP TABLE/DATABASE/SCHEMA/INDEX"
elif echo "$SQL_UPPER" | grep -qE "TRUNCATE[[:space:]]+TABLE"; then
  IS_DESTRUCTIVE=1; PATTERN_MATCHED="TRUNCATE TABLE"
elif echo "$SQL_UPPER" | grep -qE "DELETE[[:space:]]+FROM[[:space:]]+[^[:space:]]+[[:space:]]*$"; then
  IS_DESTRUCTIVE=1; PATTERN_MATCHED="DELETE without WHERE"
elif echo "$SQL_UPPER" | grep -qE "ALTER[[:space:]]+TABLE.*DROP[[:space:]]+COLUMN"; then
  IS_DESTRUCTIVE=1; PATTERN_MATCHED="ALTER TABLE DROP COLUMN"
fi

if [ "$IS_DESTRUCTIVE" -eq 0 ]; then
  exit 0
fi

# Determine safety mode
SAFETY_MODE="normal"
if [ -f "${COCOPLUS_DIR}/modes/safety.strict" ]; then
  SAFETY_MODE="strict"
elif [ -f "${COCOPLUS_DIR}/modes/safety.off" ]; then
  SAFETY_MODE="off"
fi

# Log the decision
echo "{\"ts\":\"${TS}\",\"tool\":\"${TOOL_NAME}\",\"pattern\":\"${PATTERN_MATCHED}\",\"mode\":\"${SAFETY_MODE}\"}" >> "$SAFETY_LOG" 2>/dev/null || true

# Apply safety mode
if [ "$SAFETY_MODE" = "strict" ]; then
  echo "BLOCKED: Safety Gate (strict mode) prevented execution. Pattern detected: ${PATTERN_MATCHED}. To proceed, switch to /safety normal and confirm, or /safety off (not recommended)." >&2
  exit 1
elif [ "$SAFETY_MODE" = "normal" ]; then
  echo "WARNING: Safety Gate detected destructive SQL pattern: ${PATTERN_MATCHED}. This operation has been flagged for soft-gate confirmation. Explicit confirmation required before execution." >&2
  exit 0
else
  # Safety off: allow silently
  exit 0
fi

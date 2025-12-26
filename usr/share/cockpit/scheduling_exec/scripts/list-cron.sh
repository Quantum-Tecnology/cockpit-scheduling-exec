#!/bin/bash
# Lista agendamentos cron relacionados ao scheduling_exec.
# - Sem args: lista todos os agendamentos do plugin
# - Com SCRIPT_NAME: lista agendamentos apenas daquele script
# Saída: JSON array

set -euo pipefail

SCRIPTS_DIR="$HOME/scripts"
EXECUTE_SCRIPT="/usr/share/cockpit/scheduling_exec/scripts/execute-script.sh"
MARKER_PREFIX="scheduling_exec:"
SCRIPT_NAME_FILTER="${1:-}"

validate_script_name() {
  local name="$1"
  [ -n "$name" ] || return 1

  case "$name" in
    *..*|*/*)
      return 1
      ;;
  esac

  return 0
}

if [ -n "$SCRIPT_NAME_FILTER" ]; then
  if ! validate_script_name "$SCRIPT_NAME_FILTER"; then
    echo "Erro: Nome do script inválido" >&2
    exit 1
  fi
fi

json_escape() {
  local s="$1"
  s=${s//\\/\\\\}
  s=${s//\"/\\\"}
  s=${s//$'\n'/\\n}
  s=${s//$'\r'/\\r}
  s=${s//$'\t'/\\t}
  printf '%s' "$s"
}

extract_expr() {
  echo "$1" | awk '{for(i=1;i<=5;i++) printf $i" "; print ""}' | xargs
}

extract_command() {
  echo "$1" | awk '{ $1=$2=$3=$4=$5=""; sub(/^ +/, ""); print }'
}

extract_script_from_line() {
  local line="$1"
  local cmd
  cmd=$(extract_command "$line")

  # 1) marker: # scheduling_exec:<script>
  local marker
  marker=$(echo "$line" | grep -Eo "#[[:space:]]*${MARKER_PREFIX}[^[:space:]]+" | head -n1 | sed -E "s/.*${MARKER_PREFIX}//") || true
  if validate_script_name "$marker"; then
    echo "$marker"
    return 0
  fi

  # 2) padrão: execute-script.sh <script>
  if echo "$cmd" | grep -F "$EXECUTE_SCRIPT" >/dev/null 2>&1; then
    local name
    name=$(echo "$cmd" | awk -v exec="$EXECUTE_SCRIPT" '{for(i=1;i<=NF;i++){if($i==exec){print $(i+1); exit}}}')
    if validate_script_name "$name"; then
      echo "$name"
      return 0
    fi
  fi

  # 3) compatibilidade: linha antiga contendo ~/scripts/<script>
  local legacy
  legacy=$(echo "$cmd" | grep -Eo "${SCRIPTS_DIR}/[A-Za-z0-9._-]+\.sh" | head -n1 || true)
  if [ -n "$legacy" ]; then
    legacy=$(basename "$legacy")
    if validate_script_name "$legacy"; then
      echo "$legacy"
      return 0
    fi
  fi

  return 1
}

lines=$(crontab -l 2>/dev/null || true)

echo "["
first=true

while IFS= read -r line; do
  trimmed=$(echo "$line" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
  [ -z "$trimmed" ] && continue
  echo "$trimmed" | grep -q '^#' && continue

  script_name=$(extract_script_from_line "$trimmed" || true)
  [ -n "$script_name" ] || continue

  if [ -n "$SCRIPT_NAME_FILTER" ] && [ "$script_name" != "$SCRIPT_NAME_FILTER" ]; then
    continue
  fi

  expr=$(extract_expr "$trimmed")
  cmd=$(extract_command "$trimmed")

  if [ "$first" = false ]; then
    echo ","
  fi
  first=false

  printf '{"script":"%s","expression":"%s","command":"%s","raw":"%s"}' \
    "$(json_escape "$script_name")" \
    "$(json_escape "$expr")" \
    "$(json_escape "$cmd")" \
    "$(json_escape "$trimmed")"
done <<< "$lines"

echo "]"

#!/bin/bash
# Retorna o log de um script (mais recente primeiro)

set -euo pipefail

SCRIPTS_DIR="$HOME/scripts"
METADATA_DIR="$HOME/.scripts-metadata"

SCRIPT_NAME="${1:-}"
LIMIT="${2:-400}"

if [ -z "$SCRIPT_NAME" ]; then
  echo "Erro: Nome do script não fornecido" >&2
  exit 1
fi

# Mantém compatível com as mesmas regras de nome usadas no frontend
case "$SCRIPT_NAME" in
  *..*|*/*)
    echo "Erro: Nome do script inválido" >&2
    exit 1
    ;;
esac

mkdir -p "$SCRIPTS_DIR" "$METADATA_DIR"

LOG_FILE="$METADATA_DIR/$SCRIPT_NAME.log"

if [ ! -f "$LOG_FILE" ]; then
  # Sem log ainda
  exit 0
fi

reverse_lines() {
  if command -v tac >/dev/null 2>&1; then
    tac
    return
  fi

  awk '{ lines[NR]=$0 } END { for (i=NR; i>=1; i--) print lines[i] }'
}

# Limita o tamanho e entrega em ordem desc (mais recente primeiro)
# (o arquivo está em ordem asc por padrão, então invertemos)
if [ "$LIMIT" = "0" ]; then
  cat "$LOG_FILE" | reverse_lines
else
  tail -n "$LIMIT" "$LOG_FILE" | reverse_lines
fi

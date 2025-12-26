#!/bin/bash
# Retorna o conteúdo do arquivo de variáveis do script (~/scripts/.env.<script>)

set -euo pipefail

SCRIPTS_DIR="$HOME/scripts"
SCRIPT_NAME="${1:-}"

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

mkdir -p "$SCRIPTS_DIR"

ENV_FILE="$SCRIPTS_DIR/.env.$SCRIPT_NAME"

if [ -f "$ENV_FILE" ]; then
  cat "$ENV_FILE"
fi

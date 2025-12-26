#!/bin/bash
# Salva o arquivo de variáveis do script (~/scripts/.env.<script>)

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

# Protege o conteúdo (pode conter segredos)
umask 077

tmp_file=""
if command -v mktemp >/dev/null 2>&1; then
  tmp_file="$(mktemp)"
else
  tmp_file="/tmp/scheduling_exec_env_${SCRIPT_NAME}.$$"
fi

cat > "$tmp_file"

mv "$tmp_file" "$ENV_FILE"
chmod 600 "$ENV_FILE" 2>/dev/null || true

echo "OK"

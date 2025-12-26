#!/bin/bash
# Salva o arquivo de variáveis de ambiente (~/scripts/.env)

set -euo pipefail

SCRIPTS_DIR="$HOME/scripts"
ENV_FILE="$SCRIPTS_DIR/.env"

mkdir -p "$SCRIPTS_DIR"

# Protege o conteúdo (pode conter segredos)
umask 077

tmp_file=""
if command -v mktemp >/dev/null 2>&1; then
  tmp_file="$(mktemp)"
else
  tmp_file="/tmp/scheduling_exec_env.$$"
fi

cat > "$tmp_file"

mv "$tmp_file" "$ENV_FILE"
chmod 600 "$ENV_FILE" 2>/dev/null || true

echo "OK"

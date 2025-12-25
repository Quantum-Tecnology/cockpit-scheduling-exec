#!/bin/bash
# Importa um script existente para o diretório gerenciado pelo plugin ($HOME/scripts)

set -euo pipefail

SOURCE_PATH="${1:-}"

if [ -z "$SOURCE_PATH" ]; then
  echo "Erro: caminho do script é obrigatório" >&2
  exit 1
fi

if [ ! -f "$SOURCE_PATH" ]; then
  echo "Erro: arquivo não encontrado: $SOURCE_PATH" >&2
  exit 1
fi

if [[ "$SOURCE_PATH" != "$HOME"/* ]]; then
  echo "Erro: por segurança, só é permitido importar arquivos dentro de $HOME" >&2
  exit 1
fi

BASE=$(basename "$SOURCE_PATH")

if ! [[ "$BASE" =~ ^[a-zA-Z0-9._-]+\.sh$ ]]; then
  echo "Erro: nome de script inválido (use somente letras/números/._- e termine com .sh)" >&2
  exit 1
fi

SCRIPTS_DIR="$HOME/scripts"
METADATA_DIR="$HOME/.scripts-metadata"

mkdir -p "$SCRIPTS_DIR" "$METADATA_DIR"

DEST="$SCRIPTS_DIR/$BASE"

if [ -f "$DEST" ]; then
  echo "Erro: já existe um script com este nome em $SCRIPTS_DIR" >&2
  exit 1
fi

cp -- "$SOURCE_PATH" "$DEST"
chmod +x "$DEST"

METADATA_FILE="$METADATA_DIR/$BASE.json"
if [ ! -f "$METADATA_FILE" ]; then
  ts=$(date +%s)
  cat > "$METADATA_FILE" << EOF
{
  "created_at": $ts,
  "updated_at": $ts,
  "last_execution": null,
  "total_executions": 0,
  "successful_executions": 0
}
EOF
fi

echo "Importado com sucesso"

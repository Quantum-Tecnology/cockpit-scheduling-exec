#!/bin/bash
# Script para excluir um script e sua metadata

SCRIPTS_DIR="$HOME/scripts"
METADATA_DIR="$HOME/.scripts-metadata"
SCRIPT_NAME="$1"

if [ -z "$SCRIPT_NAME" ]; then
    echo "Erro: Nome do script não fornecido" >&2
    exit 1
fi

SCRIPT_PATH="$SCRIPTS_DIR/$SCRIPT_NAME"
METADATA_FILE="$METADATA_DIR/$SCRIPT_NAME.json"

if [ ! -f "$SCRIPT_PATH" ]; then
    echo "Erro: Script não encontrado" >&2
    exit 1
fi

# Remover do crontab se existir
/usr/share/cockpit/scheduling-exec/scripts/remove-cron.sh "$SCRIPT_NAME" 2>/dev/null

# Excluir arquivo de script
rm -f "$SCRIPT_PATH"

# Excluir metadata
rm -f "$METADATA_FILE"

echo "Script excluído com sucesso"

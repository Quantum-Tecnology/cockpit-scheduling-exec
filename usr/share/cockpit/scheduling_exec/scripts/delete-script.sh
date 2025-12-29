#!/bin/bash
# Script para excluir um script e sua metadata
# Aceita tanto caminho completo quanto apenas o nome do script

METADATA_DIR="$HOME/.scripts-metadata"
SCRIPT_INPUT="$1"

if [ -z "$SCRIPT_INPUT" ]; then
    echo "Erro: Nome ou caminho do script não fornecido" >&2
    exit 1
fi

# Determinar se é caminho completo ou apenas nome
if [[ "$SCRIPT_INPUT" == /* ]]; then
    # Caminho absoluto
    SCRIPT_PATH="$SCRIPT_INPUT"
    SCRIPT_NAME=$(basename "$SCRIPT_PATH")
elif [[ "$SCRIPT_INPUT" == ~/* || "$SCRIPT_INPUT" == \~/* ]]; then
    # Caminho relativo ao home
    SCRIPT_PATH="${SCRIPT_INPUT/#\~/$HOME}"
    SCRIPT_NAME=$(basename "$SCRIPT_PATH")
else
    # Apenas nome do script - busca em $HOME/scripts por compatibilidade
    SCRIPT_NAME="$SCRIPT_INPUT"
    SCRIPT_PATH="$HOME/scripts/$SCRIPT_NAME"
fi

METADATA_FILE="$METADATA_DIR/$SCRIPT_NAME.json"

if [ ! -f "$SCRIPT_PATH" ]; then
    echo "Erro: Script não encontrado: $SCRIPT_PATH" >&2
    exit 1
fi

# Remover do crontab se existir
/usr/share/cockpit/scheduling_exec/scripts/remove-cron.sh "$SCRIPT_PATH" 2>/dev/null

# Excluir arquivo de script
rm -f "$SCRIPT_PATH"

# Excluir metadata
rm -f "$METADATA_FILE"

echo "Script excluído com sucesso"

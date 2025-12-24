#!/bin/bash
# Script para remover agendamento cron de um script

SCRIPTS_DIR="$HOME/scripts"
SCRIPT_NAME="$1"

if [ -z "$SCRIPT_NAME" ]; then
    echo "Erro: Nome do script não fornecido" >&2
    exit 1
fi

# Remover todas as linhas relacionadas ao script do crontab
crontab -l 2>/dev/null | grep -v "$SCRIPTS_DIR/$SCRIPT_NAME" | crontab - 2>/dev/null

echo "Agendamento removido com sucesso"

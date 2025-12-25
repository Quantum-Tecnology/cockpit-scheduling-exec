#!/bin/bash
# Script para obter a expressão cron de um script

SCRIPTS_DIR="$HOME/scripts"
SCRIPT_NAME="$1"

if [ -z "$SCRIPT_NAME" ]; then
    echo "Erro: Nome do script não fornecido" >&2
    exit 1
fi

# Buscar no crontab
cron_line=$(crontab -l 2>/dev/null | grep "$SCRIPTS_DIR/$SCRIPT_NAME" | grep -v "^#" | head -n1)

if [ -z "$cron_line" ]; then
    echo ""
    exit 0
fi

# Extrair apenas a expressão cron (primeiros 5 campos)
echo "$cron_line" | awk '{for(i=1;i<=5;i++) printf $i" "; print ""}' | xargs

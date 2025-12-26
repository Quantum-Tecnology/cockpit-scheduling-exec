#!/bin/bash
# Script para obter a expressão cron de um script

SCRIPTS_DIR="$HOME/scripts"
SCRIPT_NAME="$1"
EXECUTE_SCRIPT="/usr/share/cockpit/scheduling_exec/scripts/execute-script.sh"

if [ -z "$SCRIPT_NAME" ]; then
    echo "Erro: Nome do script não fornecido" >&2
    exit 1
fi

# Buscar no crontab (compatível com múltiplas entradas)
cron_line=$(crontab -l 2>/dev/null | grep -v "^#" | awk -v exec="$EXECUTE_SCRIPT" -v script="$SCRIPT_NAME" -v scripts_dir="$SCRIPTS_DIR" '
{
    line=$0
    if (index(line, "scheduling_exec:" script) > 0) { print line; exit }

    n=split(line,a,/[ \t]+/)
    for (i=6; i<=n; i++) {
        if (a[i]==exec && (i+1)<=n && a[i+1]==script) { print line; exit }
    }

    if (index(line, scripts_dir "/" script) > 0) { print line; exit }
}
')

if [ -z "$cron_line" ]; then
    echo ""
    exit 0
fi

# Extrair apenas a expressão cron (primeiros 5 campos)
echo "$cron_line" | awk '{for(i=1;i<=5;i++) printf $i" "; print ""}' | xargs

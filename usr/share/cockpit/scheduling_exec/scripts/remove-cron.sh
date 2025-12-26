#!/bin/bash
# Script para remover agendamento cron de um script

SCRIPTS_DIR="$HOME/scripts"
SCRIPT_NAME="$1"
EXECUTE_SCRIPT="/usr/share/cockpit/scheduling_exec/scripts/execute-script.sh"

if [ -z "$SCRIPT_NAME" ]; then
    echo "Erro: Nome do script não fornecido" >&2
    exit 1
fi

# Remover todas as linhas relacionadas ao script do crontab
current_cron=$(crontab -l 2>/dev/null || true)

filtered=$(echo "$current_cron" | awk -v exec="$EXECUTE_SCRIPT" -v script="$SCRIPT_NAME" -v scripts_dir="$SCRIPTS_DIR" -v marker=("scheduling_exec:" script) '
BEGIN { skip=0 }
{
    line=$0

    # Mantém comentários/linhas vazias
    if (line ~ /^[[:space:]]*#/) { print line; next }
    if (line ~ /^[[:space:]]*$/) { print line; next }

    # Remove se tiver marker
    if (index(line, marker) > 0) { next }

    # Remove compatibilidade antiga (linha com ~/scripts/<script>)
    if (index(line, scripts_dir "/" script) > 0) { next }

    # Remove padrão atual (execute-script.sh <script>)
    n=split(line,a,/[ \t]+/)
    for (i=6; i<=n; i++) {
        if (a[i]==exec && (i+1)<=n && a[i+1]==script) { next }
    }

    print line
}
')

echo "$filtered" | crontab - 2>/dev/null

echo "Agendamento removido com sucesso"

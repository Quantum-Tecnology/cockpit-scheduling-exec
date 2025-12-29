#!/bin/bash
# Script para remover agendamento cron de um script
# Aceita tanto caminho completo quanto apenas o nome do script

SCRIPT_INPUT="$1"
EXECUTE_SCRIPT="/usr/share/cockpit/scheduling_exec/scripts/execute-script.sh"

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

# Remover todas as linhas relacionadas ao script do crontab
current_cron=$(crontab -l 2>/dev/null || true)

filtered=$(echo "$current_cron" | awk -v exec="$EXECUTE_SCRIPT" -v script="$SCRIPT_NAME" -v script_path="$SCRIPT_PATH" -v marker=("scheduling_exec:" script) '
BEGIN { skip=0 }
{
    line=$0

    # Mantém comentários/linhas vazias
    if (line ~ /^[[:space:]]*#/) { print line; next }
    if (line ~ /^[[:space:]]*$/) { print line; next }

    # Remove se tiver marker
    if (index(line, marker) > 0) { next }

    # Remove se tiver caminho completo do script
    if (index(line, script_path) > 0) { next }

    # Remove padrão atual (execute-script.sh <script> ou <caminho>)
    n=split(line,a,/[ \t]+/)
    for (i=6; i<=n; i++) {
        if (a[i]==exec && (i+1)<=n && (a[i+1]==script || a[i+1]==script_path)) { next }
    }

    print line
}
')

echo "$filtered" | crontab - 2>/dev/null

echo "Agendamento removido com sucesso"

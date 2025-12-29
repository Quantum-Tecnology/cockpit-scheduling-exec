#!/bin/bash
# Script para configurar agendamento cron de um script
# Aceita tanto caminho completo quanto apenas o nome do script

METADATA_DIR="$HOME/.scripts-metadata"
SCRIPT_INPUT="$1"
CRON_EXPRESSION="$2"

if [ -z "$SCRIPT_INPUT" ] || [ -z "$CRON_EXPRESSION" ]; then
    echo "Erro: Nome/caminho do script e expressão cron são obrigatórios" >&2
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

EXECUTE_SCRIPT="/usr/share/cockpit/scheduling_exec/scripts/execute-script.sh"

if [ ! -f "$SCRIPT_PATH" ]; then
    echo "Erro: Script não encontrado: $SCRIPT_PATH" >&2
    exit 1
fi

mkdir -p "$METADATA_DIR"

# Adicionar novo agendamento (permite múltiplos agendamentos por script)
# O comando chama execute-script.sh com o caminho completo do script
# Marcamos a linha para facilitar listagem/remoção.
new_line="$CRON_EXPRESSION $EXECUTE_SCRIPT $SCRIPT_PATH >> $HOME/.scripts-metadata/$SCRIPT_NAME.log 2>&1 # scheduling_exec:$SCRIPT_NAME"

current_cron=$(crontab -l 2>/dev/null || true)

# Evita duplicar a mesma linha
if echo "$current_cron" | grep -Fx "$new_line" >/dev/null 2>&1; then
    echo "Agendamento já existe"
    exit 0
fi

echo "$current_cron" | cat - <(echo "$new_line") | crontab -

echo "Agendamento configurado com sucesso"

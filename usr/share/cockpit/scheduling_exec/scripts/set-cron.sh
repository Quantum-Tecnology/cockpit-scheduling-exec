#!/bin/bash
# Script para configurar agendamento cron de um script

SCRIPTS_DIR="$HOME/scripts"
METADATA_DIR="$HOME/.scripts-metadata"
SCRIPT_NAME="$1"
CRON_EXPRESSION="$2"

if [ -z "$SCRIPT_NAME" ] || [ -z "$CRON_EXPRESSION" ]; then
    echo "Erro: Nome do script e expressão cron são obrigatórios" >&2
    exit 1
fi

SCRIPT_PATH="$SCRIPTS_DIR/$SCRIPT_NAME"
EXECUTE_SCRIPT="/usr/share/cockpit/scheduling_exec/scripts/execute-script.sh"

if [ ! -f "$SCRIPT_PATH" ]; then
    echo "Erro: Script não encontrado" >&2
    exit 1
fi

mkdir -p "$METADATA_DIR"

# Adicionar novo agendamento (permite múltiplos agendamentos por script)
# O comando chama execute-script.sh que atualiza as estatísticas
# Marcamos a linha para facilitar listagem/remoção.
new_line="$CRON_EXPRESSION $EXECUTE_SCRIPT $SCRIPT_NAME >> $HOME/.scripts-metadata/$SCRIPT_NAME.log 2>&1 # scheduling_exec:$SCRIPT_NAME"

current_cron=$(crontab -l 2>/dev/null || true)

# Evita duplicar a mesma linha
if echo "$current_cron" | grep -Fx "$new_line" >/dev/null 2>&1; then
    echo "Agendamento já existe"
    exit 0
fi

echo "$current_cron" | cat - <(echo "$new_line") | crontab -

echo "Agendamento configurado com sucesso"

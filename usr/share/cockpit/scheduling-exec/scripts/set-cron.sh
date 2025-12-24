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
EXECUTE_SCRIPT="/usr/share/cockpit/scheduling-exec/scripts/execute-script.sh"

if [ ! -f "$SCRIPT_PATH" ]; then
    echo "Erro: Script não encontrado" >&2
    exit 1
fi

# Remover agendamento anterior se existir
current_cron=$(crontab -l 2>/dev/null | grep -v "$SCRIPTS_DIR/$SCRIPT_NAME")

# Adicionar novo agendamento
# O comando chama execute-script.sh que atualiza as estatísticas
new_line="$CRON_EXPRESSION $EXECUTE_SCRIPT $SCRIPT_NAME >> $HOME/.scripts-metadata/$SCRIPT_NAME.log 2>&1"

# Combinar cron existente com novo agendamento
echo "$current_cron" | cat - <(echo "$new_line") | crontab -

echo "Agendamento configurado com sucesso"

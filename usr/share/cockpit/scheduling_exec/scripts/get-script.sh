#!/bin/bash
# Script para obter o conteúdo de um script específico
# Aceita tanto caminho completo quanto apenas o nome do script

SCRIPT_INPUT="$1"

if [ -z "$SCRIPT_INPUT" ]; then
    echo "Erro: Nome ou caminho do script não fornecido" >&2
    exit 1
fi

# Determinar se é caminho completo ou apenas nome
if [[ "$SCRIPT_INPUT" == /* ]]; then
    # Caminho absoluto
    SCRIPT_PATH="$SCRIPT_INPUT"
elif [[ "$SCRIPT_INPUT" == ~/* || "$SCRIPT_INPUT" == \~/* ]]; then
    # Caminho relativo ao home
    SCRIPT_PATH="${SCRIPT_INPUT/#\~/$HOME}"
else
    # Apenas nome do script - busca em $HOME/scripts por compatibilidade
    SCRIPT_PATH="$HOME/scripts/$SCRIPT_INPUT"
fi

if [ ! -f "$SCRIPT_PATH" ]; then
    echo "Erro: Script não encontrado: $SCRIPT_PATH" >&2
    exit 1
fi

cat "$SCRIPT_PATH"

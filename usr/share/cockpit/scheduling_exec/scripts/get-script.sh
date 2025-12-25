#!/bin/bash
# Script para obter o conteúdo de um script específico

SCRIPTS_DIR="$HOME/scripts"
SCRIPT_NAME="$1"

if [ -z "$SCRIPT_NAME" ]; then
    echo "Erro: Nome do script não fornecido" >&2
    exit 1
fi

SCRIPT_PATH="$SCRIPTS_DIR/$SCRIPT_NAME"

if [ ! -f "$SCRIPT_PATH" ]; then
    echo "Erro: Script não encontrado" >&2
    exit 1
fi

cat "$SCRIPT_PATH"

#!/bin/bash
# Retorna o conteúdo do arquivo de variáveis de ambiente (~/scripts/.env)

SCRIPTS_DIR="$HOME/scripts"
ENV_FILE="$SCRIPTS_DIR/.env"

mkdir -p "$SCRIPTS_DIR"

if [ -f "$ENV_FILE" ]; then
  cat "$ENV_FILE"
fi

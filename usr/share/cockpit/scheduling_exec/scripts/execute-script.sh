#!/bin/bash
# Script para executar um script e atualizar suas estatísticas

SCRIPTS_DIR="$HOME/scripts"
METADATA_DIR="$HOME/.scripts-metadata"
SCRIPT_NAME="$1"

if [ -z "$SCRIPT_NAME" ]; then
    echo "Erro: Nome do script não fornecido" >&2
    exit 1
fi

SCRIPT_PATH="$SCRIPTS_DIR/$SCRIPT_NAME"
METADATA_FILE="$METADATA_DIR/$SCRIPT_NAME.json"

if [ ! -f "$SCRIPT_PATH" ]; then
    echo "Erro: Script não encontrado" >&2
    exit 1
fi

# Criar metadata se não existir
if [ ! -f "$METADATA_FILE" ]; then
    timestamp=$(date +%s)
    cat > "$METADATA_FILE" << EOF
{
    "created_at": $timestamp,
    "updated_at": $timestamp,
    "last_execution": null,
    "total_executions": 0,
    "successful_executions": 0
}
EOF
fi

# Executar o script
cd "$SCRIPTS_DIR"
output=$("$SCRIPT_PATH" 2>&1)
exit_code=$?

# Atualizar metadata
timestamp=$(date +%s)
metadata=$(cat "$METADATA_FILE")

# Extrair valores existentes
created_at=$(echo "$metadata" | grep -o '"created_at":[0-9]*' | grep -o '[0-9]*')
updated_at=$(echo "$metadata" | grep -o '"updated_at":[0-9]*' | grep -o '[0-9]*')
total_executions=$(echo "$metadata" | grep -o '"total_executions":[0-9]*' | grep -o '[0-9]*')
successful_executions=$(echo "$metadata" | grep -o '"successful_executions":[0-9]*' | grep -o '[0-9]*')

# Defaults
[ -z "$created_at" ] && created_at="$timestamp"
[ -z "$updated_at" ] && updated_at="$timestamp"
[ -z "$total_executions" ] && total_executions="0"
[ -z "$successful_executions" ] && successful_executions="0"

# Incrementar contadores
total_executions=$((total_executions + 1))
if [ $exit_code -eq 0 ]; then
    successful_executions=$((successful_executions + 1))
fi

# Salvar metadata atualizado
cat > "$METADATA_FILE" << EOF
{
    "created_at": $created_at,
    "updated_at": $updated_at,
    "last_execution": $timestamp,
    "total_executions": $total_executions,
    "successful_executions": $successful_executions
}
EOF

# Retornar output do script
echo "$output"
exit $exit_code

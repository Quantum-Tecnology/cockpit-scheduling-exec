#!/bin/bash
# Script para salvar (criar ou atualizar) um script

SCRIPTS_DIR="$HOME/scripts"
METADATA_DIR="$HOME/.scripts-metadata"
ACTION="$1"
SCRIPT_NAME="$2"

if [ -z "$ACTION" ] || [ -z "$SCRIPT_NAME" ]; then
    echo "Erro: Ação e nome do script são obrigatórios" >&2
    exit 1
fi

# Criar diretórios se não existirem
mkdir -p "$SCRIPTS_DIR"
mkdir -p "$METADATA_DIR"

SCRIPT_PATH="$SCRIPTS_DIR/$SCRIPT_NAME"
METADATA_FILE="$METADATA_DIR/$SCRIPT_NAME.json"

# Ler conteúdo do stdin
CONTENT=$(cat)

# Verificar se é criação ou atualização
if [ "$ACTION" = "create" ]; then
    if [ -f "$SCRIPT_PATH" ]; then
        echo "Erro: Script já existe. Use 'update' para modificá-lo." >&2
        exit 1
    fi
    
    # Criar novo script
    echo "$CONTENT" > "$SCRIPT_PATH"
    chmod +x "$SCRIPT_PATH"
    
    # Criar metadata
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
    
elif [ "$ACTION" = "update" ]; then
    if [ ! -f "$SCRIPT_PATH" ]; then
        echo "Erro: Script não encontrado" >&2
        exit 1
    fi
    
    # Atualizar script
    echo "$CONTENT" > "$SCRIPT_PATH"
    chmod +x "$SCRIPT_PATH"
    
    # Atualizar timestamp de atualização no metadata
    if [ -f "$METADATA_FILE" ]; then
        timestamp=$(date +%s)
        metadata=$(cat "$METADATA_FILE")
        
        # Extrair valores existentes
        created_at=$(echo "$metadata" | grep -o '"created_at":[0-9]*' | grep -o '[0-9]*')
        last_execution=$(echo "$metadata" | grep -o '"last_execution":[0-9]*' | grep -o '[0-9]*')
        total_executions=$(echo "$metadata" | grep -o '"total_executions":[0-9]*' | grep -o '[0-9]*')
        successful_executions=$(echo "$metadata" | grep -o '"successful_executions":[0-9]*' | grep -o '[0-9]*')
        
        # Defaults se não encontrados
        [ -z "$created_at" ] && created_at="$timestamp"
        [ -z "$last_execution" ] && last_execution="null"
        [ -z "$total_executions" ] && total_executions="0"
        [ -z "$successful_executions" ] && successful_executions="0"
        
        # Reescrever metadata com novo updated_at
        cat > "$METADATA_FILE" << EOF
{
    "created_at": $created_at,
    "updated_at": $timestamp,
    "last_execution": $last_execution,
    "total_executions": $total_executions,
    "successful_executions": $successful_executions
}
EOF
    fi
else
    echo "Erro: Ação inválida. Use 'create' ou 'update'" >&2
    exit 1
fi

echo "Script salvo com sucesso"

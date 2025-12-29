#!/bin/bash
# Script para salvar (criar ou atualizar) um script
# Aceita tanto caminho completo quanto apenas o nome do script

METADATA_DIR="$HOME/.scripts-metadata"
ACTION="$1"
SCRIPT_INPUT="$2"

if [ -z "$ACTION" ] || [ -z "$SCRIPT_INPUT" ]; then
    echo "Erro: Ação e nome/caminho do script são obrigatórios" >&2
    exit 1
fi

# Criar diretório de metadata se não existir
mkdir -p "$METADATA_DIR"

# Determinar se é caminho completo ou apenas nome
if [[ "$SCRIPT_INPUT" == /* ]]; then
    # Caminho absoluto
    SCRIPT_PATH="$SCRIPT_INPUT"
    SCRIPT_NAME=$(basename "$SCRIPT_PATH")
    SCRIPT_DIR=$(dirname "$SCRIPT_PATH")
elif [[ "$SCRIPT_INPUT" == ~/* || "$SCRIPT_INPUT" == \~/* ]]; then
    # Caminho relativo ao home
    SCRIPT_PATH="${SCRIPT_INPUT/#\~/$HOME}"
    SCRIPT_NAME=$(basename "$SCRIPT_PATH")
    SCRIPT_DIR=$(dirname "$SCRIPT_PATH")
else
    # Apenas nome do script - salva em $HOME/scripts por compatibilidade
    SCRIPT_NAME="$SCRIPT_INPUT"
    SCRIPT_DIR="$HOME/scripts"
    SCRIPT_PATH="$SCRIPT_DIR/$SCRIPT_NAME"
fi

# Criar diretório do script se não existir
mkdir -p "$SCRIPT_DIR"

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

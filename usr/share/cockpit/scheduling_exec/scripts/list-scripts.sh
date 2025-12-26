#!/bin/bash
# Script para listar todos os scripts do usuário com suas estatísticas

SCRIPTS_DIR="$HOME/scripts"
METADATA_DIR="$HOME/.scripts-metadata"

# Criar diretórios se não existirem
mkdir -p "$SCRIPTS_DIR"
mkdir -p "$METADATA_DIR"

# Array JSON de scripts
echo "["

first=true

# Listar todos os scripts .sh no diretório
for script in "$SCRIPTS_DIR"/*.sh; do
    if [ -f "$script" ]; then
        basename=$(basename "$script")
        metadata_file="$METADATA_DIR/$basename.json"

        # Criar metadata se não existir
        if [ ! -f "$metadata_file" ]; then
            created_timestamp=$(stat -c %Y "$script" 2>/dev/null || stat -f %m "$script" 2>/dev/null)
            cat > "$metadata_file" << EOF
{
    "created_at": $created_timestamp,
    "updated_at": $created_timestamp,
    "last_execution": null,
    "total_executions": 0,
    "successful_executions": 0
}
EOF
        fi

        # Ler metadata
        metadata=$(cat "$metadata_file")

        # Obter expressão cron se existir
        cron_expression=$(crontab -l 2>/dev/null | grep "$SCRIPTS_DIR/$basename" | grep -v "^#" | head -n1 | sed "s|.*\(.*\) $SCRIPTS_DIR/$basename.*|\1|" | awk '{for(i=1;i<=5;i++) printf $i" "; print ""}')
        cron_expression=$(echo "$cron_expression" | xargs)

        # Adicionar vírgula entre objetos JSON
        if [ "$first" = false ]; then
            echo ","
        fi
        first=false

        # Obter timestamp de atualização do arquivo
        updated_timestamp=$(stat -c %Y "$script" 2>/dev/null || stat -f %m "$script" 2>/dev/null)

        # Extrair valores do metadata (aceita espaços após ':')
        created_at=$(echo "$metadata" | grep -Eo '"created_at"[[:space:]]*:[[:space:]]*[0-9]+' | grep -Eo '[0-9]+')
        last_execution_raw=$(echo "$metadata" | grep -Eo '"last_execution"[[:space:]]*:[[:space:]]*(null|[0-9]+)' | head -n1 || true)
        last_execution=$(echo "$last_execution_raw" | grep -Eo '[0-9]+' || true)
        total_executions=$(echo "$metadata" | grep -Eo '"total_executions"[[:space:]]*:[[:space:]]*[0-9]+' | grep -Eo '[0-9]+')
        successful_executions=$(echo "$metadata" | grep -Eo '"successful_executions"[[:space:]]*:[[:space:]]*[0-9]+' | grep -Eo '[0-9]+')

        # Default values se não encontrados
        [ -z "$created_at" ] && created_at="null"
        [ -z "$last_execution" ] && last_execution="null"
        [ -z "$total_executions" ] && total_executions="0"
        [ -z "$successful_executions" ] && successful_executions="0"

        # Construir objeto JSON
        cat << EOF
{
    "name": "$basename",
    "path": "$SCRIPTS_DIR/$basename",
    "cron_expression": "$cron_expression",
    "created_at": $created_at,
    "updated_at": $updated_timestamp,
    "last_execution": $last_execution,
    "total_executions": $total_executions,
    "successful_executions": $successful_executions
}
EOF
    fi
done

echo "]"

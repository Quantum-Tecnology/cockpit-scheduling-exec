#!/bin/bash
# Script para executar um script e atualizar suas estatísticas

SCRIPTS_DIR="$HOME/scripts"
METADATA_DIR="$HOME/.scripts-metadata"
ENV_FILE="$SCRIPTS_DIR/.env"
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

# Carregar variáveis de ambiente do usuário (se existir).
# Observação: o arquivo é tratado como shell e pode conter comentários.
exit_code=0
output=""

if [ -f "$ENV_FILE" ]; then
    err_file=""
    if command -v mktemp >/dev/null 2>&1; then
        err_file="$(mktemp)"
    else
        err_file="/tmp/scheduling_exec_env_err.$$"
        : > "$err_file"
    fi

    set -a
    . "$ENV_FILE" 2>"$err_file"
    env_rc=$?
    set +a

    if [ $env_rc -ne 0 ]; then
        output="Erro ao carregar variáveis de ambiente ($ENV_FILE):\n$(cat "$err_file")"
        exit_code=$env_rc
    fi

    rm -f "$err_file" 2>/dev/null || true
fi

if [ $exit_code -eq 0 ]; then
    # Executar o script
    cd "$SCRIPTS_DIR"
    output=$("$SCRIPT_PATH" 2>&1)
    exit_code=$?
fi

json_escape() {
    local s="$1"
    s=${s//\\/\\\\}
    s=${s//\"/\\\"}
    s=${s//$'\n'/\\n}
    s=${s//$'\r'/\\r}
    s=${s//$'\t'/\\t}
    printf '%s' "$s"
}

# Atualizar metadata
timestamp=$(date +%s)
metadata=$(cat "$METADATA_FILE")

# Extrair valores existentes (aceita espaços após ':')
created_at=$(echo "$metadata" | grep -Eo '"created_at"[[:space:]]*:[[:space:]]*[0-9]+' | grep -Eo '[0-9]+')
updated_at=$(echo "$metadata" | grep -Eo '"updated_at"[[:space:]]*:[[:space:]]*[0-9]+' | grep -Eo '[0-9]+')
total_executions=$(echo "$metadata" | grep -Eo '"total_executions"[[:space:]]*:[[:space:]]*[0-9]+' | grep -Eo '[0-9]+')
successful_executions=$(echo "$metadata" | grep -Eo '"successful_executions"[[:space:]]*:[[:space:]]*[0-9]+' | grep -Eo '[0-9]+')

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

# Retornar output + exit_code em JSON, sem falhar o comando do Cockpit.
# Assim a UI consegue exibir a saída mesmo quando o script retorna erro.
printf '{"exit_code":%s,"output":"%s"}\n' "$exit_code" "$(json_escape "$output")"
exit 0

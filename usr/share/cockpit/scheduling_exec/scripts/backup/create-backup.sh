#!/bin/bash
# Script para criar backup de um diretório
# Uso: create-backup.sh <origem> <destino> [nome]

SOURCE_DIR="$1"
DEST_DIR="$2"
BACKUP_NAME="${3:-backup}"

if [ -z "$SOURCE_DIR" ] || [ -z "$DEST_DIR" ]; then
    echo "Erro: Parâmetros insuficientes" >&2
    echo "Uso: $0 <origem> <destino> [nome]" >&2
    exit 1
fi

# Verificar se o diretório de origem existe
if [ ! -d "$SOURCE_DIR" ]; then
    echo "Erro: Diretório de origem não encontrado: $SOURCE_DIR" >&2
    exit 1
fi

# Criar diretório de destino se não existir
mkdir -p "$DEST_DIR"

# Gerar nome do arquivo de backup com timestamp
TIMESTAMP=$(date '+%Y%m%d_%H%M%S')
BACKUP_FILE="$DEST_DIR/${BACKUP_NAME}_${TIMESTAMP}.tar.gz"

# Criar backup
echo "Criando backup de $SOURCE_DIR..."
echo "Destino: $BACKUP_FILE"

tar -czf "$BACKUP_FILE" -C "$(dirname "$SOURCE_DIR")" "$(basename "$SOURCE_DIR")" 2>&1

if [ $? -eq 0 ]; then
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    echo "Backup criado com sucesso!"
    echo "Arquivo: $BACKUP_FILE"
    echo "Tamanho: $BACKUP_SIZE"
    exit 0
else
    echo "Erro ao criar backup" >&2
    exit 1
fi

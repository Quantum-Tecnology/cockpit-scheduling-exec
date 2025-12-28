#!/bin/bash
# Script para restaurar um backup
# Uso: restore-backup.sh <arquivo_backup> <destino>

BACKUP_FILE="$1"
DEST_DIR="$2"

if [ -z "$BACKUP_FILE" ] || [ -z "$DEST_DIR" ]; then
    echo "Erro: Parâmetros insuficientes" >&2
    echo "Uso: $0 <arquivo_backup> <destino>" >&2
    exit 1
fi

# Verificar se o arquivo de backup existe
if [ ! -f "$BACKUP_FILE" ]; then
    echo "Erro: Arquivo de backup não encontrado: $BACKUP_FILE" >&2
    exit 1
fi

# Criar diretório de destino se não existir
mkdir -p "$DEST_DIR"

# Verificar tipo de arquivo e restaurar
FILE_TYPE=$(file -b --mime-type "$BACKUP_FILE")

echo "Restaurando backup..."
echo "Origem: $BACKUP_FILE"
echo "Destino: $DEST_DIR"

case "$FILE_TYPE" in
    application/x-gzip|application/gzip)
        tar -xzf "$BACKUP_FILE" -C "$DEST_DIR" 2>&1
        ;;
    application/x-bzip2)
        tar -xjf "$BACKUP_FILE" -C "$DEST_DIR" 2>&1
        ;;
    application/x-tar)
        tar -xf "$BACKUP_FILE" -C "$DEST_DIR" 2>&1
        ;;
    application/zip)
        unzip -q "$BACKUP_FILE" -d "$DEST_DIR" 2>&1
        ;;
    *)
        echo "Erro: Tipo de arquivo não suportado: $FILE_TYPE" >&2
        exit 1
        ;;
esac

if [ $? -eq 0 ]; then
    echo "Backup restaurado com sucesso em: $DEST_DIR"
    exit 0
else
    echo "Erro ao restaurar backup" >&2
    exit 1
fi

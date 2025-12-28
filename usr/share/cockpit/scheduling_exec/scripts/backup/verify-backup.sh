#!/bin/bash
# Script para verificar integridade de backups
# Uso: verify-backup.sh <arquivo_backup>

BACKUP_FILE="$1"

if [ -z "$BACKUP_FILE" ]; then
    echo "Erro: Arquivo de backup não especificado" >&2
    echo "Uso: $0 <arquivo_backup>" >&2
    exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
    echo "Erro: Arquivo não encontrado: $BACKUP_FILE" >&2
    exit 1
fi

echo "Verificando integridade do backup: $BACKUP_FILE"
echo "=========================================="

# Informações básicas
echo ""
echo "Informações do arquivo:"
echo "  Tamanho: $(du -h "$BACKUP_FILE" | cut -f1)"
echo "  Tipo: $(file -b "$BACKUP_FILE")"
echo "  Modificado: $(stat -c %y "$BACKUP_FILE")"
echo ""

# Verificar tipo de arquivo e integridade
FILE_TYPE=$(file -b --mime-type "$BACKUP_FILE")

case "$FILE_TYPE" in
    application/x-gzip|application/gzip)
        echo "Testando arquivo tar.gz..."
        if tar -tzf "$BACKUP_FILE" > /dev/null 2>&1; then
            echo "✓ Arquivo íntegro!"
            echo ""
            echo "Conteúdo:"
            tar -tzf "$BACKUP_FILE" | head -20
            FILE_COUNT=$(tar -tzf "$BACKUP_FILE" | wc -l)
            echo "..."
            echo "Total de arquivos: $FILE_COUNT"
            exit 0
        else
            echo "✗ Arquivo corrompido ou inválido" >&2
            exit 1
        fi
        ;;
    application/x-bzip2)
        echo "Testando arquivo tar.bz2..."
        if tar -tjf "$BACKUP_FILE" > /dev/null 2>&1; then
            echo "✓ Arquivo íntegro!"
            echo ""
            echo "Conteúdo:"
            tar -tjf "$BACKUP_FILE" | head -20
            FILE_COUNT=$(tar -tjf "$BACKUP_FILE" | wc -l)
            echo "..."
            echo "Total de arquivos: $FILE_COUNT"
            exit 0
        else
            echo "✗ Arquivo corrompido ou inválido" >&2
            exit 1
        fi
        ;;
    application/x-tar)
        echo "Testando arquivo tar..."
        if tar -tf "$BACKUP_FILE" > /dev/null 2>&1; then
            echo "✓ Arquivo íntegro!"
            echo ""
            echo "Conteúdo:"
            tar -tf "$BACKUP_FILE" | head -20
            FILE_COUNT=$(tar -tf "$BACKUP_FILE" | wc -l)
            echo "..."
            echo "Total de arquivos: $FILE_COUNT"
            exit 0
        else
            echo "✗ Arquivo corrompido ou inválido" >&2
            exit 1
        fi
        ;;
    application/zip)
        echo "Testando arquivo zip..."
        if unzip -t "$BACKUP_FILE" > /dev/null 2>&1; then
            echo "✓ Arquivo íntegro!"
            echo ""
            echo "Conteúdo:"
            unzip -l "$BACKUP_FILE" | head -20
            exit 0
        else
            echo "✗ Arquivo corrompido ou inválido" >&2
            exit 1
        fi
        ;;
    *)
        echo "Aviso: Tipo de arquivo não reconhecido: $FILE_TYPE"
        echo "Não é possível verificar a integridade automaticamente."
        exit 2
        ;;
esac

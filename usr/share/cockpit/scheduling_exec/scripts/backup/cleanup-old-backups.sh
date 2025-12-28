#!/bin/bash
# Script para limpar backups antigos
# Uso: cleanup-old-backups.sh <diretorio> <dias>

BACKUP_DIR="$1"
DAYS="${2:-30}"

if [ -z "$BACKUP_DIR" ]; then
    echo "Erro: Diretório não especificado" >&2
    echo "Uso: $0 <diretorio> [dias]" >&2
    exit 1
fi

if [ ! -d "$BACKUP_DIR" ]; then
    echo "Erro: Diretório não encontrado: $BACKUP_DIR" >&2
    exit 1
fi

echo "Procurando backups antigos em: $BACKUP_DIR"
echo "Critério: Arquivos com mais de $DAYS dias"
echo "=========================================="

# Encontrar arquivos antigos
OLD_FILES=$(find "$BACKUP_DIR" -type f -mtime +$DAYS)

if [ -z "$OLD_FILES" ]; then
    echo "Nenhum backup antigo encontrado."
    exit 0
fi

# Contar arquivos
FILE_COUNT=$(echo "$OLD_FILES" | wc -l)
TOTAL_SIZE=$(echo "$OLD_FILES" | xargs du -ch | tail -1 | cut -f1)

echo "Encontrados $FILE_COUNT arquivo(s) antigo(s)"
echo "Tamanho total: $TOTAL_SIZE"
echo ""
echo "Arquivos que serão removidos:"
echo "$OLD_FILES"
echo ""

# Confirmar exclusão (se executado manualmente)
if [ -t 0 ]; then
    read -p "Confirmar exclusão? (s/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Ss]$ ]]; then
        echo "Operação cancelada."
        exit 0
    fi
fi

# Deletar arquivos
echo "$OLD_FILES" | xargs rm -f

if [ $? -eq 0 ]; then
    echo "✓ $FILE_COUNT arquivo(s) removido(s) com sucesso!"
    echo "✓ $TOTAL_SIZE de espaço liberado"
    exit 0
else
    echo "✗ Erro ao remover arquivos" >&2
    exit 1
fi

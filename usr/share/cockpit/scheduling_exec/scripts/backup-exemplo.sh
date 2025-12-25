#!/bin/bash
# Script de Exemplo: Backup Simples
# Este script cria um backup compactado de um diretório

# Configurações
SOURCE_DIR="$HOME/documentos"        # Diretório de origem
BACKUP_DIR="$HOME/backups"           # Diretório de destino
RETENTION_DAYS=7                      # Manter backups por N dias

# Preparação
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="backup_$DATE.tar.gz"
LOG_FILE="$HOME/.scripts-metadata/backup-exemplo.sh.log"

echo "======================================"
echo "Backup Iniciado: $(date)"
echo "======================================"

# Criar diretório de backup se não existir
if [ ! -d "$BACKUP_DIR" ]; then
    mkdir -p "$BACKUP_DIR"
    echo "Diretório de backup criado: $BACKUP_DIR"
fi

# Verificar se diretório de origem existe
if [ ! -d "$SOURCE_DIR" ]; then
    echo "ERRO: Diretório de origem não existe: $SOURCE_DIR" >&2
    exit 1
fi

# Criar backup
echo "Criando backup de: $SOURCE_DIR"
echo "Destino: $BACKUP_DIR/$BACKUP_NAME"

if tar -czf "$BACKUP_DIR/$BACKUP_NAME" -C "$(dirname "$SOURCE_DIR")" "$(basename "$SOURCE_DIR")" 2>/dev/null; then
    BACKUP_SIZE=$(du -h "$BACKUP_DIR/$BACKUP_NAME" | cut -f1)
    echo "✓ Backup criado com sucesso!"
    echo "  Tamanho: $BACKUP_SIZE"
else
    echo "✗ Erro ao criar backup!" >&2
    exit 1
fi

# Limpar backups antigos
echo ""
echo "Limpando backups antigos (mais de $RETENTION_DAYS dias)..."
find "$BACKUP_DIR" -name "backup_*.tar.gz" -type f -mtime +$RETENTION_DAYS -delete
REMAINING=$(find "$BACKUP_DIR" -name "backup_*.tar.gz" -type f | wc -l)
echo "Backups restantes: $REMAINING"

echo ""
echo "======================================"
echo "Backup Concluído: $(date)"
echo "======================================"

exit 0

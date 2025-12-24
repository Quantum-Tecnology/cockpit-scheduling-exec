#!/bin/bash
# Script de Exemplo: Limpeza de Logs Antigos
# Remove arquivos .log antigos de diretórios específicos

# Configurações
DAYS_OLD=30                           # Remover arquivos mais antigos que N dias
LOG_DIRS=(
    "$HOME/.cache"
    "$HOME/.local/share/logs"
    "/tmp"
)

echo "======================================"
echo "Limpeza de Logs Iniciada: $(date)"
echo "======================================"
echo "Removendo arquivos .log mais antigos que $DAYS_OLD dias"
echo ""

TOTAL_REMOVED=0
TOTAL_SIZE=0

for dir in "${LOG_DIRS[@]}"; do
    if [ ! -d "$dir" ]; then
        echo "⊘ Diretório não existe: $dir (pulando)"
        continue
    fi
    
    echo "Verificando: $dir"
    
    # Contar e calcular tamanho antes de remover
    COUNT=$(find "$dir" -name "*.log" -type f -mtime +$DAYS_OLD 2>/dev/null | wc -l)
    
    if [ $COUNT -eq 0 ]; then
        echo "  ✓ Nenhum arquivo antigo encontrado"
    else
        # Calcular tamanho total
        SIZE=$(find "$dir" -name "*.log" -type f -mtime +$DAYS_OLD -exec du -ch {} + 2>/dev/null | grep total$ | cut -f1)
        
        # Remover arquivos
        find "$dir" -name "*.log" -type f -mtime +$DAYS_OLD -delete 2>/dev/null
        
        echo "  ✓ Removidos: $COUNT arquivos ($SIZE)"
        TOTAL_REMOVED=$((TOTAL_REMOVED + COUNT))
    fi
done

echo ""
echo "======================================"
echo "Resumo:"
echo "  Total de arquivos removidos: $TOTAL_REMOVED"
echo "Limpeza Concluída: $(date)"
echo "======================================"

exit 0

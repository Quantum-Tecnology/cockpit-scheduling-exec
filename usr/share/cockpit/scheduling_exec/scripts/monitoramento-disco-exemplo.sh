#!/bin/bash
# Script de Exemplo: Monitoramento de Disco
# Verifica o uso de disco e alerta se estiver acima do limite

# Configurações
THRESHOLD=80                          # Limite de alerta (%)
CHECK_MOUNT="/"                       # Ponto de montagem para verificar

echo "======================================"
echo "Monitoramento de Disco: $(date)"
echo "======================================"
echo ""

# Obter uso do disco
USAGE=$(df -h "$CHECK_MOUNT" | awk 'NR==2 {print $5}' | sed 's/%//')
AVAILABLE=$(df -h "$CHECK_MOUNT" | awk 'NR==2 {print $4}')
USED=$(df -h "$CHECK_MOUNT" | awk 'NR==2 {print $3}')
TOTAL=$(df -h "$CHECK_MOUNT" | awk 'NR==2 {print $2}')

echo "Ponto de montagem: $CHECK_MOUNT"
echo "Total: $TOTAL"
echo "Usado: $USED ($USAGE%)"
echo "Disponível: $AVAILABLE"
echo ""

# Verificar se está acima do limite
if [ "$USAGE" -gt "$THRESHOLD" ]; then
    echo "⚠️  ALERTA: Uso de disco acima de $THRESHOLD%!"
    echo ""
    echo "Top 10 maiores diretórios:"
    du -h "$HOME" 2>/dev/null | sort -rh | head -10
    echo ""
    echo "Sugestões:"
    echo "  - Limpar cache: rm -rf ~/.cache/*"
    echo "  - Limpar logs antigos"
    echo "  - Remover pacotes não utilizados"
    echo "  - Esvaziar lixeira"
    
    # Código de saída 1 para indicar alerta
    exit 1
else
    echo "✓ Uso de disco OK (abaixo de $THRESHOLD%)"
    exit 0
fi

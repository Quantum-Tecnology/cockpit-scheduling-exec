#!/bin/bash
# Script de verificação de instalação do Cockpit Scheduling Exec
# Execute este script para diagnosticar problemas de instalação

set -e

echo "================================================"
echo "  Cockpit Scheduling Exec - Verificação"
echo "================================================"
echo ""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função para verificar
check() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓${NC} $2"
        return 0
    else
        echo -e "${RED}✗${NC} $2"
        return 1
    fi
}

warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# 1. Verificar se Cockpit está instalado
echo "1. Verificando instalação do Cockpit..."
if command -v cockpit-bridge &> /dev/null; then
    check 0 "Cockpit está instalado"
else
    check 1 "Cockpit NÃO está instalado"
    echo "   Instale com: sudo apt install cockpit"
    exit 1
fi

# 2. Verificar se Cockpit está rodando
echo ""
echo "2. Verificando serviço do Cockpit..."
if systemctl is-active --quiet cockpit.socket; then
    check 0 "Cockpit está rodando"
else
    check 1 "Cockpit NÃO está rodando"
    echo "   Inicie com: sudo systemctl start cockpit.socket"
fi

# 3. Verificar se o diretório do plugin existe
echo ""
echo "3. Verificando arquivos do plugin..."
if [ -d "/usr/share/cockpit/scheduling-exec" ]; then
    check 0 "Diretório do plugin existe"
else
    check 1 "Diretório do plugin NÃO existe"
    echo "   Deveria estar em: /usr/share/cockpit/scheduling-exec"
    exit 1
fi

# 4. Verificar arquivos essenciais
echo ""
echo "4. Verificando arquivos essenciais..."
MISSING=0

if [ -f "/usr/share/cockpit/scheduling-exec/manifest.json" ]; then
    check 0 "manifest.json existe"
else
    check 1 "manifest.json NÃO existe"
    MISSING=1
fi

if [ -f "/usr/share/cockpit/scheduling-exec/index.html" ]; then
    check 0 "index.html existe"
else
    check 1 "index.html NÃO existe"
    MISSING=1
fi

if [ -f "/usr/share/cockpit/scheduling-exec/index.js" ]; then
    check 0 "index.js existe"
else
    check 1 "index.js NÃO existe"
    MISSING=1
fi

# 5. Verificar conteúdo do manifest.json
echo ""
echo "5. Verificando manifest.json..."
if [ -f "/usr/share/cockpit/scheduling-exec/manifest.json" ]; then
    # Verificar se tem campo "menu"
    if grep -q '"menu"' /usr/share/cockpit/scheduling-exec/manifest.json; then
        check 0 "Campo 'menu' existe no manifest"
    else
        check 1 "Campo 'menu' NÃO existe no manifest"
        warn "O módulo não aparecerá no menu sem este campo"
    fi

    # Verificar se tem campo "name"
    if grep -q '"name"' /usr/share/cockpit/scheduling-exec/manifest.json; then
        check 0 "Campo 'name' existe no manifest"
    else
        check 1 "Campo 'name' NÃO existe no manifest"
    fi

    echo ""
    echo "   Conteúdo do manifest.json:"
    echo "   ----------------------------------------"
    cat /usr/share/cockpit/scheduling-exec/manifest.json | sed 's/^/   /'
    echo "   ----------------------------------------"
fi

# 6. Verificar permissões
echo ""
echo "6. Verificando permissões..."
PERM_OK=1

if [ -r "/usr/share/cockpit/scheduling-exec/manifest.json" ]; then
    check 0 "manifest.json é legível"
else
    check 1 "manifest.json NÃO é legível"
    PERM_OK=0
fi

if [ -r "/usr/share/cockpit/scheduling-exec/index.html" ]; then
    check 0 "index.html é legível"
else
    check 1 "index.html NÃO é legível"
    PERM_OK=0
fi

# 7. Verificar se cron está instalado
echo ""
echo "7. Verificando dependências..."
if command -v crontab &> /dev/null; then
    check 0 "cron está instalado"
else
    check 1 "cron NÃO está instalado"
    echo "   Instale com: sudo apt install cron"
fi

# 8. Listar todos os módulos Cockpit instalados
echo ""
echo "8. Módulos Cockpit instalados:"
echo "   ----------------------------------------"
if [ -d "/usr/share/cockpit" ]; then
    for dir in /usr/share/cockpit/*/; do
        module=$(basename "$dir")
        if [ -f "$dir/manifest.json" ]; then
            echo -e "   ${GREEN}✓${NC} $module"
        else
            echo -e "   ${YELLOW}⚠${NC} $module (sem manifest.json)"
        fi
    done
fi
echo "   ----------------------------------------"

# 9. Verificar logs do Cockpit
echo ""
echo "9. Últimas entradas do log do Cockpit:"
echo "   ----------------------------------------"
if command -v journalctl &> /dev/null; then
    journalctl -u cockpit -n 10 --no-pager | sed 's/^/   /' || echo "   Sem logs disponíveis"
else
    warn "journalctl não disponível"
fi
echo "   ----------------------------------------"

# Resumo final
echo ""
echo "================================================"
if [ $MISSING -eq 0 ] && [ $PERM_OK -eq 1 ]; then
    echo -e "  ${GREEN}✓ Instalação parece estar OK!${NC}"
    echo ""
    echo "  Se o módulo ainda não aparecer no menu:"
    echo "  1. Reinicie o Cockpit: sudo systemctl restart cockpit"
    echo "  2. Limpe o cache do navegador (Ctrl+Shift+Del)"
    echo "  3. Faça logout e login novamente no Cockpit"
    echo "  4. Acesse: https://localhost:9090"
else
    echo -e "  ${RED}✗ Problemas encontrados!${NC}"
    echo ""
    echo "  Ações sugeridas:"
    echo "  1. Reinstale o pacote: sudo apt install --reinstall ./cockpit-scheduling-exec_1.0.7_all.deb"
    echo "  2. Verifique permissões: sudo chmod -R 644 /usr/share/cockpit/scheduling-exec/*"
    echo "  3. Reinicie o Cockpit: sudo systemctl restart cockpit"
fi
echo "================================================"
echo ""

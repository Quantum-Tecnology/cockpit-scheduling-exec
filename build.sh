#!/bin/bash
# Script de construção do pacote Debian
# Execute este script para criar o pacote cockpit-scheduling-exec.deb

set -e

echo "================================================"
echo "  Construindo cockpit-scheduling-exec.deb"
echo "================================================"
echo ""

# Verificar se estamos no diretório correto
if [ ! -f "DEBIAN/control" ]; then
    echo "Erro: Execute este script no diretório raiz do projeto (onde está a pasta DEBIAN)"
    exit 1
fi

# Verificar se dpkg-deb está instalado
if ! command -v dpkg-deb &> /dev/null; then
    echo "Erro: dpkg-deb não está instalado"
    echo "Instale com: sudo apt-get install dpkg-dev"
    exit 1
fi

# Garantir permissões corretas para os scripts
echo "Configurando permissões dos scripts..."
chmod +x usr/share/cockpit/scheduling-exec/scripts/*.sh

# Criar o pacote
echo "Criando pacote .deb..."
cd ..
dpkg-deb --build cockpit-scheduling-exec cockpit-scheduling-exec.deb

echo ""
echo "================================================"
echo "  Pacote criado com sucesso!"
echo "================================================"
echo ""
echo "Arquivo: cockpit-scheduling-exec.deb"
echo ""
echo "Para instalar, execute:"
echo "  sudo apt install ./cockpit-scheduling-exec.deb"
echo ""
echo "Ou:"
echo "  sudo dpkg -i cockpit-scheduling-exec.deb"
echo "  sudo apt-get install -f"
echo ""

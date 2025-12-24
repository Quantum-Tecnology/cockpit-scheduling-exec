#!/bin/bash
# Script de instalação manual (sem pacote .deb)
# Use este script se não quiser criar o pacote Debian

set -e

echo "================================================"
echo "  Instalação Manual - Cockpit Scheduling Exec"
echo "================================================"
echo ""

# Verificar se é root
if [ "$EUID" -ne 0 ]; then 
    echo "Este script precisa ser executado como root (sudo)"
    exit 1
fi

# Verificar se o Cockpit está instalado
if ! command -v cockpit-bridge &> /dev/null; then
    echo "Erro: Cockpit não está instalado"
    echo "Instale com: sudo apt install cockpit"
    exit 1
fi

# Verificar se estamos no diretório correto
if [ ! -d "usr/share/cockpit/scheduling-exec" ]; then
    echo "Erro: Diretório usr/share/cockpit/scheduling-exec não encontrado"
    echo "Execute este script no diretório raiz do projeto"
    exit 1
fi

echo "Copiando arquivos para /usr/share/cockpit/scheduling-exec/..."
mkdir -p /usr/share/cockpit/scheduling-exec
cp -r usr/share/cockpit/scheduling-exec/* /usr/share/cockpit/scheduling-exec/

echo "Configurando permissões..."
chmod +x /usr/share/cockpit/scheduling-exec/scripts/*.sh

echo "Reiniciando Cockpit..."
systemctl restart cockpit

echo ""
echo "================================================"
echo "  Instalação concluída com sucesso!"
echo "================================================"
echo ""
echo "Acesse o Cockpit em: https://localhost:9090"
echo "O plugin estará disponível no menu 'Scripts & Agendamentos'"
echo ""

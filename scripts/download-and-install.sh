#!/bin/bash
# Script para baixar e instalar artefato do GitHub Actions
# Uso: ./download-and-install.sh

set -e

REPO="QuantumTecnology/cockpit-scheduling-exec"
ARTIFACT_NAME="cockpit-scheduling-exec-deb"

echo "🚀 Download e Instalação - Cockpit Scheduling Exec"
echo "=================================================="
echo ""

# Verificar se gh está instalado
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) não está instalado"
    echo ""
    echo "Instale com:"
    echo "  sudo apt update"
    echo "  sudo apt install gh"
    echo ""
    echo "Depois execute: gh auth login"
    exit 1
fi

# Verificar autenticação
if ! gh auth status &> /dev/null; then
    echo "❌ Você não está autenticado no GitHub CLI"
    echo ""
    echo "Execute: gh auth login"
    exit 1
fi

echo "✅ GitHub CLI configurado"
echo ""

# Listar últimos workflows
echo "📋 Buscando último build bem-sucedido..."
RUN_ID=$(gh run list --repo $REPO --workflow "Build Debian Package" --status success --limit 1 --json databaseId --jq '.[0].databaseId')

if [ -z "$RUN_ID" ]; then
    echo "❌ Nenhum build bem-sucedido encontrado"
    exit 1
fi

echo "✅ Build encontrado: $RUN_ID"
echo ""

# Criar diretório temporário
TEMP_DIR=$(mktemp -d)
cd "$TEMP_DIR"

echo "📥 Baixando artefato..."
gh run download $RUN_ID --repo $REPO --name $ARTIFACT_NAME

if [ ! -f cockpit-scheduling-exec_*.deb ]; then
    echo "❌ Arquivo .deb não encontrado no artefato"
    rm -rf "$TEMP_DIR"
    exit 1
fi

DEB_FILE=$(ls cockpit-scheduling-exec_*.deb)
echo "✅ Arquivo baixado: $DEB_FILE"
echo ""

# Mostrar informações do pacote
echo "📦 Informações do pacote:"
dpkg-deb --info "$DEB_FILE" | grep -E "Package|Version|Description"
echo ""

# Perguntar se quer instalar
read -p "Deseja instalar agora? (s/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Ss]$ ]]; then
    echo ""
    echo "📦 Instalando pacote..."
    sudo apt install -y "./$DEB_FILE"

    echo ""
    echo "✅ Instalação concluída!"
    echo ""
    echo "🌐 Acesse o Cockpit em: https://localhost:9090"
    echo "📁 Plugin disponível em: Scripts & Agendamentos"
else
    echo ""
    echo "📁 Arquivo salvo em: $TEMP_DIR/$DEB_FILE"
    echo ""
    echo "Para instalar manualmente:"
    echo "  cd $TEMP_DIR"
    echo "  sudo apt install ./$DEB_FILE"
fi

echo ""
echo "✨ Concluído!"

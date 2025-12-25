#!/bin/bash
# Script de construção do pacote Debian
# Execute este script para criar o pacote .deb (via staging)

set -e

echo "================================================"
echo "  Construindo pacote .deb"
echo "================================================"
echo ""

umask 022

UNAME_S=$(uname -s 2>/dev/null || true)
case "$UNAME_S" in
    MINGW*|MSYS*|CYGWIN*)
        echo "Erro: build local via dpkg-deb não é suportado neste ambiente ($UNAME_S)."
        echo "Motivo: o dpkg-deb exige permissões Unix no diretório DEBIAN e, no Git Bash/MSYS, costuma enxergar 777."
        echo "Use uma distro Linux/WSL (ex.: Ubuntu) ou rode o build via GitHub Actions."
        exit 2
        ;;
esac

SCRIPT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
REPO_ROOT=$(cd "$SCRIPT_DIR/.." && pwd)
cd "$REPO_ROOT"

# Verificar se estamos no diretório correto
if [ ! -f "DEBIAN/control" ]; then
    echo "Erro: Estrutura inválida (DEBIAN/control não encontrado)"
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
chmod +x usr/share/cockpit/scheduling_exec/scripts/*.sh
chmod 644 usr/share/cockpit/scheduling_exec/manifest.json
chmod 644 usr/share/cockpit/scheduling_exec/index.html
chmod 644 usr/share/cockpit/scheduling_exec/index.js

# Verificar se o manifest.json tem a estrutura correta
echo "Verificando manifest.json..."
if ! grep -q '"menu"' usr/share/cockpit/scheduling_exec/manifest.json; then
    echo "AVISO: manifest.json não contém campo 'menu' - o módulo pode não aparecer no menu!"
fi

# Criar o pacote via staging (em FS com permissões Unix reais)
echo "Criando pacote .deb (staging)..."
VERSION=$(grep -oP '^Version: \K.*' DEBIAN/control)
mkdir -p build

STAGE_DIR=$(mktemp -d 2>/dev/null || mktemp -d -t cockpit-scheduling-exec)
trap 'rm -rf "$STAGE_DIR"' EXIT
PKGROOT="$STAGE_DIR/pkgroot"
mkdir -p "$PKGROOT/DEBIAN" "$PKGROOT/usr"

if command -v rsync &> /dev/null; then
    rsync -a DEBIAN/ "$PKGROOT/DEBIAN/"
    rsync -a usr/ "$PKGROOT/usr/"
else
    cp -r DEBIAN/* "$PKGROOT/DEBIAN/"
    cp -r usr/* "$PKGROOT/usr/"
fi

# dpkg-deb exige permissões específicas em PKGROOT/DEBIAN
chmod 0755 "$PKGROOT" "$PKGROOT/DEBIAN" 2>/dev/null || true
chmod 0644 "$PKGROOT/DEBIAN/control" 2>/dev/null || true
for maint_script in preinst postinst prerm postrm; do
    if [ -f "$PKGROOT/DEBIAN/$maint_script" ]; then
        chmod 0755 "$PKGROOT/DEBIAN/$maint_script" 2>/dev/null || true
    fi
done

TMP_DEB="$STAGE_DIR/cockpit-scheduling-exec_${VERSION}_all.deb"
dpkg-deb --build "$PKGROOT" "$TMP_DEB"
cp -f "$TMP_DEB" "build/cockpit-scheduling-exec_${VERSION}_all.deb"

echo ""
echo "================================================"
echo "  Pacote criado com sucesso!"
echo "================================================"
echo ""
echo "Arquivo: build/cockpit-scheduling-exec_${VERSION}_all.deb"
echo ""
echo "Para instalar, execute:"
echo "  sudo apt install ./build/cockpit-scheduling-exec_${VERSION}_all.deb"
echo ""
echo "Ou:"
echo "  sudo dpkg -i build/cockpit-scheduling-exec_${VERSION}_all.deb"
echo "  sudo apt-get install -f"
echo ""

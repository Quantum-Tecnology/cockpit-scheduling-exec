#!/bin/bash
# Script de instalação do Gerenciador de Backups para Cockpit
# Uso: sudo ./install-backup-manager.sh

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funções de log
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

log_error() {
    echo -e "${RED}[✗]${NC} $1"
}

# Verificar se está rodando como root
if [ "$EUID" -ne 0 ]; then
    log_error "Este script deve ser executado como root"
    log_info "Execute: sudo $0"
    exit 1
fi

echo "╔════════════════════════════════════════════════════════════╗"
echo "║     Instalador do Gerenciador de Backups - Cockpit        ║"
echo "║                     Versão 1.0.0                           ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Diretórios
COCKPIT_DIR="/usr/share/cockpit/scheduling_exec"
SCRIPTS_DIR="$COCKPIT_DIR/scripts/backup"
CURRENT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

log_info "Verificando pré-requisitos..."

# Verificar se o Cockpit está instalado
if ! command -v cockpit-bridge &> /dev/null; then
    log_error "Cockpit não está instalado"
    log_info "Instale o Cockpit com: sudo apt-get install cockpit"
    exit 1
fi
log_success "Cockpit instalado"

# Verificar se o módulo scheduling_exec existe
if [ ! -d "$COCKPIT_DIR" ]; then
    log_error "Módulo scheduling_exec não encontrado em $COCKPIT_DIR"
    log_info "Este módulo requer o scheduling_exec para funcionar"
    exit 1
fi
log_success "Módulo scheduling_exec encontrado"

# Verificar dependências opcionais
log_info "Verificando dependências opcionais..."

if ! command -v mail &> /dev/null && ! command -v mailx &> /dev/null; then
    log_warning "mailutils não está instalado (necessário para envio de emails)"
    read -p "Deseja instalar mailutils agora? (s/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Ss]$ ]]; then
        log_info "Instalando mailutils..."
        apt-get update -qq
        apt-get install -y mailutils
        log_success "mailutils instalado"
    else
        log_warning "Funcionalidade de email não estará disponível"
    fi
else
    log_success "mailutils instalado"
fi

if ! command -v zenity &> /dev/null; then
    log_warning "zenity não está instalado (opcional para seleção visual de diretórios)"
    read -p "Deseja instalar zenity agora? (s/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Ss]$ ]]; then
        log_info "Instalando zenity..."
        apt-get update -qq
        apt-get install -y zenity
        log_success "zenity instalado"
    else
        log_warning "Seleção visual de diretórios não estará disponível"
    fi
else
    log_success "zenity instalado"
fi

# Criar backup do manifest.json original
log_info "Criando backup do manifest.json..."
if [ -f "$COCKPIT_DIR/manifest.json" ]; then
    cp "$COCKPIT_DIR/manifest.json" "$COCKPIT_DIR/manifest.json.backup.$(date +%Y%m%d_%H%M%S)"
    log_success "Backup criado"
fi

# Copiar arquivos HTML e JS
log_info "Instalando arquivos do módulo..."

if [ -f "$CURRENT_DIR/../usr/share/cockpit/scheduling_exec/backup-manager.html" ]; then
    cp "$CURRENT_DIR/../usr/share/cockpit/scheduling_exec/backup-manager.html" "$COCKPIT_DIR/"
    log_success "backup-manager.html copiado"
else
    log_error "Arquivo backup-manager.html não encontrado"
    exit 1
fi

if [ -f "$CURRENT_DIR/../usr/share/cockpit/scheduling_exec/backup-manager.js" ]; then
    cp "$CURRENT_DIR/../usr/share/cockpit/scheduling_exec/backup-manager.js" "$COCKPIT_DIR/"
    log_success "backup-manager.js copiado"
else
    log_error "Arquivo backup-manager.js não encontrado"
    exit 1
fi

# Criar diretório de scripts e copiar
log_info "Instalando scripts de backup..."
mkdir -p "$SCRIPTS_DIR"

SCRIPTS=(
    "send-backup-email.sh"
    "create-backup.sh"
    "restore-backup.sh"
    "verify-backup.sh"
    "cleanup-old-backups.sh"
)

for script in "${SCRIPTS[@]}"; do
    if [ -f "$CURRENT_DIR/../usr/share/cockpit/scheduling_exec/scripts/backup/$script" ]; then
        cp "$CURRENT_DIR/../usr/share/cockpit/scheduling_exec/scripts/backup/$script" "$SCRIPTS_DIR/"
        chmod +x "$SCRIPTS_DIR/$script"
        log_success "$script instalado"
    else
        log_warning "$script não encontrado (opcional)"
    fi
done

# Atualizar manifest.json
log_info "Atualizando manifest.json..."

if [ -f "$CURRENT_DIR/../usr/share/cockpit/scheduling_exec/manifest.json" ]; then
    cp "$CURRENT_DIR/../usr/share/cockpit/scheduling_exec/manifest.json" "$COCKPIT_DIR/"
    log_success "manifest.json atualizado"
else
    log_warning "manifest.json não encontrado, atualize manualmente"
fi

# Ajustar permissões
log_info "Ajustando permissões..."
chown -R root:root "$COCKPIT_DIR"
chmod 644 "$COCKPIT_DIR/backup-manager.html"
chmod 644 "$COCKPIT_DIR/backup-manager.js"
chmod 755 "$SCRIPTS_DIR"
chmod +x "$SCRIPTS_DIR"/*.sh 2>/dev/null || true
log_success "Permissões ajustadas"

# Verificar se o Cockpit está rodando
log_info "Verificando status do Cockpit..."
if systemctl is-active --quiet cockpit.socket; then
    log_success "Cockpit está ativo"

    read -p "Deseja reiniciar o Cockpit agora? (s/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Ss]$ ]]; then
        log_info "Reiniciando Cockpit..."
        systemctl restart cockpit.socket
        log_success "Cockpit reiniciado"
    else
        log_warning "Lembre-se de reiniciar o Cockpit: sudo systemctl restart cockpit.socket"
    fi
else
    log_warning "Cockpit não está ativo"
    read -p "Deseja iniciar o Cockpit agora? (s/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Ss]$ ]]; then
        log_info "Iniciando Cockpit..."
        systemctl start cockpit.socket
        systemctl enable cockpit.socket
        log_success "Cockpit iniciado"
    fi
fi

# Informações finais
echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║            Instalação concluída com sucesso! 🎉            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
log_success "Gerenciador de Backups instalado com sucesso!"
echo ""
log_info "Próximos passos:"
echo "  1. Acesse o Cockpit: https://$(hostname):9090"
echo "  2. Faça login com suas credenciais"
echo "  3. Navegue até 'Gerenciador de Backups' no menu"
echo "  4. Configure seus diretórios de backup"
echo ""
log_info "Documentação completa: $CURRENT_DIR/../doc/BACKUP-MANAGER.md"
echo ""

# Mostrar informações sobre configuração de email
log_info "Configuração de Email:"
echo "  Para habilitar o envio de emails, configure o postfix ou sendmail:"
echo "  $ sudo dpkg-reconfigure postfix"
echo ""
echo "  Teste o envio de email:"
echo "  $ echo 'Teste' | mail -s 'Assunto' seu@email.com"
echo ""

# Criar diretório de configuração para o usuário atual
if [ -n "$SUDO_USER" ]; then
    USER_HOME=$(getent passwd "$SUDO_USER" | cut -d: -f6)
    log_info "Criando diretório de configuração para $SUDO_USER..."
    sudo -u "$SUDO_USER" mkdir -p "$USER_HOME/.backup-manager"
    log_success "Diretório criado: $USER_HOME/.backup-manager"
fi

log_success "Instalação finalizada!"
exit 0

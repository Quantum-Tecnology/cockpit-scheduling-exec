#!/bin/bash
# Script de utilidades para CI/CD
# Use este script para tarefas comuns de release e build

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para imprimir mensagens coloridas
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Função para obter versão atual
get_current_version() {
    grep -oP '^Version: \K.*' DEBIAN/control
}

# Função para validar formato de versão
validate_version() {
    if [[ ! $1 =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
        print_error "Formato de versão inválido: $1"
        print_info "Use formato: X.Y.Z (ex: 1.0.1)"
        exit 1
    fi
}

# Função para verificar se há mudanças não commitadas
check_clean_working_tree() {
    if ! git diff-index --quiet HEAD --; then
        print_warning "Há mudanças não commitadas"
        git status --short
        read -p "Continuar mesmo assim? (s/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Ss]$ ]]; then
            exit 1
        fi
    fi
}

# Função para build local
build_local() {
    print_info "Construindo pacote localmente..."

    if [ ! -x build.sh ]; then
        chmod +x build.sh
    fi

    ./build.sh

    print_success "Pacote construído com sucesso!"
    ls -lh ../cockpit-scheduling-exec*.deb
}

# Função para criar release
create_release() {
    local version=$1

    print_info "Criando release v$version..."

    # Validar versão
    validate_version "$version"

    # Verificar working tree
    check_clean_working_tree

    # Atualizar DEBIAN/control
    print_info "Atualizando DEBIAN/control..."
    sed -i "s/^Version: .*/Version: $version/" DEBIAN/control

    # Verificar se CHANGELOG foi atualizado
    if ! grep -q "\[$version\]" CHANGELOG.md; then
        print_warning "CHANGELOG.md não contém versão $version"
        print_info "Atualize CHANGELOG.md antes de continuar"
        exit 1
    fi

    # Commit mudanças
    print_info "Fazendo commit das mudanças..."
    git add DEBIAN/control
    git commit -m "Release: Version $version"

    # Criar tag
    print_info "Criando tag v$version..."
    git tag -a "v$version" -m "Release version $version"

    # Push
    print_info "Enviando mudanças para repositório..."
    git push origin main

    print_info "Enviando tag..."
    git push origin "v$version"

    print_success "Release v$version criada!"
    print_info "GitHub Actions criará a release automaticamente"
    print_info "Acompanhe em: https://github.com/QuantumTecnology/cockpit-scheduling-exec/actions"
}

# Função para listar releases
list_releases() {
    print_info "Releases disponíveis:"
    git tag -l "v*" | sort -V
}

# Função para verificar status de workflows
check_workflows() {
    print_info "Verificando workflows no GitHub..."

    if command -v gh &> /dev/null; then
        gh run list --limit 5
    else
        print_warning "GitHub CLI (gh) não instalado"
        print_info "Instale com: sudo apt install gh"
        print_info "Ou visite: https://github.com/QuantumTecnology/cockpit-scheduling-exec/actions"
    fi
}

# Função para testar instalação local
test_install() {
    print_info "Testando instalação local..."

    # Build primeiro
    if [ ! -f ../cockpit-scheduling-exec*.deb ]; then
        build_local
    fi

    # Instalar
    print_info "Instalando pacote..."
    sudo apt install ../cockpit-scheduling-exec*.deb

    # Verificar instalação
    if [ -d /usr/share/cockpit/scheduling_exec ]; then
        print_success "Plugin instalado com sucesso!"
        print_info "Acesse: https://localhost:9090"
    else
        print_error "Falha na instalação"
        exit 1
    fi
}

# Função para validar estrutura do projeto
validate_structure() {
    print_info "Validando estrutura do projeto..."

    local errors=0

    # Verificar arquivos essenciais
    local required_files=(
        "DEBIAN/control"
        "DEBIAN/postinst"
        "DEBIAN/prerm"
        "usr/share/cockpit/scheduling_exec/manifest.json"
        "usr/share/cockpit/scheduling_exec/index.html"
        "usr/share/cockpit/scheduling_exec/index.js"
    )

    for file in "${required_files[@]}"; do
        if [ ! -f "$file" ]; then
            print_error "Arquivo não encontrado: $file"
            errors=$((errors + 1))
        fi
    done

    # Verificar scripts
    for script in usr/share/cockpit/scheduling_exec/scripts/*.sh; do
        if [ ! -x "$script" ]; then
            print_warning "Script sem permissão de execução: $script"
            chmod +x "$script"
            print_success "Permissão corrigida: $script"
        fi
    done

    if [ $errors -eq 0 ]; then
        print_success "Estrutura válida!"
    else
        print_error "Encontrados $errors erros"
        exit 1
    fi
}

# Menu principal
show_menu() {
    echo ""
    echo "🚀 CI/CD Utilities - Cockpit Scheduling Exec"
    echo "=============================================="
    echo "1) Build local"
    echo "2) Criar nova release"
    echo "3) Listar releases"
    echo "4) Verificar workflows"
    echo "5) Testar instalação"
    echo "6) Validar estrutura"
    echo "7) Ver versão atual"
    echo "0) Sair"
    echo ""
}

# Main
main() {
    # Verificar se está no diretório correto
    if [ ! -f "DEBIAN/control" ]; then
        print_error "Execute este script no diretório raiz do projeto"
        exit 1
    fi

    # Se há argumentos, executar comando direto
    if [ $# -gt 0 ]; then
        case $1 in
            build)
                build_local
                ;;
            release)
                if [ -z "$2" ]; then
                    print_error "Versão não fornecida"
                    print_info "Uso: $0 release 1.0.1"
                    exit 1
                fi
                create_release "$2"
                ;;
            list)
                list_releases
                ;;
            workflows)
                check_workflows
                ;;
            test)
                test_install
                ;;
            validate)
                validate_structure
                ;;
            version)
                print_info "Versão atual: $(get_current_version)"
                ;;
            *)
                print_error "Comando desconhecido: $1"
                print_info "Comandos: build, release, list, workflows, test, validate, version"
                exit 1
                ;;
        esac
        exit 0
    fi

    # Menu interativo
    while true; do
        show_menu
        read -p "Escolha uma opção: " choice

        case $choice in
            1)
                build_local
                ;;
            2)
                read -p "Digite a versão (ex: 1.0.1): " version
                create_release "$version"
                ;;
            3)
                list_releases
                ;;
            4)
                check_workflows
                ;;
            5)
                test_install
                ;;
            6)
                validate_structure
                ;;
            7)
                print_info "Versão atual: $(get_current_version)"
                ;;
            0)
                print_info "Saindo..."
                exit 0
                ;;
            *)
                print_error "Opção inválida"
                ;;
        esac

        echo ""
        read -p "Pressione Enter para continuar..."
    done
}

# Executar
main "$@"

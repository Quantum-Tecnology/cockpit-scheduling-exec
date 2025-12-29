#!/bin/bash
# Script de diagnóstico para VMs
# Ajuda a identificar problemas com descoberta de VMs

echo "========================================="
echo "🔍 DIAGNÓSTICO DE VMs - Cockpit Backup"
echo "========================================="
echo ""

# 1. Verificar virsh
echo "1️⃣  Verificando virsh..."
if command -v virsh &> /dev/null; then
    echo "   ✅ virsh instalado: $(which virsh)"
    echo "   Versão: $(virsh --version 2>/dev/null || echo 'N/A')"
else
    echo "   ❌ virsh NÃO instalado"
    echo "   Instale com: sudo apt-get install libvirt-clients"
    exit 1
fi
echo ""

# 2. Verificar libvirtd
echo "2️⃣  Verificando serviço libvirtd..."
if systemctl is-active --quiet libvirtd 2>/dev/null; then
    echo "   ✅ libvirtd está rodando"
elif systemctl is-active --quiet virtqemud 2>/dev/null; then
    echo "   ✅ virtqemud está rodando (novo sistema modular)"
else
    echo "   ⚠️  libvirtd/virtqemud não está rodando"
    echo "   Inicie com: sudo systemctl start libvirtd"
fi
echo ""

# 3. Testar conexões
echo "3️⃣  Testando conexões libvirt..."

echo "   📡 qemu:///system"
if virsh -c qemu:///system list --all &>/dev/null; then
    vm_count=$(virsh -c qemu:///system list --all --name | grep -v '^$' | wc -l)
    echo "      ✅ Conectado - $vm_count VM(s) encontrada(s)"
    virsh -c qemu:///system list --all | sed 's/^/         /'
else
    echo "      ❌ Falha na conexão"
fi
echo ""

echo "   📡 qemu:///session"
if virsh -c qemu:///session list --all &>/dev/null; then
    vm_count=$(virsh -c qemu:///session list --all --name | grep -v '^$' | wc -l)
    echo "      ✅ Conectado - $vm_count VM(s) encontrada(s)"
    virsh -c qemu:///session list --all | sed 's/^/         /'
else
    echo "      ❌ Falha na conexão"
fi
echo ""

echo "   📡 Padrão (sem URI)"
if virsh list --all &>/dev/null; then
    vm_count=$(virsh list --all --name | grep -v '^$' | wc -l)
    echo "      ✅ Conectado - $vm_count VM(s) encontrada(s)"
    virsh list --all | sed 's/^/         /'
else
    echo "      ❌ Falha na conexão"
fi
echo ""

# 4. Listar todas as VMs encontradas
echo "4️⃣  VMs encontradas (todas as conexões)..."
echo ""

all_vms=$(
    {
        virsh -c qemu:///system list --all --name 2>/dev/null | grep -v '^$' | sed 's/^/system:/'
        virsh -c qemu:///session list --all --name 2>/dev/null | grep -v '^$' | sed 's/^/session:/'
        virsh list --all --name 2>/dev/null | grep -v '^$' | sed 's/^/default:/'
    } | sort -u
)

if [ -z "$all_vms" ]; then
    echo "   ❌ Nenhuma VM encontrada em nenhuma conexão"
else
    echo "$all_vms" | while IFS=: read -r connection vm_name; do
        echo "   🖥️  $vm_name (via $connection)"
    done
fi
echo ""

# 5. Testar script discover-vms.sh
echo "5️⃣  Testando script discover-vms.sh..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ -f "$SCRIPT_DIR/discover-vms.sh" ]; then
    echo "   Script encontrado: $SCRIPT_DIR/discover-vms.sh"
    echo ""
    echo "   🔍 Executando com DEBUG..."
    echo "   ----------------------------------------"
    DEBUG=true "$SCRIPT_DIR/discover-vms.sh" 2>&1 | sed 's/^/   /'
    echo "   ----------------------------------------"
else
    echo "   ❌ Script não encontrado em: $SCRIPT_DIR/discover-vms.sh"
fi
echo ""

# 6. Verificar discos em locais comuns
echo "6️⃣  Procurando discos em locais comuns..."

search_paths=(
    "/var/lib/libvirt/images"
    "/home/libvirt-vms"
    "/mnt/storage"
    "/mnt/nvme_storage"
    "/mnt/*/vms"
)

for path in "${search_paths[@]}"; do
    # Expandir wildcards
    for expanded in $path; do
        if [ -d "$expanded" ]; then
            disk_count=$(find "$expanded" -maxdepth 2 -type f \( -name "*.qcow2" -o -name "*.qcow" -o -name "*.img" \) 2>/dev/null | wc -l)
            if [ "$disk_count" -gt 0 ]; then
                echo "   📁 $expanded - $disk_count disco(s)"
                find "$expanded" -maxdepth 2 -type f \( -name "*.qcow2" -o -name "*.qcow" -o -name "*.img" \) 2>/dev/null | while read -r disk; do
                    size=$(du -h "$disk" 2>/dev/null | cut -f1)
                    echo "      💿 $(basename "$disk") ($size)"
                done
            else
                echo "   📁 $expanded - nenhum disco encontrado"
            fi
        fi
    done
done
echo ""

# 7. Verificar permissões
echo "7️⃣  Verificando permissões..."
echo "   Usuário atual: $(whoami)"
echo "   Grupos: $(groups)"

if groups | grep -q libvirt; then
    echo "   ✅ Usuário está no grupo 'libvirt'"
else
    echo "   ⚠️  Usuário NÃO está no grupo 'libvirt'"
    echo "   Adicione com: sudo usermod -aG libvirt $(whoami)"
fi

if groups | grep -q kvm; then
    echo "   ✅ Usuário está no grupo 'kvm'"
else
    echo "   ⚠️  Usuário NÃO está no grupo 'kvm'"
    echo "   Adicione com: sudo usermod -aG kvm $(whoami)"
fi
echo ""

# 8. Sugestões
echo "========================================="
echo "💡 SUGESTÕES DE SOLUÇÃO"
echo "========================================="
echo ""

if [ -z "$all_vms" ]; then
    echo "❌ PROBLEMA: Nenhuma VM encontrada"
    echo ""
    echo "Soluções possíveis:"
    echo "  1. Verifique se há VMs criadas:"
    echo "     sudo virsh list --all"
    echo ""
    echo "  2. Verifique se libvirtd está rodando:"
    echo "     sudo systemctl status libvirtd"
    echo ""
    echo "  3. Crie uma VM de teste:"
    echo "     virt-install --help"
    echo ""
else
    echo "✅ VMs encontradas com sucesso!"
    echo ""
    echo "Se o Cockpit ainda não encontra as VMs:"
    echo "  1. Verifique permissões do usuário cockpit"
    echo "  2. Reinicie o serviço cockpit:"
    echo "     sudo systemctl restart cockpit"
    echo ""
    echo "  3. Execute o script manualmente:"
    echo "     sudo $SCRIPT_DIR/discover-vms.sh"
    echo ""
fi

echo "========================================="

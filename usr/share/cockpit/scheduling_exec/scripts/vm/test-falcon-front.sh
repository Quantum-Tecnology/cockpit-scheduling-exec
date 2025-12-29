#!/bin/bash
# Teste rápido para verificar a VM falcon_front

echo "========================================="
echo "🔍 TESTE: VM falcon_front"
echo "========================================="
echo ""

# 1. Verificar se a VM existe
echo "1️⃣  Verificando se VM 'falcon_front' existe..."
if sudo virsh dominfo falcon_front &>/dev/null; then
    echo "   ✅ VM 'falcon_front' encontrada"
    sudo virsh dominfo falcon_front | grep -E "(Name|State|CPU|Memory)" | sed 's/^/   /'
else
    echo "   ❌ VM 'falcon_front' NÃO encontrada"
    echo ""
    echo "   VMs disponíveis:"
    sudo virsh list --all | sed 's/^/   /'
    exit 1
fi
echo ""

# 2. Verificar discos da VM
echo "2️⃣  Verificando discos da VM falcon_front..."
echo ""
sudo virsh domblklist falcon_front --details | sed 's/^/   /'
echo ""

# 3. Verificar se o disco /mnt/nvme_storage/front-vm.qcow2 existe
echo "3️⃣  Verificando disco físico..."
DISK_PATH="/mnt/nvme_storage/front-vm.qcow2"

if [ -f "$DISK_PATH" ]; then
    echo "   ✅ Disco encontrado: $DISK_PATH"
    echo "   Tamanho: $(du -h "$DISK_PATH" | cut -f1)"
    echo "   Permissões: $(ls -lh "$DISK_PATH" | awk '{print $1, $3, $4}')"
else
    echo "   ❌ Disco NÃO encontrado: $DISK_PATH"
    echo ""
    echo "   Procurando em /mnt/nvme_storage/..."
    ls -lh /mnt/nvme_storage/*.qcow2 2>/dev/null | sed 's/^/   /' || echo "   Nenhum arquivo .qcow2 encontrado"
fi
echo ""

# 4. Testar script de descoberta
echo "4️⃣  Testando script discover-vms.sh..."
SCRIPT_DIR="/usr/share/cockpit/scheduling_exec/scripts/vm"

if [ -f "$SCRIPT_DIR/discover-vms.sh" ]; then
    echo ""
    echo "   Executando com DEBUG=true..."
    echo "   ----------------------------------------"
    DEBUG=true sudo bash "$SCRIPT_DIR/discover-vms.sh" 2>&1
    echo "   ----------------------------------------"
else
    echo "   ❌ Script não encontrado: $SCRIPT_DIR/discover-vms.sh"
fi
echo ""

# 5. Verificar JSON da VM
echo "5️⃣  Verificando JSON da VM falcon_front..."
if command -v jq &>/dev/null; then
    sudo bash "$SCRIPT_DIR/discover-vms.sh" 2>/dev/null | jq '.[] | select(.name=="falcon_front")'
else
    echo "   ⚠️  jq não instalado, mostrando JSON bruto:"
    sudo bash "$SCRIPT_DIR/discover-vms.sh" 2>/dev/null | grep -A 5 "falcon_front"
fi
echo ""

echo "========================================="
echo "✅ TESTE CONCLUÍDO"
echo "========================================="

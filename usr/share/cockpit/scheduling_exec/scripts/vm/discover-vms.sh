#!/bin/bash
# Script para descobrir VMs e seus discos
# Retorna JSON com informações detalhadas

set -euo pipefail

# Verificar se virsh está instalado
if ! command -v virsh &> /dev/null; then
    echo '{"error":"virsh não encontrado. Instale o libvirt-clients"}'
    exit 1
fi

# Array para armazenar VMs
declare -a vms_json=()

# Locais comuns para procurar discos qcow2
COMMON_PATHS=(
    "/var/lib/libvirt/images"
    "/home/libvirt-vms"
    "/mnt/*/libvirt"
    "/mnt/*/vms"
)

# Função para obter tamanho de arquivo
get_file_size() {
    local file="$1"
    if [ -f "$file" ]; then
        stat -c%s "$file" 2>/dev/null || echo "0"
    else
        echo "0"
    fi
}

# Função para determinar tipo do disco
get_disk_type() {
    local file="$1"
    case "${file##*.}" in
        qcow2) echo "qcow2" ;;
        qcow) echo "qcow" ;;
        raw) echo "raw" ;;
        img) echo "raw" ;;
        vmdk) echo "vmdk" ;;
        vdi) echo "vdi" ;;
        *) echo "unknown" ;;
    esac
}

# Listar todas as VMs
vm_list=$(virsh list --all --name 2>/dev/null || echo "")

if [ -z "$vm_list" ]; then
    echo "[]"
    exit 0
fi

# Processar cada VM
while IFS= read -r vm_name; do
    [ -z "$vm_name" ] && continue

    # Obter status da VM
    vm_state=$(virsh domstate "$vm_name" 2>/dev/null || echo "unknown")

    # Normalizar status
    case "$vm_state" in
        "running"|"em execução") status="running" ;;
        "shut off"|"desligado") status="stopped" ;;
        "paused"|"pausado") status="paused" ;;
        *) status="unknown" ;;
    esac

    # Array para discos desta VM
    declare -a disks_json=()
    total_size=0

    # Obter discos da VM usando virsh domblklist
    disk_list=$(virsh domblklist "$vm_name" --details 2>/dev/null || echo "")

    if [ -n "$disk_list" ]; then
        while IFS= read -r line; do
            # Pular cabeçalhos
            [[ "$line" =~ ^(Type|----) ]] && continue
            [ -z "$line" ] && continue

            # Extrair path do disco (última coluna)
            disk_path=$(echo "$line" | awk '{print $NF}')

            # Verificar se é um caminho válido
            if [ -f "$disk_path" ]; then
                disk_size=$(get_file_size "$disk_path")
                disk_type=$(get_disk_type "$disk_path")

                disks_json+=("{\"path\":\"$disk_path\",\"size\":$disk_size,\"type\":\"$disk_type\"}")
                total_size=$((total_size + disk_size))
            fi
        done <<< "$disk_list"
    fi

    # Se não encontrou discos via virsh, procurar em locais comuns
    if [ ${#disks_json[@]} -eq 0 ]; then
        for base_path in "${COMMON_PATHS[@]}"; do
            # Expandir wildcards
            for search_path in $base_path; do
                if [ -d "$search_path" ]; then
                    # Procurar por arquivos com nome da VM
                    while IFS= read -r disk_file; do
                        [ -z "$disk_file" ] && continue
                        [ ! -f "$disk_file" ] && continue

                        disk_size=$(get_file_size "$disk_file")
                        disk_type=$(get_disk_type "$disk_file")

                        disks_json+=("{\"path\":\"$disk_file\",\"size\":$disk_size,\"type\":\"$disk_type\"}")
                        total_size=$((total_size + disk_size))
                    done < <(find "$search_path" -maxdepth 2 -type f \( -name "*${vm_name}*.qcow2" -o -name "*${vm_name}*.qcow" -o -name "*${vm_name}*.img" \) 2>/dev/null || true)
                fi
            done
        done
    fi

    # Montar JSON da VM
    disks_array=$(IFS=,; echo "[${disks_json[*]}]")
    vm_json="{\"name\":\"$vm_name\",\"status\":\"$status\",\"disks\":$disks_array,\"total_size\":$total_size}"
    vms_json+=("$vm_json")

done <<< "$vm_list"

# Retornar JSON final
result=$(IFS=,; echo "[${vms_json[*]}]")
echo "$result"

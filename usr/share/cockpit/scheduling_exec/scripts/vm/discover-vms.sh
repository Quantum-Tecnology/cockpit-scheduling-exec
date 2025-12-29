#!/bin/bash
# Script para descobrir VMs e seus discos
# Retorna JSON com informações detalhadas

set -euo pipefail

# Debug mode (set via environment)
DEBUG=${DEBUG:-false}

debug_log() {
    if [ "$DEBUG" = "true" ]; then
        echo "[DEBUG] $*" >&2
    fi
}

# Verificar se virsh está instalado
if ! command -v virsh &> /dev/null; then
    echo '{"error":"virsh não encontrado. Instale o libvirt-clients"}'
    exit 1
fi

debug_log "virsh encontrado: $(which virsh)"

# Array para armazenar VMs
declare -a vms_json=()

# Conexões libvirt para tentar
LIBVIRT_URIS=(
    "qemu:///system"
    "qemu:///session"
    ""
)

# Locais comuns para procurar discos qcow2
COMMON_PATHS=(
    "/var/lib/libvirt/images"
    "/home/libvirt-vms"
    "/mnt/nvme_storage"
    "/mnt/storage"
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

# Tentar diferentes conexões libvirt
vm_list=""
for uri in "${LIBVIRT_URIS[@]}"; do
    debug_log "Tentando conexão: ${uri:-default}"

    if [ -n "$uri" ]; then
        temp_list=$(virsh -c "$uri" list --all --name 2>/dev/null || echo "")
    else
        temp_list=$(virsh list --all --name 2>/dev/null || echo "")
    fi

    if [ -n "$temp_list" ]; then
        debug_log "VMs encontradas com ${uri:-default}: $(echo "$temp_list" | wc -l) VM(s)"
        vm_list="$temp_list"
        WORKING_URI="$uri"
        break
    fi
done

if [ -z "$vm_list" ]; then
    debug_log "Nenhuma VM encontrada em nenhuma conexão"
    echo "[]"
    exit 0
fi

debug_log "Usando conexão: ${WORKING_URI:-default}"

# Processar cada VM
while IFS= read -r vm_name; do
    [ -z "$vm_name" ] && continue

    debug_log "Processando VM: $vm_name"

    # Obter status da VM
    if [ -n "${WORKING_URI:-}" ]; then
        vm_state=$(virsh -c "$WORKING_URI" domstate "$vm_name" 2>/dev/null || echo "unknown")
    else
        vm_state=$(virsh domstate "$vm_name" 2>/dev/null || echo "unknown")
    fi

    debug_log "  Status: $vm_state"

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
    if [ -n "${WORKING_URI:-}" ]; then
        disk_list=$(virsh -c "$WORKING_URI" domblklist "$vm_name" --details 2>/dev/null || echo "")
    else
        disk_list=$(virsh domblklist "$vm_name" --details 2>/dev/null || echo "")
    fi

    debug_log "  Output virsh domblklist:"
    if [ "$DEBUG" = "true" ] && [ -n "$disk_list" ]; then
        echo "$disk_list" | while IFS= read -r line; do
            debug_log "    $line"
        done
    fi

    disk_count=$(echo "$disk_list" | grep -v '^Type' | grep -v '^----' | grep -v '^$' | wc -l)
    debug_log "  Discos via virsh: $disk_count encontrado(s)"

    if [ -n "$disk_list" ]; then
        while IFS= read -r line; do
            # Pular cabeçalhos e linhas vazias
            [[ "$line" =~ ^(Type|----) ]] && continue
            [ -z "$line" ] && continue

            # Extrair path do disco (pode ser última coluna ou segunda coluna dependendo do formato)
            # Formato: Type Device Target Source
            disk_path=$(echo "$line" | awk '{print $NF}')

            # Se não começar com /, tentar segunda coluna
            if [[ ! "$disk_path" =~ ^/ ]]; then
                disk_path=$(echo "$line" | awk '{print $2}')
            fi

            debug_log "    Analisando: $disk_path"

            # Verificar se é um caminho válido e arquivo existe
            if [ -n "$disk_path" ] && [[ "$disk_path" =~ ^/ ]] && [ -f "$disk_path" ]; then
                disk_size=$(get_file_size "$disk_path")
                disk_type=$(get_disk_type "$disk_path")

                debug_log "      ✅ Disco encontrado: $disk_path ($(numfmt --to=iec-i --suffix=B "$disk_size" 2>/dev/null))"
                disks_json+=("{\"path\":\"$disk_path\",\"size\":$disk_size,\"type\":\"$disk_type\"}")
                total_size=$((total_size + disk_size))
            else
                debug_log "      ❌ Disco não acessível: $disk_path"
            fi
        done <<< "$disk_list"
    fi

    # Se não encontrou discos via virsh, procurar em locais comuns
    if [ ${#disks_json[@]} -eq 0 ]; then
        debug_log "  Nenhum disco encontrado via virsh, procurando em locais comuns..."

        for base_path in "${COMMON_PATHS[@]}"; do
            # Expandir wildcards
            for search_path in $base_path; do
                if [ -d "$search_path" ]; then
                    debug_log "    Procurando em: $search_path"

                    # Procurar por arquivos com nome da VM ou qualquer .qcow2
                    while IFS= read -r disk_file; do
                        [ -z "$disk_file" ] && continue
                        [ ! -f "$disk_file" ] && continue

                        disk_size=$(get_file_size "$disk_file")
                        disk_type=$(get_disk_type "$disk_file")

                        debug_log "      ✅ Disco encontrado: $disk_file ($(numfmt --to=iec-i --suffix=B "$disk_size" 2>/dev/null))"
                        disks_json+=("{\"path\":\"$disk_file\",\"size\":$disk_size,\"type\":\"$disk_type\"}")
                        total_size=$((total_size + disk_size))
                    done < <(
                        # Buscar com nome da VM
                        find "$search_path" -maxdepth 2 -type f \( \
                            -name "*${vm_name}*.qcow2" -o \
                            -name "*${vm_name}*.qcow" -o \
                            -name "*${vm_name}*.img" -o \
                            -name "*${vm_name}*.vmdk" -o \
                            -name "*${vm_name}*.vdi" \
                        \) 2>/dev/null || true
                    )
                fi
            done
        done

        debug_log "  Total de discos encontrados: ${#disks_json[@]}"
    fi

    # Montar JSON da VM
    disks_array=$(IFS=,; echo "[${disks_json[*]}]")
    vm_json="{\"name\":\"$vm_name\",\"status\":\"$status\",\"disks\":$disks_array,\"total_size\":$total_size}"
    vms_json+=("$vm_json")

done <<< "$vm_list"

# Retornar JSON final
result=$(IFS=,; echo "[${vms_json[*]}]")
echo "$result"

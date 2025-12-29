#!/bin/bash
# Script para fazer backup de múltiplas VMs
# Uso: backup-all-vms.sh <SELECTED_VMS> <DEST_DIR> <RETENTION_DAYS> <VERIFY_CHECKSUM>

set -euo pipefail

# Parâmetros
SELECTED_VMS="${1:-}"
DEST_DIR="${2:-/mnt/storage/backups/vm_backups}"
RETENTION_DAYS="${3:-7}"
VERIFY_CHECKSUM="${4:-false}"

# Diretório do script
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Validação
if [ -z "$SELECTED_VMS" ]; then
    echo '{"success":false,"error":"Nenhuma VM selecionada"}'
    exit 1
fi

# Converter vírgulas em array
IFS=',' read -ra VM_ARRAY <<< "$SELECTED_VMS"

# Criar diretório de destino
mkdir -p "$DEST_DIR" 2>/dev/null || {
    echo "{\"success\":false,\"error\":\"Não foi possível criar diretório: $DEST_DIR\"}"
    exit 1
}

# Estatísticas
TOTAL_VMS=${#VM_ARRAY[@]}
SUCCESS_COUNT=0
FAILED_COUNT=0
TOTAL_SIZE=0
TOTAL_DURATION=0

# Array para logs
declare -a BACKUP_LOGS=()

echo "========================================" >&2
echo "Backup de VMs Iniciado" >&2
echo "Data/Hora: $(date '+%Y-%m-%d %H:%M:%S')" >&2
echo "Total de VMs: $TOTAL_VMS" >&2
echo "Destino: $DEST_DIR" >&2
echo "Retenção: $RETENTION_DAYS dias" >&2
echo "Verificar Checksum: $VERIFY_CHECKSUM" >&2
echo "========================================" >&2
echo "" >&2

# Descobrir VMs e seus discos
echo "Descobrindo discos das VMs..." >&2
VMS_INFO=$("$SCRIPT_DIR/discover-vms.sh" 2>/dev/null || echo "[]")

# Processar cada VM selecionada
for vm_name in "${VM_ARRAY[@]}"; do
    vm_name=$(echo "$vm_name" | xargs) # trim
    [ -z "$vm_name" ] && continue

    echo "----------------------------------------" >&2
    echo "Processando VM: $vm_name" >&2
    echo "----------------------------------------" >&2

    # Encontrar informações da VM no JSON
    vm_data=$(echo "$VMS_INFO" | jq -r ".[] | select(.name==\"$vm_name\")" 2>/dev/null || echo "")

    if [ -z "$vm_data" ]; then
        echo "⚠️  VM $vm_name não encontrada" >&2
        BACKUP_LOGS+=("{\"vm\":\"$vm_name\",\"status\":\"error\",\"message\":\"VM não encontrada\"}")
        FAILED_COUNT=$((FAILED_COUNT + 1))
        continue
    fi

    # Obter discos da VM
    disk_count=$(echo "$vm_data" | jq -r '.disks | length' 2>/dev/null || echo "0")

    if [ "$disk_count" -eq 0 ]; then
        echo "⚠️  Nenhum disco encontrado para VM $vm_name" >&2
        BACKUP_LOGS+=("{\"vm\":\"$vm_name\",\"status\":\"error\",\"message\":\"Nenhum disco encontrado\"}")
        FAILED_COUNT=$((FAILED_COUNT + 1))
        continue
    fi

    echo "Discos encontrados: $disk_count" >&2

    # Backup de cada disco
    vm_success=true
    vm_total_size=0
    vm_duration=0

    for i in $(seq 0 $((disk_count - 1))); do
        disk_path=$(echo "$vm_data" | jq -r ".disks[$i].path" 2>/dev/null)
        disk_size=$(echo "$vm_data" | jq -r ".disks[$i].size" 2>/dev/null)

        if [ -z "$disk_path" ] || [ "$disk_path" = "null" ]; then
            continue
        fi

        echo "  📀 Disco $((i + 1)): $disk_path" >&2
        echo "     Tamanho: $(numfmt --to=iec-i --suffix=B "$disk_size" 2>/dev/null || echo "$disk_size bytes")" >&2

        # Executar backup do disco
        backup_result=$("$SCRIPT_DIR/backup-vm.sh" "$vm_name" "$disk_path" "$DEST_DIR" "$VERIFY_CHECKSUM" 2>&1 || echo '{"success":false}')

        # Processar resultado
        backup_success=$(echo "$backup_result" | tail -1 | jq -r '.success' 2>/dev/null || echo "false")

        if [ "$backup_success" = "true" ]; then
            backup_size=$(echo "$backup_result" | tail -1 | jq -r '.size' 2>/dev/null || echo "0")
            backup_duration=$(echo "$backup_result" | tail -1 | jq -r '.duration' 2>/dev/null || echo "0")
            backup_path=$(echo "$backup_result" | tail -1 | jq -r '.backup_path' 2>/dev/null || echo "")

            vm_total_size=$((vm_total_size + backup_size))
            vm_duration=$((vm_duration + backup_duration))

            echo "     ✅ Backup concluído: $backup_path" >&2
            echo "     ⏱️  Tempo: ${backup_duration}s" >&2
        else
            backup_error=$(echo "$backup_result" | tail -1 | jq -r '.error' 2>/dev/null || echo "Erro desconhecido")
            echo "     ❌ Falha: $backup_error" >&2
            vm_success=false
        fi
    done

    # Registrar resultado da VM
    if [ "$vm_success" = true ]; then
        echo "✅ VM $vm_name: Backup concluído com sucesso" >&2
        BACKUP_LOGS+=("{\"vm\":\"$vm_name\",\"status\":\"success\",\"size\":$vm_total_size,\"duration\":$vm_duration,\"disks\":$disk_count}")
        SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
        TOTAL_SIZE=$((TOTAL_SIZE + vm_total_size))
        TOTAL_DURATION=$((TOTAL_DURATION + vm_duration))
    else
        echo "❌ VM $vm_name: Falha no backup" >&2
        BACKUP_LOGS+=("{\"vm\":\"$vm_name\",\"status\":\"partial\",\"message\":\"Alguns discos falharam\"}")
        FAILED_COUNT=$((FAILED_COUNT + 1))
    fi

    echo "" >&2
done

# Limpar backups antigos
echo "========================================" >&2
echo "Limpando backups antigos (>$RETENTION_DAYS dias)..." >&2

DELETED_COUNT=0
DELETED_SIZE=0

if [ "$RETENTION_DAYS" -gt 0 ]; then
    while IFS= read -r old_file; do
        [ -z "$old_file" ] && continue
        file_size=$(stat -c%s "$old_file" 2>/dev/null || echo "0")
        rm -f "$old_file" && {
            DELETED_COUNT=$((DELETED_COUNT + 1))
            DELETED_SIZE=$((DELETED_SIZE + file_size))
            echo "  🗑️  Removido: $(basename "$old_file")" >&2
        }
    done < <(find "$DEST_DIR" -type f -mtime +"$RETENTION_DAYS" 2>/dev/null || true)

    echo "Arquivos removidos: $DELETED_COUNT ($(numfmt --to=iec-i --suffix=B "$DELETED_SIZE" 2>/dev/null || echo "$DELETED_SIZE bytes"))" >&2
else
    echo "Limpeza desabilitada (retenção = 0)" >&2
fi

echo "========================================" >&2

# Resumo final
echo "" >&2
echo "========================================" >&2
echo "RESUMO DO BACKUP" >&2
echo "========================================" >&2
echo "Total de VMs: $TOTAL_VMS" >&2
echo "Sucesso: $SUCCESS_COUNT" >&2
echo "Falhas: $FAILED_COUNT" >&2
echo "Tamanho total: $(numfmt --to=iec-i --suffix=B "$TOTAL_SIZE" 2>/dev/null || echo "$TOTAL_SIZE bytes")" >&2
echo "Tempo total: ${TOTAL_DURATION}s" >&2
echo "Arquivos antigos removidos: $DELETED_COUNT" >&2
echo "========================================" >&2

# Retornar JSON
logs_array=$(IFS=,; echo "[${BACKUP_LOGS[*]}]")
cat <<EOF
{
  "success": true,
  "summary": {
    "total_vms": $TOTAL_VMS,
    "success_count": $SUCCESS_COUNT,
    "failed_count": $FAILED_COUNT,
    "total_size": $TOTAL_SIZE,
    "total_duration": $TOTAL_DURATION,
    "deleted_count": $DELETED_COUNT,
    "deleted_size": $DELETED_SIZE
  },
  "logs": $logs_array
}
EOF

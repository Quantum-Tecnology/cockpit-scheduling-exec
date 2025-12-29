#!/bin/bash
# Script para fazer backup de disco de VM individual
# Uso: backup-vm.sh <VM_NAME> <DISK_PATH> <DEST_DIR> <VERIFY_CHECKSUM>

set -euo pipefail

# Parâmetros
VM_NAME="${1:-}"
DISK_PATH="${2:-}"
DEST_DIR="${3:-}"
VERIFY_CHECKSUM="${4:-false}"

# Validação de parâmetros
if [ -z "$VM_NAME" ] || [ -z "$DISK_PATH" ] || [ -z "$DEST_DIR" ]; then
    echo '{"success":false,"error":"Parâmetros obrigatórios: VM_NAME DISK_PATH DEST_DIR"}'
    exit 1
fi

# Verificar se arquivo de disco existe
if [ ! -f "$DISK_PATH" ]; then
    echo "{\"success\":false,\"error\":\"Disco não encontrado: $DISK_PATH\"}"
    exit 1
fi

# Criar diretório de destino se não existir
mkdir -p "$DEST_DIR" 2>/dev/null || {
    echo "{\"success\":false,\"error\":\"Não foi possível criar diretório: $DEST_DIR\"}"
    exit 1
}

# Verificar espaço em disco
DISK_SIZE=$(stat -c%s "$DISK_PATH")
AVAILABLE_SPACE=$(df -B1 --output=avail "$DEST_DIR" | tail -1)

if [ "$AVAILABLE_SPACE" -lt "$DISK_SIZE" ]; then
    DISK_SIZE_GB=$((DISK_SIZE / 1024 / 1024 / 1024))
    AVAIL_GB=$((AVAILABLE_SPACE / 1024 / 1024 / 1024))
    echo "{\"success\":false,\"error\":\"Espaço insuficiente. Necessário: ${DISK_SIZE_GB}GB, Disponível: ${AVAIL_GB}GB\"}"
    exit 1
fi

# Verificar status da VM
VM_STATUS="unknown"
if command -v virsh &> /dev/null; then
    VM_STATUS=$(virsh domstate "$VM_NAME" 2>/dev/null || echo "unknown")
fi

# Preparar nome do backup com timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DISK_BASENAME=$(basename "$DISK_PATH")
BACKUP_FILENAME="${VM_NAME}_${DISK_BASENAME}_${TIMESTAMP}"
BACKUP_PATH="${DEST_DIR}/${BACKUP_FILENAME}"

# Registrar início
START_TIME=$(date +%s)

# Log de progresso
echo "{\"progress\":\"Iniciando backup de $VM_NAME...\"}" >&2

# Se VM está rodando, avisar
if [[ "$VM_STATUS" =~ ^(running|em execução)$ ]]; then
    echo "{\"warning\":\"VM $VM_NAME está em execução. Backup pode ser inconsistente.\"}" >&2
fi

# Fazer backup usando rsync (mais eficiente e com progresso)
if command -v rsync &> /dev/null; then
    rsync -ah --progress "$DISK_PATH" "$BACKUP_PATH" 2>&1 | while IFS= read -r line; do
        echo "{\"progress\":\"$line\"}" >&2
    done
    BACKUP_SUCCESS=$?
else
    # Fallback para cp
    echo "{\"progress\":\"Copiando arquivo...\"}" >&2
    cp "$DISK_PATH" "$BACKUP_PATH"
    BACKUP_SUCCESS=$?
fi

if [ $BACKUP_SUCCESS -ne 0 ]; then
    rm -f "$BACKUP_PATH" 2>/dev/null || true
    echo "{\"success\":false,\"error\":\"Falha ao copiar disco\"}"
    exit 1
fi

# Calcular tempo decorrido
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

# Obter tamanho do backup
BACKUP_SIZE=$(stat -c%s "$BACKUP_PATH" 2>/dev/null || echo "0")

# Verificar checksum se solicitado
CHECKSUM=""
if [ "$VERIFY_CHECKSUM" = "true" ]; then
    echo "{\"progress\":\"Verificando checksum...\"}" >&2

    ORIGINAL_SHA256=$(sha256sum "$DISK_PATH" | awk '{print $1}')
    BACKUP_SHA256=$(sha256sum "$BACKUP_PATH" | awk '{print $1}')

    if [ "$ORIGINAL_SHA256" != "$BACKUP_SHA256" ]; then
        rm -f "$BACKUP_PATH" 2>/dev/null || true
        echo "{\"success\":false,\"error\":\"Checksum não corresponde. Backup corrompido.\"}"
        exit 1
    fi

    CHECKSUM="$BACKUP_SHA256"
    echo "{\"progress\":\"Checksum verificado com sucesso\"}" >&2
fi

# Comprimir backup (opcional, comentado por padrão pois pode demorar muito)
# echo "{\"progress\":\"Comprimindo backup...\"}" >&2
# gzip "$BACKUP_PATH"
# BACKUP_PATH="${BACKUP_PATH}.gz"
# BACKUP_SIZE=$(stat -c%s "$BACKUP_PATH" 2>/dev/null || echo "0")

# Retornar resultado
cat <<EOF
{
  "success": true,
  "backup_path": "$BACKUP_PATH",
  "size": $BACKUP_SIZE,
  "duration": $DURATION,
  "checksum": "$CHECKSUM",
  "vm_name": "$VM_NAME",
  "vm_status": "$VM_STATUS",
  "timestamp": "$TIMESTAMP"
}
EOF

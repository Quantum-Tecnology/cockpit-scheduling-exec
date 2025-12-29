# Scripts de Backup de VMs

Este diretório contém scripts para descoberta e backup de máquinas virtuais (VMs) usando libvirt/virsh.

## 📋 Scripts Disponíveis

### 1. discover-vms.sh
Descobre todas as VMs e seus discos no sistema.

**Uso:**
```bash
bash discover-vms.sh
```

**Saída:** JSON com array de VMs
```json
[
  {
    "name": "vm1",
    "status": "running",
    "disks": [
      {
        "path": "/var/lib/libvirt/images/vm1.qcow2",
        "size": 10737418240,
        "type": "qcow2"
      }
    ],
    "total_size": 10737418240
  }
]
```

**Requisitos:**
- virsh (pacote libvirt-clients)
- jq (para testes)

**Locais procurados:**
- `/var/lib/libvirt/images`
- `/home/libvirt-vms/`
- `/mnt/*/libvirt`
- `/mnt/*/vms`

---

### 2. backup-vm.sh
Faz backup de um disco específico de uma VM.

**Uso:**
```bash
bash backup-vm.sh <VM_NAME> <DISK_PATH> <DEST_DIR> <VERIFY_CHECKSUM>
```

**Parâmetros:**
- `VM_NAME`: Nome da VM
- `DISK_PATH`: Caminho completo do disco
- `DEST_DIR`: Diretório de destino
- `VERIFY_CHECKSUM`: "true" ou "false"

**Exemplo:**
```bash
bash backup-vm.sh vm1 \
  /var/lib/libvirt/images/vm1.qcow2 \
  /backups/vms \
  false
```

**Saída:** JSON com resultado
```json
{
  "success": true,
  "backup_path": "/backups/vms/vm1_vm1.qcow2_20251228_143022",
  "size": 10737418240,
  "duration": 125,
  "checksum": "abc123...",
  "vm_name": "vm1",
  "vm_status": "running",
  "timestamp": "20251228_143022"
}
```

**Características:**
- ✅ Verifica espaço em disco antes
- ✅ Usa rsync para cópia eficiente
- ✅ Avisa se VM está em execução
- ✅ Opção de verificar checksum SHA256
- ✅ Nome do arquivo inclui timestamp

---

### 3. backup-all-vms.sh
Faz backup de múltiplas VMs e gerencia retenção.

**Uso:**
```bash
bash backup-all-vms.sh <SELECTED_VMS> <DEST_DIR> <RETENTION_DAYS> <VERIFY_CHECKSUM>
```

**Parâmetros:**
- `SELECTED_VMS`: Lista de VMs separadas por vírgula (vm1,vm2,vm3)
- `DEST_DIR`: Diretório de destino (padrão: /mnt/storage/backups/vm_backups)
- `RETENTION_DAYS`: Dias de retenção (padrão: 7)
- `VERIFY_CHECKSUM`: "true" ou "false" (padrão: false)

**Exemplo:**
```bash
bash backup-all-vms.sh "vm1,vm2" /backups/vms 7 false
```

**Saída:** JSON com resumo + log detalhado
```json
{
  "success": true,
  "summary": {
    "total_vms": 2,
    "success_count": 2,
    "failed_count": 0,
    "total_size": 21474836480,
    "total_duration": 250,
    "deleted_count": 5,
    "deleted_size": 53687091200
  },
  "logs": [
    {"vm": "vm1", "status": "success", "size": 10737418240, "duration": 125, "disks": 1},
    {"vm": "vm2", "status": "success", "size": 10737418240, "duration": 125, "disks": 1}
  ]
}
```

**Funcionalidades:**
- ✅ Backup de múltiplas VMs em sequência
- ✅ Suporta múltiplos discos por VM
- ✅ Limpeza automática de backups antigos
- ✅ Log detalhado no stderr
- ✅ Estatísticas completas
- ✅ Continua mesmo se uma VM falhar

---

## 🔧 Instalação

```bash
# 1. Verificar dependências
sudo apt install libvirt-clients rsync  # Debian/Ubuntu
sudo dnf install libvirt-client rsync   # Fedora/RHEL

# 2. Tornar scripts executáveis
chmod +x *.sh

# 3. Criar diretório de destino
sudo mkdir -p /mnt/storage/backups/vm_backups
sudo chmod 755 /mnt/storage/backups/vm_backups
```

---

## 🧪 Testes

### Teste 1: Descobrir VMs
```bash
bash discover-vms.sh
# Deve retornar JSON com VMs encontradas
```

### Teste 2: Backup de uma VM
```bash
# Descobrir VMs primeiro
VMS=$(bash discover-vms.sh)
VM_NAME=$(echo "$VMS" | jq -r '.[0].name')
DISK_PATH=$(echo "$VMS" | jq -r '.[0].disks[0].path')

# Fazer backup
bash backup-vm.sh "$VM_NAME" "$DISK_PATH" /tmp/test false

# Verificar resultado
ls -lh /tmp/test/
```

### Teste 3: Backup de múltiplas VMs
```bash
# Descobrir VMs
VMS=$(bash discover-vms.sh)
VM_NAMES=$(echo "$VMS" | jq -r '.[].name' | paste -sd,)

# Fazer backup de todas
bash backup-all-vms.sh "$VM_NAMES" /tmp/test 7 false 2>&1 | tee backup.log
```

---

## 📊 Formato de Arquivos de Backup

```
<VM_NAME>_<DISK_NAME>_<TIMESTAMP>

Exemplos:
- vm1_disk.qcow2_20251228_143022
- webserver_sda.qcow2_20251228_150530
- database_data-disk.qcow2_20251228_163045
```

**Timestamp:** YYYYMMDD_HHMMSS

---

## ⚠️ Notas Importantes

### Consistência de Dados
- ⚠️ Fazer backup de VMs em execução pode resultar em dados inconsistentes
- ✅ Recomendação: Pausar VM antes do backup
  ```bash
  virsh suspend vm-name
  # fazer backup
  virsh resume vm-name
  ```

### Espaço em Disco
- Scripts verificam espaço disponível antes de iniciar
- Recomendação: Manter pelo menos 20% de espaço livre

### Performance
- Backup de discos grandes pode demorar horas
- rsync otimiza a cópia mas ainda é I/O intensivo
- Recomendação: Fazer backups em horários de baixo uso

### Checksum
- Verificação SHA256 **dobra** o tempo de backup
- Use apenas para backups críticos
- O checksum é do arquivo completo, não incremental

### Permissões
- Scripts podem precisar de privilégios root/sudo
- Discos de VMs geralmente pertencem ao grupo libvirt
- Recomendação: Adicionar usuário ao grupo libvirt
  ```bash
  sudo usermod -aG libvirt $USER
  ```

---

## 🔍 Troubleshooting

### "virsh não encontrado"
```bash
# Debian/Ubuntu
sudo apt install libvirt-clients

# Fedora/RHEL
sudo dnf install libvirt-client

# Verificar
which virsh
```

### "Permission denied"
```bash
# Verificar grupos do usuário
groups

# Adicionar ao grupo libvirt
sudo usermod -aG libvirt $USER

# Fazer logout/login para aplicar

# Ou executar com sudo
sudo bash backup-vm.sh ...
```

### "No space left on device"
```bash
# Verificar espaço disponível
df -h /mnt/storage/backups/vm_backups

# Limpar backups antigos manualmente
find /mnt/storage/backups/vm_backups -type f -mtime +30 -delete
```

### "VM não encontrada"
```bash
# Listar VMs
virsh list --all

# Verificar nome exato
virsh dominfo vm-name
```

### Script trava sem output
```bash
# Executar com debug
bash -x backup-vm.sh ... 2>&1 | tee debug.log

# Verificar processos
ps aux | grep rsync
```

---

## 📝 Logs

Scripts escrevem para:
- **stdout**: JSON com resultados
- **stderr**: Logs detalhados e progresso

Para capturar ambos:
```bash
bash backup-all-vms.sh ... > result.json 2> backup.log
```

Para ver tudo junto:
```bash
bash backup-all-vms.sh ... 2>&1 | tee backup-full.log
```

---

## 🔄 Automação

### Cron Job Exemplo
```bash
# Editar crontab
crontab -e

# Backup diário às 2 AM
0 2 * * * /usr/share/cockpit/scheduling_exec/scripts/vm/backup-all-vms.sh "vm1,vm2,vm3" /backups/vms 7 false >> /var/log/vm-backup.log 2>&1
```

### Systemd Timer Exemplo
```ini
# /etc/systemd/system/vm-backup.timer
[Unit]
Description=VM Backup Timer

[Timer]
OnCalendar=daily
OnCalendar=02:00
Persistent=true

[Install]
WantedBy=timers.target
```

```ini
# /etc/systemd/system/vm-backup.service
[Unit]
Description=VM Backup Service

[Service]
Type=oneshot
ExecStart=/usr/share/cockpit/scheduling_exec/scripts/vm/backup-all-vms.sh "vm1,vm2,vm3" /backups/vms 7 false
StandardOutput=journal
StandardError=journal
```

Ativar:
```bash
sudo systemctl enable vm-backup.timer
sudo systemctl start vm-backup.timer
```

---

## 📚 Referências

- [libvirt Documentation](https://libvirt.org/docs.html)
- [virsh Commands](https://libvirt.org/manpages/virsh.html)
- [rsync Manual](https://linux.die.net/man/1/rsync)
- [qcow2 Format](https://www.linux-kvm.org/page/Qcow2)

---

**Última atualização:** 28 de dezembro de 2025

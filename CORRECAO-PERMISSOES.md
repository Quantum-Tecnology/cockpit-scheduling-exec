# 🔧 Correção Urgente - Permissão nos Scripts

## ❌ Problema Identificado

O diagnóstico revelou:
```
Permission denied: /usr/share/cockpit/scheduling_exec/scripts/vm/discover-vms.sh
```

**Causa:** Scripts não têm permissão de execução (+x)

---

## ✅ Solução (Execute no Servidor)

### 1. Conecte-se ao servidor via SSH

```bash
ssh usuario@seu-servidor
```

### 2. Execute este comando para dar permissão

```bash
sudo chmod +x /usr/share/cockpit/scheduling_exec/scripts/vm/*.sh
```

### 3. Verifique se funcionou

```bash
ls -lh /usr/share/cockpit/scheduling_exec/scripts/vm/*.sh
```

Deve mostrar algo como:
```
-rwxr-xr-x ... backup-all-vms.sh
-rwxr-xr-x ... backup-vm.sh
-rwxr-xr-x ... diagnose-vms.sh
-rwxr-xr-x ... discover-vms.sh
-rwxr-xr-x ... test-falcon-front.sh
```

**Os `x` indicam que agora têm permissão de execução!**

### 4. Teste o script manualmente

```bash
sudo /usr/share/cockpit/scheduling_exec/scripts/vm/discover-vms.sh
```

Deve retornar JSON com suas 5 VMs:
- falcon_front
- falcon_docker_144
- falcon_minio_169
- falcon_redis_113
- falcon_db-147

### 5. Teste a descoberta no Cockpit

1. Volte ao navegador
2. Recarregue a página (Ctrl+F5)
3. Vá em "💿 Backup de VMs"
4. Clique em "🔍 Descobrir VMs"
5. **Agora deve funcionar!**

---

## 📊 Suas VMs Encontradas

O diagnóstico confirmou que você tem **5 VMs**:

| VM | Status | Disco Provável |
|---|---|---|
| falcon_front | shut off | /mnt/nvme_storage/front-vm.qcow2 ✅ |
| falcon_docker_144 | running | /home/libvirt-vms/falcon_docker.qcow2 |
| falcon_minio_169 | running | /mnt/nvme_storage/minio_data.qcow2 ou minio_vm.qcow2 |
| falcon_redis_113 | running | ? |
| falcon_db-147 | running | /mnt/storage/mysql_data.qcow2 ou postgresql_data.qcow2 |

**✅ A VM `falcon_front` existe e o disco está em `/mnt/nvme_storage/front-vm.qcow2`**

Após dar permissão, o backup deve funcionar perfeitamente!

---

## 🚀 Comando Rápido (Copie e Cole)

Execute isso no servidor para resolver tudo:

```bash
# Dar permissão aos scripts
sudo chmod +x /usr/share/cockpit/scheduling_exec/scripts/vm/*.sh

# Testar descoberta
sudo /usr/share/cockpit/scheduling_exec/scripts/vm/discover-vms.sh | jq .

# Se jq não estiver instalado, instale:
sudo apt-get install jq -y
```

---

## ⚠️ Observação sobre Grupos

O diagnóstico também mostrou:
```
⚠️  Usuário NÃO está no grupo 'libvirt'
⚠️  Usuário NÃO está no grupo 'kvm'
```

Mas como você está executando como **root**, isso não é um problema. Root tem todas as permissões.

---

## 🎯 Após Corrigir

Volte ao Cockpit e:
1. Clique em "🔍 Descobrir VMs"
2. Selecione `falcon_front`
3. Configure o destino: `/mnt/storage/backups/vm_backups`
4. Clique em "📦 Fazer Backup das VMs Selecionadas"

**O backup deve funcionar! 🎉**

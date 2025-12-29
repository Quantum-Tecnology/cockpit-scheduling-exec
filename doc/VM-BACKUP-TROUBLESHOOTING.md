# 🩺 Solução de Problemas - Backup de VMs

## ❌ "VM não encontrada"

Este erro ocorre quando o script não consegue localizar a VM no sistema.

### Causas Possíveis:

1. **VM não está registrada no libvirt**
2. **Conexão libvirt incorreta** (system vs session)
3. **Permissões insuficientes**
4. **Nome da VM diferente**

---

## 🔍 Diagnóstico Rápido

### 1. Execute o diagnóstico integrado

Na interface do Cockpit:
1. Vá para "Backup de VMs"
2. Clique em **🩺 Diagnóstico**
3. Analise o log gerado

### 2. Verifique manualmente as VMs

```bash
# Listar VMs (conexão system)
sudo virsh -c qemu:///system list --all

# Listar VMs (conexão session)
virsh -c qemu:///session list --all

# Listar VMs (conexão padrão)
virsh list --all
```

### 3. Verifique o nome exato da VM

```bash
# Ver detalhes da VM
sudo virsh dominfo NOME_DA_VM

# Ver discos da VM
sudo virsh domblklist NOME_DA_VM --details
```

---

## 🛠️ Soluções por Problema

### Problema: "virsh não encontrado"

**Causa:** libvirt-clients não instalado

**Solução:**
```bash
# Debian/Ubuntu
sudo apt-get install libvirt-clients

# CentOS/RHEL
sudo yum install libvirt-client
```

### Problema: "Nenhuma VM encontrada"

**Causa 1:** libvirtd não está rodando

**Solução:**
```bash
sudo systemctl start libvirtd
sudo systemctl enable libvirtd
```

**Causa 2:** VMs estão em conexão diferente

**Solução:** Teste ambas as conexões:
```bash
sudo virsh -c qemu:///system list --all
virsh -c qemu:///session list --all
```

### Problema: "Permissão negada"

**Causa:** Usuário não tem permissão para acessar libvirt

**Solução:**
```bash
# Adicionar usuário aos grupos necessários
sudo usermod -aG libvirt $(whoami)
sudo usermod -aG kvm $(whoami)

# Logout e login novamente para aplicar
```

### Problema: "VM falcon_front não encontrada"

**Causa:** Nome pode estar diferente (hífen vs underscore)

**Solução:** Verifique o nome exato:
```bash
# Listar todas as VMs com nomes exatos
sudo virsh list --all --name

# Procurar por nome similar
sudo virsh list --all | grep -i falcon
```

Se a VM aparecer como `falcon-front` (com hífen) em vez de `falcon_front` (com underscore), você precisa:

1. Renomear a VM no libvirt:
```bash
sudo virsh domrename falcon-front falcon_front
```

OU

2. Selecionar a VM com o nome correto na interface do Cockpit

### Problema: "Disco não encontrado"

**Causa:** Caminho do disco mudou ou disco foi movido

**Solução:**
```bash
# Ver onde o disco está registrado
sudo virsh domblklist NOME_DA_VM --details

# Se o caminho estiver errado, edite a VM
sudo virsh edit NOME_DA_VM

# Procurar pelo disco no sistema
sudo find /var/lib/libvirt /home /mnt -name "*.qcow2" 2>/dev/null
```

---

## 🧪 Teste Manual do Script

### 1. Testar descoberta de VMs

```bash
cd /usr/share/cockpit/scheduling_exec/scripts/vm/

# Com debug
DEBUG=true ./discover-vms.sh

# Normal
./discover-vms.sh | jq .
```

### 2. Testar backup de uma VM

```bash
# Sintaxe
./backup-vm.sh <VM_NAME> <DISK_PATH> <DEST_DIR> <VERIFY_CHECKSUM>

# Exemplo
sudo ./backup-vm.sh falcon_front /var/lib/libvirt/images/falcon_front.qcow2 /tmp/test false
```

### 3. Executar diagnóstico completo

```bash
sudo ./diagnose-vms.sh
```

---

## 📍 Locais Comuns de Discos

O script procura discos em:

- `/var/lib/libvirt/images/` (padrão)
- `/home/libvirt-vms/`
- `/mnt/storage/`
- `/mnt/nvme_storage/`
- `/mnt/*/vms/`
- `/mnt/*/libvirt/`

Se seus discos estão em outro local, o script ainda pode encontrá-los via `virsh domblklist`.

---

## ⚙️ Configuração do libvirt

### Verificar configuração

```bash
# Status do serviço
sudo systemctl status libvirtd

# Versão
virsh --version

# Conexão padrão
virsh uri
```

### Definir conexão padrão

Edite `~/.config/libvirt/libvirt.conf`:
```conf
uri_default = "qemu:///system"
```

---

## 🔐 Permissões

### Verificar grupos do usuário

```bash
groups
```

Deve incluir: `libvirt`, `kvm`

### Adicionar permissões

```bash
sudo usermod -aG libvirt cockpit-ws
sudo usermod -aG kvm cockpit-ws
sudo systemctl restart cockpit
```

---

## 📊 Logs Úteis

### Logs do libvirt

```bash
# Log do daemon
sudo journalctl -u libvirtd -f

# Logs de VMs
sudo tail -f /var/log/libvirt/qemu/*.log
```

### Logs do Cockpit

```bash
# Log do Cockpit
sudo journalctl -u cockpit -f

# Console do navegador (F12)
# Procure por mensagens "VM Backup:"
```

---

## ✅ Checklist Completo

- [ ] libvirt-clients instalado (`which virsh`)
- [ ] libvirtd rodando (`systemctl status libvirtd`)
- [ ] Usuário nos grupos libvirt e kvm (`groups`)
- [ ] VMs visíveis (`virsh list --all`)
- [ ] Discos acessíveis (`virsh domblklist VM_NAME`)
- [ ] Script discover-vms.sh executável (`chmod +x`)
- [ ] Cockpit reiniciado (`systemctl restart cockpit`)

---

## 🆘 Ainda com problemas?

Execute o diagnóstico completo e compartilhe o log:

```bash
sudo /usr/share/cockpit/scheduling_exec/scripts/vm/diagnose-vms.sh > diagnostico.txt 2>&1
cat diagnostico.txt
```

Ou use o botão **🩺 Diagnóstico** na interface do Cockpit e copie o log gerado.

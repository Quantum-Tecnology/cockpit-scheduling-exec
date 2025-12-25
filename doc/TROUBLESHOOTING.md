# Troubleshooting - Cockpit Scheduling Exec

Este documento contém soluções para problemas comuns ao instalar e usar o plugin Cockpit Scheduling Exec.

## 🔍 Problema: Plugin não aparece no menu lateral do Cockpit

### Sintoma
Após instalar o pacote `.deb`, o módulo "Scripts & Agendamentos" não aparece no menu lateral esquerdo do Cockpit.

### Diagnóstico

Execute o script de verificação para identificar o problema:

```bash
wget https://raw.githubusercontent.com/QuantumTecnology/cockpit-scheduling-exec/main/scripts/check-install.sh -O check-install.sh
chmod +x check-install.sh
./check-install.sh
```

### Soluções

#### 1. Verificar instalação dos arquivos

```bash
# Verificar se o diretório existe
ls -la /usr/share/cockpit/scheduling_exec/

# Deve mostrar:
# - manifest.json
# - index.html
# - index.js
# - scripts/ (diretório)
```

**Se o diretório não existir:**
```bash
sudo apt install --reinstall ./cockpit-scheduling-exec_1.0.8_all.deb
```

#### 2. Verificar o manifest.json

```bash
cat /usr/share/cockpit/scheduling_exec/manifest.json
```

**O arquivo deve conter:**
```json
{
  "version": 0,
  "name": "scheduling_exec",
  "description": "Gerenciador de Scripts Personalizados e Agendamentos",
  "requires": {
    "cockpit": ">=200"
  },
  "menu": {
    "index": {
      "label": "Scripts & Agendamentos",
      "order": 50,
      "path": "index.html"
    }
  },
  "content-security-policy": "default-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com"
}
```

**Se estiver diferente ou incompleto:**
```bash
# Baixe o manifest correto
sudo wget -O /usr/share/cockpit/scheduling_exec/manifest.json \
  https://raw.githubusercontent.com/QuantumTecnology/cockpit-scheduling-exec/main/usr/share/cockpit/scheduling_exec/manifest.json

# Defina permissões corretas
sudo chmod 644 /usr/share/cockpit/scheduling_exec/manifest.json
```

#### 3. Verificar permissões dos arquivos

```bash
# Corrigir permissões
sudo chmod 644 /usr/share/cockpit/scheduling_exec/manifest.json
sudo chmod 644 /usr/share/cockpit/scheduling_exec/index.html
sudo chmod 644 /usr/share/cockpit/scheduling_exec/index.js
sudo chmod -R 755 /usr/share/cockpit/scheduling_exec/scripts/
```

#### 4. Reiniciar o Cockpit

```bash
# Reiniciar o serviço
sudo systemctl restart cockpit

# Verificar se está rodando
sudo systemctl status cockpit
```

#### 5. Limpar cache do navegador

1. Abra o navegador onde acessa o Cockpit
2. Pressione `Ctrl + Shift + Del`
3. Selecione:
   - ✅ Cookies e dados de sites
   - ✅ Imagens e arquivos em cache
4. Clique em "Limpar dados"
5. Feche e abra o navegador novamente

#### 6. Fazer logout e login no Cockpit

1. Acesse https://seu-servidor:9090
2. Faça logout
3. Faça login novamente
4. O menu "Scripts & Agendamentos" deve aparecer

#### 7. Verificar logs do Cockpit

```bash
# Ver logs recentes
sudo journalctl -u cockpit -n 50 --no-pager

# Ver logs em tempo real
sudo journalctl -u cockpit -f
```

#### 8. Verificar outros módulos Cockpit

```bash
# Listar todos os módulos instalados
ls -la /usr/share/cockpit/

# Verificar se outros módulos aparecem no menu
# Se nenhum módulo aparecer, o problema é com o Cockpit
```

#### 9. Desinstalar e reinstalar completamente

```bash
# Remover pacote
sudo apt remove cockpit-scheduling-exec

# Remover arquivos manualmente (se necessário)
sudo rm -rf /usr/share/cockpit/scheduling_exec

# Reinstalar
sudo apt install ./cockpit-scheduling-exec_1.0.8_all.deb

# Reiniciar Cockpit
sudo systemctl restart cockpit
```

#### 10. Instalar versão de desenvolvimento

Se nada funcionar, instale manualmente do repositório:

```bash
# Clonar repositório
git clone https://github.com/QuantumTecnology/cockpit-scheduling-exec.git
cd cockpit-scheduling-exec

# Copiar arquivos
sudo mkdir -p /usr/share/cockpit/scheduling_exec
sudo cp -r usr/share/cockpit/scheduling_exec/* /usr/share/cockpit/scheduling_exec/

# Permissões
sudo chmod 644 /usr/share/cockpit/scheduling_exec/*.{html,js,json}
sudo chmod -R 755 /usr/share/cockpit/scheduling_exec/scripts/

# Reiniciar
sudo systemctl restart cockpit
```

---

## 🔍 Problema: Scripts não executam

### Diagnóstico

```bash
# Verificar se o diretório de scripts existe
ls -la ~/scripts/

# Verificar permissões do script
ls -la ~/scripts/seu-script.sh
```

### Soluções

#### 1. Garantir permissão de execução

```bash
chmod +x ~/scripts/seu-script.sh
```

#### 2. Testar script manualmente

```bash
# Executar script
bash ~/scripts/seu-script.sh

# Verificar saída e erros
```

#### 3. Verificar logs de execução

```bash
# Ver log do script
cat ~/.scripts-metadata/seu-script.sh.log
```

---

## 🔍 Problema: Agendamento (cron) não funciona

### Diagnóstico

```bash
# Verificar se cron está instalado
which crontab

# Verificar se cron está rodando
sudo systemctl status cron

# Listar agendamentos
crontab -l
```

### Soluções

#### 1. Instalar cron

```bash
sudo apt update
sudo apt install cron
sudo systemctl enable cron
sudo systemctl start cron
```

#### 2. Verificar agendamento

```bash
# Listar agendamentos do usuário
crontab -l

# Editar manualmente (se necessário)
crontab -e
```

#### 3. Verificar logs do cron

```bash
# Ver logs do sistema
sudo journalctl -u cron -n 50 --no-pager

# Ver syslog (se disponível)
grep CRON /var/log/syslog | tail -20
```

#### 4. Testar expressão cron

Acesse https://crontab.guru/ para validar sua expressão cron.

Exemplos:
- `* * * * *` - A cada minuto
- `*/5 * * * *` - A cada 5 minutos
- `0 * * * *` - A cada hora
- `0 0 * * *` - Diariamente à meia-noite

---

## 🔍 Problema: Erro de permissão ao criar/editar scripts

### Soluções

#### 1. Verificar proprietário do diretório

```bash
ls -la ~/ | grep scripts
```

#### 2. Corrigir proprietário

```bash
sudo chown -R $USER:$USER ~/scripts
sudo chown -R $USER:$USER ~/.scripts-metadata
```

#### 3. Corrigir permissões

```bash
chmod 755 ~/scripts
chmod -R 644 ~/scripts/*.sh
chmod -R 644 ~/.scripts-metadata/*.json
```

---

## 🔍 Problema: Interface não carrega ou aparece em branco

### Soluções

#### 1. Verificar console do navegador

1. Pressione `F12` para abrir DevTools
2. Vá para a aba "Console"
3. Procure por erros em vermelho

#### 2. Verificar recursos externos

O plugin usa recursos do unpkg.com. Verifique se:
- Seu servidor tem acesso à internet
- Não há firewall bloqueando unpkg.com

#### 3. Verificar CSP (Content Security Policy)

```bash
# Verificar manifest.json
cat /usr/share/cockpit/scheduling_exec/manifest.json | grep content-security-policy
```

Deve conter:
```json
"content-security-policy": "default-src 'self' 'unsafe-inline' 'unsafe-eval' https://unpkg.com"
```

---

## 📞 Suporte

Se nenhuma solução funcionou:

1. **Abra uma issue no GitHub:**
   https://github.com/QuantumTecnology/cockpit-scheduling-exec/issues

2. **Inclua as seguintes informações:**
   - Sistema operacional e versão
   - Versão do Cockpit (`cockpit-bridge --version`)
   - Saída do script `check-install.sh`
   - Logs relevantes do Cockpit
   - Capturas de tela do problema

3. **Email:**
   gustavo@quantumtecnology.com.br

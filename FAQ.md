# FAQ - Perguntas Frequentes

## 📋 Instalação e Configuração

### Como instalar o plugin?

**Opção 1: Via pacote Debian (recomendado)**
```bash
cd cockpit-scheduling-exec
chmod +x build.sh
./build.sh
cd ..
sudo apt install ./cockpit-scheduling-exec.deb
```

**Opção 2: Instalação manual**
```bash
cd cockpit-scheduling-exec
chmod +x install-manual.sh
sudo ./install-manual.sh
```

### O plugin não aparece no menu do Cockpit

1. Verifique se o Cockpit está rodando:
   ```bash
   sudo systemctl status cockpit
   ```

2. Reinicie o Cockpit:
   ```bash
   sudo systemctl restart cockpit
   ```

3. Limpe o cache do navegador (Ctrl+Shift+Delete)

4. Verifique se os arquivos foram copiados:
   ```bash
   ls -la /usr/share/cockpit/scheduling-exec/
   ```

### Preciso reiniciar o servidor após instalar?

Não, apenas reinicie o serviço do Cockpit:
```bash
sudo systemctl restart cockpit
```

## 🔧 Uso Básico

### Como criar meu primeiro script?

1. Acesse o Cockpit (https://seu-servidor:9090)
2. Clique em "Scripts & Agendamentos" no menu
3. Clique em "+ Novo Script"
4. Digite um nome terminando em `.sh`
5. Escreva seu script começando com `#!/bin/bash`
6. Clique em "Salvar"

### Qual a diferença entre executar manualmente e agendar?

- **Executar manualmente** (▶): Roda o script imediatamente e mostra a saída
- **Agendar** (⏰): Configura o script para rodar automaticamente via cron

### Posso agendar um script para rodar várias vezes ao dia?

Sim! Use expressões cron como:
- `*/30 * * * *` - A cada 30 minutos
- `0 */2 * * *` - A cada 2 horas
- `0 8,12,18 * * *` - Às 8h, 12h e 18h

## 📝 Trabalhando com Scripts

### Meu script não funciona quando agendado, mas funciona manualmente

Possíveis causas:

1. **Caminhos relativos**: Use caminhos absolutos
   ```bash
   # ❌ Errado
   cd documentos
   
   # ✅ Correto
   cd /home/usuario/documentos
   ```

2. **Variáveis de ambiente**: O cron tem ambiente limitado
   ```bash
   # Adicione no início do script
   export PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
   ```

3. **Permissões**: Verifique permissões de arquivos/diretórios

### Como ver a saída de um script agendado?

```bash
# Ver log de execução
cat ~/.scripts-metadata/nome-do-script.sh.log

# Ver últimas linhas
tail -20 ~/.scripts-metadata/nome-do-script.sh.log

# Ver em tempo real
tail -f ~/.scripts-metadata/nome-do-script.sh.log
```

### Como testar um script antes de agendar?

```bash
# Método 1: Executar diretamente
bash ~/scripts/meu-script.sh

# Método 2: Usar o botão ▶ no Cockpit
# (executa e mostra a saída)
```

### Posso usar variáveis em scripts?

Sim! Exemplo:
```bash
#!/bin/bash

# Variáveis
DATA=$(date +%Y%m%d)
USUARIO=$(whoami)
DIRETORIO="$HOME/backups"

echo "Backup do usuário $USUARIO em $DATA"
mkdir -p "$DIRETORIO"
```

## ⏰ Agendamentos (Cron)

### Como agendar um script para rodar todo dia às 3h da manhã?

1. Clique em ⏰ na linha do script
2. Configure:
   - Minuto: `0`
   - Hora: `3`
   - Dia: `*`
   - Mês: `*`
   - Dia da Semana: `*`
3. Ou escolha o preset "Diariamente" e ajuste a hora

### Como rodar um script apenas aos finais de semana?

Use Dia da Semana = `6,0` (Sábado e Domingo)

Ou configure manualmente:
- Minuto: `0`
- Hora: `10` (exemplo: 10h)
- Dia: `*`
- Mês: `*`
- Dia da Semana: `6,0`

### Posso ter múltiplos agendamentos para o mesmo script?

O plugin não suporta diretamente, mas você pode:

1. Criar cópias do script com nomes diferentes
2. Agendar cada cópia com horários diferentes

Ou editar manualmente o crontab:
```bash
crontab -e
```

### Como verificar se meu agendamento está ativo?

```bash
# Ver todos os agendamentos
crontab -l

# Ver apenas agendamentos de scripts do plugin
crontab -l | grep scripts
```

### Como remover um agendamento?

1. Clique em ⏰ na linha do script
2. Clique em "Remover Agendamento"

Ou via linha de comando:
```bash
# Editar crontab
crontab -e
# Remova a linha correspondente
```

## 📊 Estatísticas

### O que significa "Sucessos"?

É o número de vezes que o script foi executado e terminou com código de saída 0 (sucesso).

### Como forçar um script a reportar falha?

Use `exit 1` (ou qualquer número diferente de 0):
```bash
#!/bin/bash

if [ ! -f "/arquivo/importante" ]; then
    echo "Erro: Arquivo não encontrado!" >&2
    exit 1  # Reporta falha
fi

# Script continua...
exit 0  # Reporta sucesso
```

### As estatísticas podem ser resetadas?

Atualmente não há opção na interface, mas você pode:
```bash
# Resetar manualmente
rm ~/.scripts-metadata/nome-do-script.sh.json
# Na próxima execução, será criado novo metadata
```

## 🔐 Segurança e Permissões

### Os scripts podem danificar meu sistema?

Scripts rodam com suas permissões de usuário. Tenha cuidado com:
- Comandos destrutivos (`rm -rf`, etc)
- Scripts de fontes não confiáveis
- Permissões de sudo no script

**Sempre revise scripts antes de executar ou agendar!**

### Posso executar comandos que requerem sudo?

Sim, mas precisa configurar sudoers para não pedir senha:

```bash
# Editar sudoers (cuidado!)
sudo visudo

# Adicionar linha (substitua 'usuario' e ajuste comando)
usuario ALL=(ALL) NOPASSWD: /usr/bin/apt update
```

**Atenção**: Isso pode ser um risco de segurança!

### Onde ficam armazenados meus scripts?

- Scripts: `$HOME/scripts/`
- Metadados: `$HOME/.scripts-metadata/`
- Logs: `$HOME/.scripts-metadata/*.log`

Apenas você (e root) tem acesso a esses arquivos.

## 🐛 Problemas Comuns

### Erro: "Script não encontrado"

Verifique:
```bash
# O script existe?
ls -la ~/scripts/

# Tem permissão de execução?
chmod +x ~/scripts/meu-script.sh
```

### Erro: "Permission denied"

```bash
# Dar permissão de execução
chmod +x ~/scripts/meu-script.sh

# Verificar proprietário
ls -la ~/scripts/meu-script.sh
```

### Script trava ou demora muito

- Use timeout no crontab:
  ```bash
  # Editar crontab
  crontab -e
  
  # Adicionar timeout (exemplo: 5 minutos)
  0 * * * * timeout 300 /caminho/para/script.sh
  ```

### Erro: "/bin/bash^M: bad interpreter"

Problema com quebras de linha Windows (CRLF). Corrigir:
```bash
# Instalar dos2unix
sudo apt install dos2unix

# Converter arquivo
dos2unix ~/scripts/meu-script.sh
```

## 📦 Backup e Restauração

### Como fazer backup dos meus scripts?

```bash
# Backup manual
tar -czf scripts-backup.tar.gz ~/scripts ~/.scripts-metadata

# Ou usar script automático (veja backup-exemplo.sh)
```

### Como restaurar scripts de um backup?

```bash
# Extrair backup
tar -xzf scripts-backup.tar.gz -C ~/

# Verificar permissões
chmod +x ~/scripts/*.sh
```

### Os scripts são mantidos ao desinstalar o plugin?

Sim! Os scripts em `~/scripts/` e metadados em `~/.scripts-metadata/` são preservados.

## 🔄 Atualização

### Como atualizar o plugin?

```bash
# Se instalou via pacote .deb
sudo apt install ./cockpit-scheduling-exec.deb

# Se instalou manualmente
cd cockpit-scheduling-exec
sudo ./install-manual.sh
```

Seus scripts e dados não são afetados.

### Como saber qual versão está instalada?

```bash
# Ver versão do pacote
dpkg -l | grep cockpit-scheduling-exec

# Ou verificar arquivo de controle
cat /usr/share/cockpit/scheduling-exec/manifest.json
```

## 💡 Dicas e Truques

### Como receber email quando um script falhar?

```bash
#!/bin/bash

# Seu script aqui
if ! comando_importante; then
    echo "Falha no script $(basename $0)" | mail -s "Alerta Script" seu@email.com
    exit 1
fi
```

### Como fazer log personalizado?

```bash
#!/bin/bash

LOG_FILE="$HOME/meu-log-personalizado.log"

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "Script iniciado"
# Seu código...
log "Script concluído"
```

### Como criar script que roda apenas em horário comercial?

```bash
#!/bin/bash

HORA=$(date +%H)
DIA_SEMANA=$(date +%u)  # 1-7 (1=segunda)

# Verificar se é horário comercial (8-18h, seg-sex)
if [ $DIA_SEMANA -le 5 ] && [ $HORA -ge 8 ] && [ $HORA -le 18 ]; then
    # Executar ação
    echo "Rodando em horário comercial"
else
    echo "Fora do horário comercial, saindo..."
    exit 0
fi
```

## 🆘 Suporte

### Onde reportar bugs?

Abra uma issue no repositório do projeto com:
- Descrição do problema
- Passos para reproduzir
- Logs relevantes
- Versão do plugin e do Cockpit

### Como contribuir?

Veja o arquivo [CONTRIBUTING.md](CONTRIBUTING.md)

### Onde encontrar mais exemplos?

- Scripts de exemplo na pasta `scripts/`
- README.md para documentação completa
- STRUCTURE.md para entender a arquitetura

## 📚 Recursos Úteis

- **Cockpit**: https://cockpit-project.org/
- **Bash Guide**: https://www.gnu.org/software/bash/manual/
- **Cron Guide**: https://crontab.guru/
- **ShellCheck**: https://www.shellcheck.net/ (validar scripts)

---

**Não encontrou sua pergunta?** Abra uma issue ou entre em contato!

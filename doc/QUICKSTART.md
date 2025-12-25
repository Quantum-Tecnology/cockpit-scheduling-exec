# Quick Start - Cockpit Scheduling Exec

## 🚀 Instalação Rápida

### Método 1: Pacote Debian (Recomendado)

```bash
# 1. Construir o pacote
cd cockpit-scheduling-exec
chmod +x scripts/build.sh
./scripts/build.sh

# 2. Instalar
sudo apt install ./build/cockpit-scheduling-exec_*_all.deb
```

### Método 2: Instalação Manual

```bash
cd cockpit-scheduling-exec
chmod +x scripts/install-manual.sh
sudo ./scripts/install-manual.sh
```

## 📋 Pré-requisitos

Antes de instalar, certifique-se de ter:

```bash
# Instalar Cockpit
sudo apt update
sudo apt install cockpit

# Habilitar e iniciar Cockpit
sudo systemctl enable --now cockpit.socket

# Verificar se está rodando
sudo systemctl status cockpit
```

## 🎯 Primeiro Uso

1. Acesse: `https://seu-servidor:9090`
2. Faça login com suas credenciais do sistema
3. Clique em "Scripts & Agendamentos" no menu lateral
4. Clique em "+ Novo Script"
5. Crie seu primeiro script!

## 📝 Exemplo de Script Básico

```bash
#!/bin/bash

# Script de backup simples
DATA=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="$HOME/backups"

mkdir -p "$BACKUP_DIR"

# Fazer backup de algum diretório
tar -czf "$BACKUP_DIR/backup_$DATA.tar.gz" "$HOME/documentos"

echo "Backup concluído: backup_$DATA.tar.gz"
```

## ⏰ Agendar Execução

Para executar o script acima diariamente às 2h da manhã:

1. Clique no ícone ⏰ (relógio) na linha do script
2. Configure:
   - **Minuto**: 0
   - **Hora**: 2
   - **Dia**: *
   - **Mês**: *
   - **Dia da Semana**: *
3. Ou escolha o preset: "Diariamente (meia-noite)" e ajuste a hora

## 🔧 Comandos Úteis

```bash
# Ver logs de um script
cat ~/.scripts-metadata/seu-script.sh.log

# Listar seus scripts
ls -la ~/scripts/

# Ver agendamentos do cron
crontab -l

# Testar script manualmente
bash ~/scripts/seu-script.sh

# Verificar status do Cockpit
sudo systemctl status cockpit
```

## 🆘 Solução Rápida de Problemas

### Plugin não aparece?
```bash
sudo systemctl restart cockpit
# Depois recarregue a página (Ctrl+F5)
```

### Script não executa?
```bash
# Verificar permissões
ls -la ~/scripts/seu-script.sh

# Testar manualmente
bash ~/scripts/seu-script.sh

# Ver erros
cat ~/.scripts-metadata/seu-script.sh.log
```

### Cron não funciona?
```bash
# Verificar se cron está rodando
sudo systemctl status cron

# Ver logs do sistema
sudo journalctl -u cron | tail -20
```

## 🗑️ Desinstalar

```bash
# Com pacote
sudo apt remove cockpit-scheduling-exec

# Manual
cd cockpit-scheduling-exec
chmod +x scripts/uninstall.sh
sudo ./scripts/uninstall.sh
```

## 💡 Dicas

1. **Sempre comece scripts com** `#!/bin/bash`
2. **Use caminhos absolutos** em scripts agendados
3. **Teste manualmente** antes de agendar
4. **Verifique logs** regularmente
5. **Faça backup** de scripts importantes

## 📚 Mais Informações

- README completo: [README.md](README.md)
- Documentação do Cockpit: https://cockpit-project.org/
- Tutorial de Cron: https://crontab.guru/

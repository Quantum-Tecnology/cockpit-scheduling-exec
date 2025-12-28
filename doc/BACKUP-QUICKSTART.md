# 🚀 Guia de Início Rápido - Gerenciador de Backups

## ⚡ Instalação Rápida

```bash
# 1. Clone ou baixe o projeto
cd cockpit-scheduling-exec

# 2. Execute o instalador
sudo ./scripts/install-backup-manager.sh

# 3. Acesse o Cockpit
# https://seu-servidor:9090
```

## 📋 Configuração em 5 Minutos

### Passo 1: Adicione seus Diretórios 📁

1. Acesse **"Gerenciador de Backups"** no menu do Cockpit
2. Clique na aba **"⚙️ Configurações"**
3. Clique em **"➕ Adicionar Diretório"**
4. Configure seu primeiro diretório:
   ```
   Caminho: /home/user/backups
   Rótulo: Meus Backups
   Padrão: *.tar.gz, *.zip
   ```
5. Clique em **"Adicionar"**

### Passo 2: Configure o Email 📧

1. Ainda em **"⚙️ Configurações"**
2. No card **"📧 Configurações de Email"**:
   ```
   Email do Destinatário: seu@email.com
   Assunto: Backup - {{date}}
   Tamanho Máximo: 25 MB
   ```
3. Clique em **"💾 Salvar Configurações"**

### Passo 3: Gerencie seus Backups 📦

1. Volte para a aba **"📦 Lista de Backups"**
2. Seus backups aparecerão automaticamente!
3. Use as ações disponíveis:
   - **⬇️** para baixar
   - **📧** para enviar por email
   - **🗑️** para deletar

## 🎯 Casos de Uso Comuns

### Caso 1: Backup de Banco de Dados

```bash
# Criar backup do PostgreSQL
pg_dump -U postgres meudb > /backups/db_$(date +%Y%m%d).sql

# O arquivo aparecerá automaticamente no gerenciador!
```

**Configuração recomendada:**
- Caminho: `/backups`
- Padrão: `*.sql, *.sql.gz`
- Rótulo: `Backups do Banco`

### Caso 2: Backup de Websites

```bash
# Criar backup do site
tar -czf /backups/site_$(date +%Y%m%d).tar.gz /var/www/html
```

**Configuração recomendada:**
- Caminho: `/backups`
- Padrão: `*.tar.gz`
- Rótulo: `Backups do Site`

### Caso 3: Múltiplos Servidores

**Servidor de Banco:**
- Diretório: `/backups/database`
- Padrão: `*.sql.gz`

**Servidor de Aplicação:**
- Diretório: `/backups/app`
- Padrão: `*.tar.gz`

**Servidor de Arquivos:**
- Diretório: `/backups/files`
- Padrão: `*.zip`

## 🔧 Configuração Manual

Se preferir editar o arquivo de configuração diretamente:

```bash
# Editar configuração
nano ~/.backup-manager/config.json
```

```json
{
  "directories": [
    {
      "id": "1703778000000",
      "path": "/home/user/backups",
      "label": "Meus Backups",
      "pattern": "*.tar.gz",
      "addedAt": "2024-12-28T15:00:00.000Z"
    }
  ],
  "email": {
    "recipient": "admin@example.com",
    "subject": "Backup - {{date}}",
    "maxSize": 25
  },
  "version": "1.0.0"
}
```

## 📊 Exemplo de Workflow Completo

### 1. Criar Backup Automatizado

```bash
# Criar script de backup (backup-daily.sh)
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/user/backups"

# Backup do banco
mysqldump -u root -p mydb | gzip > "$BACKUP_DIR/db_$DATE.sql.gz"

# Backup de arquivos
tar -czf "$BACKUP_DIR/files_$DATE.tar.gz" /var/www/html

echo "Backup concluído: $DATE"
```

### 2. Agendar com Cron

```bash
# Editar crontab
crontab -e

# Adicionar linha (executar diariamente às 2h)
0 2 * * * /home/user/scripts/backup-daily.sh
```

### 3. Gerenciar no Cockpit

1. Acesse o Gerenciador de Backups
2. Veja os novos backups criados automaticamente
3. Use filtros para encontrar backups específicos
4. Envie backups importantes por email
5. Limpe backups antigos quando necessário

## 🎨 Dicas de Organização

### Estrutura de Diretórios Recomendada

```
/backups/
├── database/
│   ├── daily/
│   ├── weekly/
│   └── monthly/
├── website/
│   ├── full/
│   └── incremental/
└── system/
    ├── config/
    └── logs/
```

### Padrões de Nomenclatura

**Banco de Dados:**
```
db_[nome]_YYYYMMDD_HHMMSS.sql.gz
Exemplo: db_production_20241228_020000.sql.gz
```

**Website:**
```
site_[ambiente]_YYYYMMDD.tar.gz
Exemplo: site_production_20241228.tar.gz
```

**Sistema:**
```
system_[tipo]_YYYYMMDD.tar.gz
Exemplo: system_config_20241228.tar.gz
```

## 🔍 Filtros Úteis

### Encontrar Backups Recentes
- **Ordenar por:** Mais recentes
- **Buscar:** Deixe vazio

### Encontrar Backups Grandes
- **Ordenar por:** Maior tamanho
- **Buscar:** Deixe vazio

### Encontrar Backups de Banco
- **Buscar:** `.sql`
- **Diretório:** Backups do Banco

## 🛡️ Boas Práticas

### ✅ Faça
- ✅ Mantenha múltiplas cópias de backups importantes
- ✅ Teste a restauração regularmente
- ✅ Use nomes descritivos para diretórios
- ✅ Configure padrões específicos para cada tipo
- ✅ Limpe backups antigos periodicamente
- ✅ Verifique integridade dos backups

### ❌ Evite
- ❌ Armazenar backups apenas no mesmo servidor
- ❌ Nunca testar a restauração
- ❌ Usar nomes genéricos como "backup1", "backup2"
- ❌ Acumular backups indefinidamente
- ❌ Enviar backups muito grandes por email

## 📞 Suporte

### Problemas Comuns

**"Email não está sendo enviado"**
```bash
# Verificar configuração do mail
echo "Teste" | mail -s "Teste" seu@email.com

# Instalar mailutils se necessário
sudo apt-get install mailutils
```

**"Diretório não aparece"**
```bash
# Verificar permissões
ls -ld /caminho/do/diretorio

# Atualizar lista
Clique em "🔄 Atualizar Lista de Backups"
```

**"Arquivo não baixa"**
```bash
# Verificar permissões do arquivo
ls -l /caminho/do/arquivo

# Verificar se o usuário do Cockpit tem acesso
sudo chmod 644 /caminho/do/arquivo
```

## 🚀 Próximos Passos

1. **Automatizar Backups:**
   - Configure cron jobs
   - Use o módulo "Scripts & Agendamentos"

2. **Monitoramento:**
   - Configure alertas de sucesso/falha
   - Integre com ferramentas de monitoramento

3. **Backup Remoto:**
   - Configure rsync para servidores remotos
   - Integre com serviços de nuvem

4. **Documentação:**
   - Documente seu processo de backup
   - Crie runbooks de restauração

## 📚 Recursos Adicionais

- [Documentação Completa](BACKUP-MANAGER.md)
- [Schema de Configuração](config.schema.json)
- [Scripts de Exemplo](../scripts/backup/)

---

**Pronto para começar! 🎉**

Se tiver dúvidas, consulte a [documentação completa](BACKUP-MANAGER.md) ou abra uma issue no GitHub.

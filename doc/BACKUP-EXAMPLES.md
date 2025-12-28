# 🎬 Demonstração do Gerenciador de Backups

Este arquivo contém exemplos práticos de uso do Gerenciador de Backups.

## 📸 Fluxo de Trabalho Visual

### 1️⃣ Acesso Inicial

```
┌─────────────────────────────────────────────────────────────┐
│ 🚢 Cockpit - Painel de Administração                        │
├─────────────────────────────────────────────────────────────┤
│ ├─ 🖥️  Sistema                                              │
│ ├─ 📊 Logs                                                  │
│ ├─ 💾 Armazenamento                                         │
│ ├─ 🌐 Rede                                                  │
│ ├─ 👥 Contas                                                │
│ ├─ 📜 Scripts & Agendamentos                                │
│ └─ 🗄️  Gerenciador de Backups  ← NOVO!                     │
└─────────────────────────────────────────────────────────────┘
```

### 2️⃣ Dashboard Principal

```
╔═══════════════════════════════════════════════════════════════╗
║            🗄️ Gerenciador de Backups                         ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  ┏━━━━━━━━┓  ┏━━━━━━━━┓  ┏━━━━━━━━┓  ┏━━━━━━━━┓            ║
║  ┃   42   ┃  ┃    3   ┃  ┃ 1.2 GB ┃  ┃ 2h ago ┃            ║
║  ┃ Backups┃  ┃  Dirs  ┃  ┃ Total  ┃  ┃ Último ┃            ║
║  ┗━━━━━━━━┛  ┗━━━━━━━━┛  ┗━━━━━━━━┛  ┗━━━━━━━━┛            ║
║                                                               ║
║  ┌─────────────────────────────────────────────────────────┐ ║
║  │ 📦 Lista de Backups │ ⚙️ Configurações                  │ ║
║  └─────────────────────────────────────────────────────────┘ ║
║                                                               ║
║  🔍 Buscar: [________________]  📁 [Todos] 🔄 [Mais recentes]║
║                                                               ║
║  ☑️ Selecionar todos  ☐ Desmarcar todos                      ║
║                                    📤 Exportar  🗑️ Deletar    ║
║                                                               ║
║  ┌─────────────────────────────────────────────────────────┐ ║
║  │ ☑ 📦 db_backup_20241228.sql.gz                          │ ║
║  │   📅 28/12/2024 15:30 | 📁 Backups DB | 💾 125 MB       │ ║
║  │   ⬇️ Download  📧 Email  🗑️ Deletar                      │ ║
║  ├─────────────────────────────────────────────────────────┤ ║
║  │ ☐ 📦 site_backup_20241227.tar.gz                        │ ║
║  │   📅 27/12/2024 22:00 | 📁 Backups Site | 💾 45 MB      │ ║
║  │   ⬇️ Download  📧 Email  🗑️ Deletar                      │ ║
║  └─────────────────────────────────────────────────────────┘ ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
```

### 3️⃣ Adicionar Diretório

```
╔═══════════════════════════════════════════════════════════════╗
║  📁 Adicionar Diretório de Backup                    [X]      ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  Caminho do Diretório *                                       ║
║  ┌────────────────────────────────────────┐ [📂 Navegar]     ║
║  │ /home/user/backups                     │                  ║
║  └────────────────────────────────────────┘                  ║
║  Caminho completo do diretório onde os backups estão         ║
║                                                               ║
║  Rótulo (opcional)                                            ║
║  ┌────────────────────────────────────────┐                  ║
║  │ Backups do Banco de Dados              │                  ║
║  └────────────────────────────────────────┘                  ║
║  Nome amigável para identificar este diretório               ║
║                                                               ║
║  Padrão de Arquivo (opcional)                                 ║
║  ┌────────────────────────────────────────┐                  ║
║  │ *.sql.gz, *.sql                        │                  ║
║  └────────────────────────────────────────┘                  ║
║  Use * para todos ou especifique extensões separadas         ║
║                                                               ║
║                                   [Cancelar]  [➕ Adicionar]  ║
╚═══════════════════════════════════════════════════════════════╝
```

### 4️⃣ Tela de Configurações

```
╔═══════════════════════════════════════════════════════════════╗
║                    ⚙️ Configurações                          ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  ┌─────────────────────────────────┐ ┌─────────────────────┐ ║
║  │ 📁 Diretórios Monitorados       │ │ 📧 Config. Email    │ ║
║  ├─────────────────────────────────┤ ├─────────────────────┤ ║
║  │                                 │ │ Email Destinatário  │ ║
║  │ [➕ Adicionar Diretório]        │ │ ┌─────────────────┐ │ ║
║  │                                 │ │ │admin@example.com│ │ ║
║  │ ┌─────────────────────────────┐ │ │ └─────────────────┘ │ ║
║  │ │ 📁 Backups do Banco         │ │ │                     │ ║
║  │ │ /home/user/backups/db       │ │ │ Assunto do Email    │ ║
║  │ │ Padrão: *.sql.gz            │ │ │ ┌─────────────────┐ │ ║
║  │ │ Adicionado: 28/12/24        │ │ │ │Backup-{{date}}  │ │ ║
║  │ │                  [🗑️ Remover]│ │ │ └─────────────────┘ │ ║
║  │ └─────────────────────────────┘ │ │                     │ ║
║  │                                 │ │ Tamanho Máx. (MB)   │ ║
║  │ ┌─────────────────────────────┐ │ │ ┌─────────────────┐ │ ║
║  │ │ 📁 Backups do Site          │ │ │ │      25         │ │ ║
║  │ │ /var/www/backups            │ │ │ └─────────────────┘ │ ║
║  │ │ Padrão: *.tar.gz            │ │ │                     │ ║
║  │ │ Adicionado: 27/12/24        │ │ │ [💾 Salvar Config] │ ║
║  │ │                  [🗑️ Remover]│ │ │                     │ ║
║  │ └─────────────────────────────┘ │ └─────────────────────┘ ║
║  └─────────────────────────────────┘                         ║
║                                                               ║
║  ┌─────────────────────────────────────────────────────────┐ ║
║  │ 🛠️ Ações em Lote                                         │ ║
║  ├─────────────────────────────────────────────────────────┤ ║
║  │ [🔄 Atualizar Lista] [📦 Exportar Todos] [🗑️ Limpar]    │ ║
║  └─────────────────────────────────────────────────────────┘ ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
```

### 5️⃣ Modal de Envio por Email

```
╔═══════════════════════════════════════════════════════════════╗
║  📧 Enviar Backup por Email                          [X]      ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║  Arquivo(s) selecionado(s):                                   ║
║  ┌─────────────────────────────────────────────────────────┐ ║
║  │ 📦 db_backup_20241228.sql.gz (125 MB)                   │ ║
║  │ 📦 site_backup_20241227.tar.gz (45 MB)                  │ ║
║  └─────────────────────────────────────────────────────────┘ ║
║                                                               ║
║  Para:                                                        ║
║  ┌─────────────────────────────────────────────────────────┐ ║
║  │ admin@example.com                                        │ ║
║  └─────────────────────────────────────────────────────────┘ ║
║                                                               ║
║  Mensagem (opcional):                                         ║
║  ┌─────────────────────────────────────────────────────────┐ ║
║  │ Backups do dia 28/12/2024                               │ ║
║  │ Banco de dados e website                                │ ║
║  │                                                          │ ║
║  │                                                          │ ║
║  └─────────────────────────────────────────────────────────┘ ║
║                                                               ║
║                                    [Cancelar]  [📨 Enviar]    ║
╚═══════════════════════════════════════════════════════════════╝
```

## 🎯 Casos de Uso Reais

### Cenário 1: Administrador de Sistema

**Situação**: Gerenciar backups diários de múltiplos servidores.

**Solução**:
1. Configurar diretórios:
   - `/backups/db` - Backups de bancos de dados
   - `/backups/config` - Configurações do sistema
   - `/backups/logs` - Logs importantes

2. Filtrar backups por:
   - Data: Ver backups de hoje
   - Tipo: Buscar apenas `.sql`
   - Tamanho: Identificar backups grandes

3. Ações:
   - Enviar backup do banco por email toda sexta
   - Deletar backups com mais de 30 dias
   - Exportar backups mensais para arquivo

### Cenário 2: Desenvolvedor

**Situação**: Manter backups de projetos e bancos de desenvolvimento.

**Solução**:
1. Configurar:
   - `/home/dev/backups/projects` - Código fonte
   - `/home/dev/backups/databases` - Dumps de DB

2. Workflow:
   - Antes de deploy: Criar backup manual
   - Ver lista de backups recentes
   - Baixar backup específico se necessário
   - Deletar backups de testes antigos

### Cenário 3: Pequena Empresa

**Situação**: Backup centralizado sem ferramentas caras.

**Solução**:
1. Configurar:
   - `/backups/financeiro` - Dados financeiros
   - `/backups/comercial` - Documentos comerciais
   - `/backups/rh` - Dados de RH

2. Processo:
   - Dashboard mostra visão geral
   - Busca rápida por documento
   - Envio automático para contador
   - Limpeza periódica de backups antigos

## 🚀 Comandos Úteis

### Criar Backup Manual

```bash
# Banco de dados
mysqldump -u root -p mydb | gzip > /backups/db_$(date +%Y%m%d).sql.gz

# Diretório completo
tar -czf /backups/site_$(date +%Y%m%d).tar.gz /var/www/html

# PostgreSQL
pg_dump -U postgres mydb | gzip > /backups/postgres_$(date +%Y%m%d).sql.gz
```

### Verificar Integridade

```bash
# Testar arquivo tar.gz
tar -tzf backup.tar.gz > /dev/null && echo "OK" || echo "Corrompido"

# Testar arquivo zip
unzip -t backup.zip && echo "OK" || echo "Corrompido"

# Usando o script
/usr/share/cockpit/scheduling_exec/scripts/backup/verify-backup.sh backup.tar.gz
```

### Restaurar Backup

```bash
# Restaurar tar.gz
tar -xzf backup.tar.gz -C /restore/path/

# Restaurar banco MySQL
gunzip < backup.sql.gz | mysql -u root -p mydb

# Usando o script
/usr/share/cockpit/scheduling_exec/scripts/backup/restore-backup.sh backup.tar.gz /restore/
```

### Automatizar com Cron

```bash
# Editar crontab
crontab -e

# Backup diário às 2h
0 2 * * * /home/user/scripts/backup-daily.sh

# Backup semanal aos domingos às 3h
0 3 * * 0 /home/user/scripts/backup-weekly.sh

# Limpeza mensal no dia 1 às 4h
0 4 1 * * /usr/share/cockpit/scheduling_exec/scripts/backup/cleanup-old-backups.sh /backups 30
```

## 📊 Métricas e Monitoramento

### Dashboard de Estatísticas

```
Total de Backups: 42
  ├─ Banco de Dados: 15 (35%)
  ├─ Website: 18 (43%)
  └─ Sistema: 9 (22%)

Tamanho Total: 1.2 GB
  ├─ Menor: 2.5 MB
  ├─ Médio: 28.5 MB
  └─ Maior: 125 MB

Diretórios: 3
  ├─ /backups/db (15 arquivos)
  ├─ /backups/site (18 arquivos)
  └─ /backups/system (9 arquivos)

Último Backup: 2 horas atrás
  ├─ Arquivo: db_backup_20241228.sql.gz
  └─ Tamanho: 125 MB
```

## 🎓 Dicas Profissionais

### ✅ Boas Práticas

1. **Regra 3-2-1**:
   - 3 cópias dos dados
   - 2 tipos de mídia diferentes
   - 1 cópia offsite

2. **Nomenclatura Consistente**:
   ```
   [tipo]_[ambiente]_YYYYMMDD_HHMMSS.[ext]
   db_production_20241228_020000.sql.gz
   ```

3. **Testes Regulares**:
   - Teste restauração mensalmente
   - Verifique integridade semanalmente
   - Documente o processo

4. **Retenção Inteligente**:
   - Diário: 7 dias
   - Semanal: 4 semanas
   - Mensal: 12 meses
   - Anual: Permanente

### 🔒 Segurança

1. **Permissões Corretas**:
   ```bash
   chmod 600 backup.tar.gz  # Apenas dono pode ler/escrever
   chown backup:backup /backups  # Usuário dedicado
   ```

2. **Criptografia** (opcional):
   ```bash
   # Criptografar backup
   gpg -c backup.tar.gz
   
   # Descriptografar
   gpg backup.tar.gz.gpg
   ```

3. **Auditoria**:
   - Mantenha log de quem acessa backups
   - Monitore alterações em diretórios de backup
   - Alerte sobre backups falhados

## 📞 Troubleshooting

### Problema: "Diretório vazio"
```bash
# Verificar permissões
ls -la /caminho/do/diretorio

# Adicionar permissões de leitura
chmod +r /caminho/do/diretorio/*
```

### Problema: "Email não enviado"
```bash
# Testar envio
echo "Teste" | mail -s "Assunto" seu@email.com

# Verificar logs
tail -f /var/log/mail.log
```

### Problema: "Backup corrompido"
```bash
# Verificar integridade
/usr/share/cockpit/scheduling_exec/scripts/backup/verify-backup.sh arquivo.tar.gz

# Se corrompido, restaurar de cópia alternativa
```

---

**Aproveite o Gerenciador de Backups! 🎉**

Para mais informações, consulte a [documentação completa](BACKUP-MANAGER.md).

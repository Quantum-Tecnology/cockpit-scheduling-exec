# 🗄️ Gerenciador de Backups - Cockpit Module

## 📋 Visão Geral

Módulo completo para gerenciamento de backups integrado ao Cockpit. Permite configurar diretórios de backup, visualizar, exportar, enviar por email e deletar arquivos de backup de forma centralizada e intuitiva.

## ✨ Funcionalidades

### 📁 Gerenciamento de Diretórios
- ➕ **Adicionar diretórios**: Configure múltiplos diretórios para monitoramento
- 🏷️ **Rótulos personalizados**: Dê nomes amigáveis aos seus diretórios
- 🔍 **Padrões de arquivo**: Filtre por extensões específicas (*.zip, *.tar.gz, *.sql, etc.)
- 🗑️ **Remover diretórios**: Remova diretórios da lista de monitoramento

### 📦 Lista de Backups
- 📊 **Visualização completa**: Nome, data, diretório, tamanho e ações
- 🔍 **Busca em tempo real**: Encontre backups rapidamente
- 🎯 **Filtros avançados**: Por diretório e ordenação customizada
- ☑️ **Seleção múltipla**: Ações em lote para múltiplos arquivos
- 📈 **Estatísticas**: Total de backups, diretórios, tamanho e último backup

### ⚡ Ações Disponíveis

#### Ações Individuais
- ⬇️ **Download**: Baixe backups diretamente
- 📧 **Enviar por email**: Envie backups para emails pré-configurados
- 🗑️ **Deletar**: Remove backups com confirmação

#### Ações em Lote
- 📤 **Exportar selecionados**: Crie um arquivo tar.gz com múltiplos backups
- 📦 **Exportar todos**: Exporte todos os backups de uma vez
- 🗑️ **Deletar selecionados**: Remova múltiplos backups
- 🧹 **Limpar backups antigos**: Remove backups com mais de X dias

### 📧 Configurações de Email
- 📮 **Destinatário padrão**: Configure email para envio rápido
- 📝 **Assunto personalizado**: Customize o assunto com variáveis
- 📏 **Limite de tamanho**: Defina tamanho máximo para anexos
- 📨 **Envio direto**: Envie backups com mensagem personalizada

### 📊 Dashboard de Estatísticas
- 📦 **Total de Backups**: Quantidade total de arquivos monitorados
- 📁 **Diretórios Monitorados**: Número de diretórios configurados
- 💾 **Tamanho Total**: Espaço ocupado por todos os backups
- ⏰ **Último Backup**: Data do backup mais recente

## 🚀 Instalação

### Pré-requisitos

```bash
# Instalar mailutils para envio de emails
sudo apt-get install mailutils

# Instalar zenity (opcional) para seleção visual de diretórios
sudo apt-get install zenity
```

### Instalação do Módulo

1. Copie os arquivos para o diretório do Cockpit:

```bash
# Copiar arquivos HTML e JS
sudo cp backup-manager.html /usr/share/cockpit/scheduling_exec/
sudo cp backup-manager.js /usr/share/cockpit/scheduling_exec/

# Copiar scripts
sudo mkdir -p /usr/share/cockpit/scheduling_exec/scripts/backup
sudo cp scripts/backup/*.sh /usr/share/cockpit/scheduling_exec/scripts/backup/

# Dar permissão de execução aos scripts
sudo chmod +x /usr/share/cockpit/scheduling_exec/scripts/backup/*.sh
```

2. Atualize o manifest.json (já incluído)

3. Reinicie o Cockpit:

```bash
sudo systemctl restart cockpit
```

## 📖 Como Usar

### 1️⃣ Configurar Diretórios

1. Acesse a aba **"⚙️ Configurações"**
2. Clique em **"➕ Adicionar Diretório"**
3. Selecione ou digite o caminho do diretório
4. (Opcional) Adicione um rótulo amigável
5. (Opcional) Especifique padrões de arquivo (ex: `*.zip, *.tar.gz`)
6. Clique em **"Adicionar"**

### 2️⃣ Visualizar Backups

1. Acesse a aba **"📦 Lista de Backups"**
2. Use os filtros para encontrar backups específicos:
   - 🔍 Busca por nome
   - 📁 Filtro por diretório
   - 🔄 Ordenação customizada

### 3️⃣ Gerenciar Backups

#### Download
- Clique no botão **⬇️** na linha do backup
- O arquivo será baixado automaticamente

#### Enviar por Email
1. Clique no botão **📧** ou selecione múltiplos e clique em **"📤 Enviar selecionados"**
2. Confirme ou altere o email do destinatário
3. (Opcional) Adicione uma mensagem personalizada
4. Clique em **"📨 Enviar"**

#### Deletar
- Clique no botão **🗑️** para deletar um backup
- Ou selecione múltiplos e clique em **"🗑️ Deletar selecionados"**
- Confirme a exclusão na modal

### 4️⃣ Configurar Email

1. Vá para **"⚙️ Configurações"**
2. No card **"📧 Configurações de Email"**:
   - Defina o email do destinatário padrão
   - Personalize o assunto (use `{{date}}` para incluir a data)
   - Configure o tamanho máximo de anexo
3. Clique em **"💾 Salvar Configurações"**

### 5️⃣ Ações em Lote

#### Exportar Todos
1. Na aba **"⚙️ Configurações"**
2. Clique em **"📦 Exportar Todos os Backups"**
3. Um arquivo tar.gz será criado em `~/backups-export-[data].tar.gz`

#### Limpar Backups Antigos
1. Clique em **"🗑️ Limpar Backups Antigos"**
2. Digite quantos dias de idade (ex: 30)
3. Confirme a exclusão

## 🛠️ Scripts Disponíveis

### `send-backup-email.sh`
Envia backups por email com suporte a múltiplos anexos.

```bash
./send-backup-email.sh <destinatario> <assunto> <arquivos> [mensagem]
```

**Exemplo:**
```bash
./send-backup-email.sh user@example.com "Backup DB" "/backups/db1.sql,/backups/db2.sql" "Backup diário"
```

### `create-backup.sh`
Cria um backup compactado de um diretório.

```bash
./create-backup.sh <origem> <destino> [nome]
```

**Exemplo:**
```bash
./create-backup.sh /var/www/html /backups website
# Resultado: /backups/website_20241228_153045.tar.gz
```

### `restore-backup.sh`
Restaura um backup compactado.

```bash
./restore-backup.sh <arquivo_backup> <destino>
```

**Exemplo:**
```bash
./restore-backup.sh /backups/db_backup.tar.gz /restore/
```

### `verify-backup.sh`
Verifica a integridade de um arquivo de backup.

```bash
./verify-backup.sh <arquivo_backup>
```

**Exemplo:**
```bash
./verify-backup.sh /backups/db_backup.tar.gz
```

### `cleanup-old-backups.sh`
Remove backups mais antigos que X dias.

```bash
./cleanup-old-backups.sh <diretorio> <dias>
```

**Exemplo:**
```bash
./cleanup-old-backups.sh /backups 30
```

## 📝 Arquivo de Configuração

As configurações são salvas em: `~/.backup-manager/config.json`

```json
{
  "directories": [
    {
      "id": "1703778000000",
      "path": "/home/user/backups",
      "label": "Backups do Sistema",
      "pattern": "*.tar.gz",
      "addedAt": "2024-12-28T15:00:00.000Z"
    }
  ],
  "email": {
    "recipient": "admin@example.com",
    "subject": "Backup do Sistema - {{date}}",
    "maxSize": 25
  },
  "version": "1.0.0",
  "lastUpdated": "2024-12-28T15:00:00.000Z"
}
```

## 🎨 Características de UI/UX

### Design Moderno
- 🎨 **PatternFly 4**: Interface consistente com o Cockpit
- 📱 **Responsivo**: Funciona em desktop, tablet e mobile
- 🌈 **Cards coloridos**: Estatísticas visualmente atraentes
- ⚡ **Animações suaves**: Transições e feedbacks visuais

### Usabilidade
- 🔍 **Busca instantânea**: Resultados em tempo real
- ☑️ **Seleção em massa**: Checkbox para ações múltiplas
- 📋 **Tooltips informativos**: Ajuda contextual
- 🚨 **Alertas claros**: Feedback de sucesso, erro e avisos

### Organização
- 📑 **Sistema de abas**: Separação clara entre lista e configurações
- 🗂️ **Filtros inteligentes**: Múltiplos critérios de busca
- 📊 **Ordenação flexível**: 6 opções de ordenação
- 📈 **Dashboard**: Visão geral rápida

## 🔒 Segurança

- ✅ **Confirmações**: Ações destrutivas requerem confirmação
- 🔐 **Permissões**: Respeita permissões do sistema de arquivos
- 🛡️ **Validações**: Verificação de diretórios e arquivos antes de operar
- 📧 **Limite de tamanho**: Previne envio de arquivos muito grandes por email

## 🐛 Troubleshooting

### Email não está sendo enviado
```bash
# Verificar se mailutils está instalado
dpkg -l | grep mailutils

# Instalar se necessário
sudo apt-get install mailutils

# Testar envio de email
echo "Teste" | mail -s "Assunto" seu@email.com
```

### Diretório não aparece na lista
```bash
# Verificar permissões do diretório
ls -ld /caminho/do/diretorio

# Verificar se o arquivo de configuração existe
cat ~/.backup-manager/config.json

# Recriar configuração se necessário
rm ~/.backup-manager/config.json
# Adicione os diretórios novamente pela interface
```

### Scripts não executam
```bash
# Verificar permissões dos scripts
ls -l /usr/share/cockpit/scheduling_exec/scripts/backup/

# Adicionar permissão de execução
sudo chmod +x /usr/share/cockpit/scheduling_exec/scripts/backup/*.sh
```

## 🚀 Melhorias Futuras

- [ ] **Agendamento automático**: Criar backups em horários programados
- [ ] **Compressão customizada**: Escolher nível de compressão
- [ ] **Upload para nuvem**: Integração com S3, Google Drive, etc.
- [ ] **Backup incremental**: Apenas alterações desde o último backup
- [ ] **Criptografia**: Proteção adicional para backups sensíveis
- [ ] **Notificações**: Alertas quando backup falha ou é concluído
- [ ] **Histórico de operações**: Log de todas as ações realizadas
- [ ] **Comparação de backups**: Diff entre versões
- [ ] **Backup de banco de dados**: Suporte direto para MySQL, PostgreSQL
- [ ] **Webhooks**: Notificar sistemas externos sobre eventos

## 📄 Licença

Este módulo é parte do projeto cockpit-scheduling-exec.

## 👨‍💻 Autor

**Luis Gustavo Santarosa Pinto**

---

## 📸 Screenshots

### Dashboard Principal
```
┌─────────────────────────────────────────────────────────┐
│ 🗄️ Gerenciador de Backups                              │
├─────────────────────────────────────────────────────────┤
│  ╔════════╗  ╔════════╗  ╔════════╗  ╔════════╗       │
│  ║   42   ║  ║    3   ║  ║ 1.2 GB ║  ║ 2h ago ║       │
│  ║Backups ║  ║  Dirs  ║  ║ Total  ║  ║ Último ║       │
│  ╚════════╝  ╚════════╝  ╚════════╝  ╚════════╝       │
├─────────────────────────────────────────────────────────┤
│ 📦 Lista de Backups | ⚙️ Configurações                 │
├─────────────────────────────────────────────────────────┤
│ 🔍 Buscar: [________________]  📁 [Todos] 🔄 [Recentes]│
│                                                          │
│ ☑️ Selecionar todos  ☐ Desmarcar                        │
│                                    📤 Exportar 🗑️ Deletar│
├─────────────────────────────────────────────────────────┤
│ ☑ 📄 database_backup_20241228.sql.gz | 28/12 15:30    │
│   📁 Backups do Banco | 💾 125 MB | ⬇️ 📧 🗑️           │
├─────────────────────────────────────────────────────────┤
│ ☐ 📦 website_backup_20241227.tar.gz | 27/12 22:00     │
│   📁 Backups do Site | 💾 45 MB | ⬇️ 📧 🗑️             │
└─────────────────────────────────────────────────────────┘
```

## 🎯 Casos de Uso

1. **Administrador de Sistema**: Gerenciar backups de múltiplos servidores
2. **Desenvolvedor**: Backups de código e bancos de dados de desenvolvimento
3. **DBA**: Gerenciar dumps de banco de dados
4. **DevOps**: Automatizar envio de backups por email
5. **Pequenas Empresas**: Gestão centralizada de backups sem ferramentas complexas

---

**Aproveite o Gerenciador de Backups! 🎉**

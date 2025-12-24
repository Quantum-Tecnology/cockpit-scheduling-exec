# Estrutura do Projeto - Cockpit Scheduling Exec

## 📁 Árvore Completa de Arquivos

```
cockpit-scheduling-exec/
│
├── 📋 DEBIAN/                              # Configuração do Pacote Debian
│   ├── control                             # Metadados do pacote (deps, versão, etc)
│   ├── postinst                            # Script pós-instalação
│   └── prerm                               # Script pré-remoção
│
├── 🌐 usr/share/cockpit/scheduling-exec/  # Arquivos do Plugin
│   │
│   ├── 📄 manifest.json                    # Manifesto do plugin Cockpit
│   ├── 🎨 index.html                       # Interface do usuário (UI)
│   ├── ⚙️ index.js                         # Lógica JavaScript (frontend)
│   │
│   └── 📂 scripts/                         # Scripts Backend (Bash)
│       ├── list-scripts.sh                 # Lista todos os scripts
│       ├── get-script.sh                   # Obtém conteúdo de um script
│       ├── save-script.sh                  # Cria/atualiza script
│       ├── delete-script.sh                # Remove script
│       ├── execute-script.sh               # Executa script + stats
│       ├── get-cron.sh                     # Obtém config cron
│       ├── set-cron.sh                     # Configura cron
│       ├── remove-cron.sh                  # Remove config cron
│       └── rotina.sh                       # Script de exemplo
│
├── 🔧 build.sh                             # Construir pacote .deb
├── 📦 install-manual.sh                    # Instalação manual
├── 🗑️ uninstall.sh                         # Desinstalação
│
├── 📚 Documentação
│   ├── README.md                           # Documentação completa
│   ├── QUICKSTART.md                       # Guia de início rápido
│   ├── CHANGELOG.md                        # Histórico de versões
│   ├── CONTRIBUTING.md                     # Guia de contribuição
│   └── STRUCTURE.md                        # Este arquivo
│
├── 📜 LICENSE                              # Licença MIT
└── 🚫 .gitignore                           # Arquivos ignorados pelo Git
```

## 🔄 Fluxo de Dados

```
┌─────────────────────────────────────────────────────────────┐
│                     COCKPIT WEB UI                          │
│                    (Navegador do Usuário)                   │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ HTTP/WebSocket
                         │
┌────────────────────────▼────────────────────────────────────┐
│                    COCKPIT SERVER                           │
│                  (cockpit-bridge)                           │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ cockpit.spawn()
                         │
┌────────────────────────▼────────────────────────────────────┐
│              PLUGIN SCRIPTS (Bash)                          │
│  ┌──────────────────────────────────────────────────┐      │
│  │  list-scripts.sh                                 │      │
│  │  save-script.sh                                  │      │
│  │  execute-script.sh                               │      │
│  │  set-cron.sh                                     │      │
│  │  ...                                             │      │
│  └──────────────────────────────────────────────────┘      │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ Lê/Escreve
                         │
┌────────────────────────▼────────────────────────────────────┐
│              ARMAZENAMENTO DO USUÁRIO                       │
│                                                             │
│  $HOME/scripts/              $HOME/.scripts-metadata/      │
│  ├── meu-backup.sh           ├── meu-backup.sh.json        │
│  ├── limpar-logs.sh          ├── meu-backup.sh.log         │
│  └── relatorio.sh            ├── limpar-logs.sh.json       │
│                               ├── limpar-logs.sh.log        │
│  crontab -l                   └── ...                       │
│  ├── 0 2 * * * script1                                     │
│  └── */30 * * * * script2                                  │
└─────────────────────────────────────────────────────────────┘
```

## 🎯 Componentes e Responsabilidades

### Frontend (index.html + index.js)

**Responsabilidades:**
- Renderizar interface do usuário
- Gerenciar modais (criar, editar, agendar)
- Comunicar com backend via cockpit.spawn()
- Exibir feedback ao usuário
- Validar entradas

**Principais Funções:**
- `loadScripts()` - Carrega lista de scripts
- `openCreateModal()` - Abre modal de criação
- `editScript()` - Abre modal de edição
- `executeScript()` - Executa script
- `openCronModal()` - Abre modal de agendamento
- `deleteScript()` - Remove script

### Backend Scripts (Bash)

#### list-scripts.sh
```bash
# Entrada: Nenhuma
# Saída: JSON array com todos os scripts e metadados
# Responsabilidade: Listar scripts com estatísticas
```

#### save-script.sh
```bash
# Entrada: <action> <script-name> + stdin (conteúdo)
# Saída: Mensagem de sucesso
# Responsabilidade: Criar ou atualizar script
```

#### execute-script.sh
```bash
# Entrada: <script-name>
# Saída: Output do script
# Responsabilidade: Executar script e atualizar stats
```

#### set-cron.sh
```bash
# Entrada: <script-name> <cron-expression>
# Saída: Mensagem de sucesso
# Responsabilidade: Adicionar/atualizar agendamento
```

## 📊 Formato de Dados

### Metadata JSON (scripts-metadata/*.json)

```json
{
  "created_at": 1703462400,          // Unix timestamp
  "updated_at": 1703548800,          // Unix timestamp
  "last_execution": 1703635200,      // Unix timestamp ou null
  "total_executions": 15,            // Contador total
  "successful_executions": 14        // Contador de sucessos
}
```

### Lista de Scripts (output de list-scripts.sh)

```json
[
  {
    "name": "backup.sh",
    "cron_expression": "0 2 * * *",
    "created_at": 1703462400,
    "updated_at": 1703548800,
    "last_execution": 1703635200,
    "total_executions": 15,
    "successful_executions": 14
  },
  {
    "name": "cleanup.sh",
    "cron_expression": "",
    "created_at": 1703462400,
    "updated_at": 1703462400,
    "last_execution": null,
    "total_executions": 0,
    "successful_executions": 0
  }
]
```

## 🔐 Permissões e Segurança

### Arquivos do Plugin
```
/usr/share/cockpit/scheduling-exec/
├── manifest.json          (644 - rw-r--r--)
├── index.html             (644 - rw-r--r--)
├── index.js               (644 - rw-r--r--)
└── scripts/
    ├── *.sh               (755 - rwxr-xr-x)
```

### Arquivos do Usuário
```
$HOME/scripts/
├── *.sh                   (755 - rwxr-xr-x)

$HOME/.scripts-metadata/
├── *.json                 (644 - rw-r--r--)
├── *.log                  (644 - rw-r--r--)
```

## 🚀 Ciclo de Vida de um Script

1. **Criação**
   - Usuário clica em "+ Novo Script"
   - Preenche nome e conteúdo
   - Frontend chama: `save-script.sh create nome.sh`
   - Backend cria arquivo em `~/scripts/`
   - Backend cria metadata em `~/.scripts-metadata/`
   - Frontend recarrega lista

2. **Edição**
   - Usuário clica em ✏ (Editar)
   - Frontend chama: `get-script.sh nome.sh`
   - Modal mostra conteúdo
   - Usuário modifica
   - Frontend chama: `save-script.sh update nome.sh`
   - Backend atualiza arquivo e metadata

3. **Execução Manual**
   - Usuário clica em ▶ (Play)
   - Frontend chama: `execute-script.sh nome.sh`
   - Backend executa script
   - Backend atualiza estatísticas
   - Frontend mostra output

4. **Agendamento**
   - Usuário clica em ⏰ (Relógio)
   - Frontend chama: `get-cron.sh nome.sh`
   - Modal mostra config atual (se existir)
   - Usuário configura horário
   - Frontend chama: `set-cron.sh nome.sh "0 2 * * *"`
   - Backend adiciona ao crontab

5. **Execução Agendada**
   - Cron dispara no horário configurado
   - Cron chama: `execute-script.sh nome.sh`
   - Output vai para `~/.scripts-metadata/nome.sh.log`
   - Estatísticas são atualizadas

6. **Remoção**
   - Usuário clica em 🗑️ (Lixeira)
   - Confirma ação
   - Frontend chama: `delete-script.sh nome.sh`
   - Backend remove do crontab
   - Backend remove arquivo e metadata

## 📦 Processo de Instalação

### Via Pacote Debian

```
1. build.sh
   ↓
2. dpkg-deb --build
   ↓
3. cockpit-scheduling-exec.deb
   ↓
4. apt install ou dpkg -i
   ↓
5. postinst executa
   ↓
6. Plugin disponível no Cockpit
```

### Via Instalação Manual

```
1. install-manual.sh
   ↓
2. Copia arquivos para /usr/share/cockpit/
   ↓
3. Configura permissões
   ↓
4. Reinicia Cockpit
   ↓
5. Plugin disponível no Cockpit
```

## 🔍 Debug e Logs

### Logs do Cockpit
```bash
sudo journalctl -u cockpit
```

### Logs do Plugin
```bash
# Ver log de execução de um script
cat ~/.scripts-metadata/nome-do-script.sh.log

# Ver todos os logs
ls -la ~/.scripts-metadata/*.log
```

### Testar Scripts Manualmente
```bash
# Executar script diretamente
bash ~/scripts/meu-script.sh

# Testar backend script
/usr/share/cockpit/scheduling-exec/scripts/list-scripts.sh

# Ver crontab
crontab -l
```

## 🛠️ Desenvolvimento

### Testar Mudanças Rapidamente

```bash
# 1. Editar arquivos
vim usr/share/cockpit/scheduling-exec/index.js

# 2. Copiar para instalação
sudo cp -r usr/share/cockpit/scheduling-exec/* \
  /usr/share/cockpit/scheduling-exec/

# 3. Recarregar no navegador
# (Ctrl + F5 no Cockpit)
```

### Adicionar Nova Funcionalidade

1. **Backend**: Criar script em `scripts/`
2. **Frontend**: Adicionar chamada em `index.js`
3. **UI**: Atualizar interface em `index.html`
4. **Docs**: Atualizar README e CHANGELOG
5. **Testar**: Instalar e testar no Cockpit

## 📈 Roadmap de Melhorias

- [ ] Editor com syntax highlighting
- [ ] Templates de scripts comuns
- [ ] Histórico de execuções
- [ ] Notificações de falhas
- [ ] Variáveis de ambiente
- [ ] Backup/restore de scripts
- [ ] Suporte a Python/Node.js
- [ ] Gráficos de estatísticas
- [ ] Busca e filtros
- [ ] Systemd timers

---

**Versão:** 1.0.0  
**Data:** 24/12/2025  
**Autor:** Gustavo Santarosa

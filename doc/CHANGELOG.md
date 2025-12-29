# Changelog

Todas as mudanças notáveis deste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

## [1.5.0] - 2025-12-28

### 🚀 Novidades Principais

#### ⚡ Sistema de Automação com Diretórios Configuráveis
- **Gerenciamento de diretórios**: Interface visual para adicionar/remover diretórios de scripts
- **Busca configurável**: Usuário escolhe onde seus scripts estão localizados
- **Busca recursiva opcional**: Escaneia subdiretórios com profundidade configurável
- **Caminho completo visível**: Coluna "Diretório" mostra origem de cada script
- **Auto-recarregamento**: Scripts são atualizados automaticamente após mudanças
- **Execução direta**: Scripts executados do local original (não há mais cópia)
- **Detecção de duplicatas**: Sistema evita listar scripts repetidos
- **Empty states contextuais**: Mensagens inteligentes diferenciando estados

### ✨ Melhorias

#### Interface de Automação
- **Novo card "📂 Diretórios de Scripts"**: Gestão visual completa
- **Tabela PatternFly**: Lista com Caminho, Rótulo, Recursivo, Ações
- **Badge recursivo**: Indicador visual se busca em subdiretórios
- **Rótulos personalizados**: Identifique facilmente cada diretório
- **Coluna Diretório**: Cada script mostra sua origem
- **Botões de ação**: Adicionar/remover diretórios com um clique

#### Funções JavaScript
- **automationRenderScriptDirectoriesList()**: Renderiza lista de diretórios
- **automationAddScriptDirectory()**: Adiciona novo diretório com validação
- **automationRemoveScriptDirectory()**: Remove diretório com confirmação
- **automationLoadScripts()**: Reescrita completa para busca em diretórios configurados
- **Execução/Edição/Exclusão**: Todas usam caminho completo do script original

#### Persistência e Configuração
- **scriptDirectories** salvo em `/var/lib/cockpit/backup-manager/config.json`
- **Estrutura**: `{path, label, maxDepth}` para cada diretório
- **Compatibilidade**: Mantém estrutura existente de configuração
- **Salvamento automático**: Após cada operação de add/remove

### 🔧 Correções
- Removidas colunas "Criado Em" e "Atualizado Em" da tabela (não eram usadas)
- Ajustado colspan do empty state de 8 para 7 colunas
- Logs detalhados com prefixo "Automation:" para debug
- Tratamento de erros por diretório individual
- Alertas informativos após cada operação

### 📚 Estrutura de Dados

```javascript
scriptDirectories = [
  {
    path: "/home/user/scripts",
    label: "Scripts Pessoais",
    maxDepth: 10  // 1 = não recursivo, 10 = recursivo
  }
]

allScripts = [
  {
    name: "backup.sh",
    path: "/home/user/scripts/backup.sh",  // Caminho completo
    directory: "Scripts Pessoais",
    // ... outros campos
  }
]
```

### 🎯 Benefícios
- ✅ Flexibilidade total na organização de scripts
- ✅ Não há mais localizações hardcoded
- ✅ Mesmo padrão visual do sistema de backups
- ✅ Scripts permanecem em suas localizações originais
- ✅ Suporte a múltiplos diretórios simultaneamente
- ✅ Interface intuitiva e consistente

---

## [1.4.0] - 2024-12-28

### 🚀 Novidades Principais

#### 💿 Sistema de Backup de VMs (NOVO!)
- **Descoberta automática de VMs**: Detecção via virsh de todas as máquinas virtuais
- **Detecção inteligente de discos**: Encontra .qcow2, .vmdk, .vdi em qualquer localização
- **Interface dedicada**: Nova aba "💿 Backup de VMs" com tabela interativa
- **Seleção múltipla**: Checkbox para escolher quais VMs fazer backup
- **Status em tempo real**: Badges coloridos (🟢 running / ⚫ stopped)
- **Estatísticas detalhadas**: Tamanho total, número de discos, caminhos
- **Log em tempo real**: Terminal-style com auto-scroll durante backup
- **Verificação de integridade**: Checksum SHA256 opcional
- **Retenção configurável**: Limpeza automática de backups antigos
- **Configuração persistente**: Destino, dias de retenção, verificação

#### 📧 Sistema de Email Melhorado
- **Suporte ao msmtp**: Prioridade para msmtp (mais leve que Postfix)
- **Detecção automática**: Verifica msmtp > mail > mailx
- **Teste de configuração**: Botão "🔧 Testar Configuração de Email"
- **Mensagens inteligentes**: Erros específicos com soluções
- **Guias completos**: EMAIL-SETUP-GUIDE.md e MSMTP-SETUP-GUIDE.md
- **Tratamento robusto**: Captura stderr e códigos de saída

#### 📦 Exportação Corrigida
- **Download automático**: Arquivo .tar.gz baixa direto no navegador
- **Limpeza automática**: Remove arquivo temporário após download
- **Feedback visual**: Alertas de progresso (criando → download)
- **Binário otimizado**: Usa cockpit.file() com binary: true

### ✨ Melhorias

#### Scripts de VM
- **discover-vms.sh**: 133 linhas - Descoberta completa de VMs e discos
- **backup-vm.sh**: 135 linhas - Backup individual com verificação
- **backup-all-vms.sh**: 226 linhas - Backup em lote com estatísticas
- **Validação de espaço**: Verifica disco antes de iniciar backup
- **Avisos de VM ativa**: Alerta quando VM está rodando
- **JSON estruturado**: Saída padronizada para parsing JavaScript

#### Interface de VM Backup
- **+200 linhas HTML**: Card completo com configurações e tabela
- **+400 linhas JavaScript**: 12 novas funções integradas
- **Responsividade**: Layout adaptável com PatternFly
- **Loading states**: Spinners durante operações assíncronas
- **Tooltips informativos**: Ajuda contextual em campos

#### Scripts de Email
- **send-backup-email.sh**: Suporte nativo ao msmtp
- **test-email.sh**: Diagnóstico completo de configuração
- **Códigos de saída**: Específicos por tipo de erro (1: params, 2: não instalado, 3: falha)
- **Instruções inline**: Comandos de instalação nos erros

### 📚 Documentação

#### Novos Guias
- **MSMTP-SETUP-GUIDE.md**: Configuração completa do msmtp
  - Instalação rápida
  - Exemplos Gmail, Outlook, SMTP próprio
  - Senhas de App
  - Troubleshooting
  - Comparação msmtp vs Postfix
  - Múltiplas contas
- **scripts/vm/README.md**: Documentação técnica dos scripts de VM
  - Descrição de cada script
  - Parâmetros e exemplos
  - Estrutura JSON de saída

#### Atualizações
- **EMAIL-SETUP-GUIDE.md**: Seção sobre alternativas (msmtp)

### 🐛 Correções

#### Exportação de Backups
- ✅ Corrigido: Download não iniciava no navegador
- ✅ Corrigido: Arquivo ficava preso em /tmp
- ✅ Melhorado: Feedback visual durante processo

#### Sistema de Email
- ✅ Corrigido: Erros genéricos sem contexto
- ✅ Corrigido: Falta de verificação de dependências
- ✅ Melhorado: Mensagens de erro específicas com soluções

### 🔧 Técnico

#### Arquitetura
- **Modularização**: Scripts de VM em diretório separado
- **Configuração unificada**: vmBackupConfig no config.json
- **Event-driven**: Listeners para todos os botões de VM
- **Error handling**: Try/catch em todas as funções async
- **Logging extensivo**: Console.log para debug em produção

#### Dependências
- **virsh**: Gerenciamento de VMs (libvirt-clients)
- **rsync**: Cópia eficiente de arquivos grandes
- **jq**: Parsing de JSON em bash
- **msmtp**: Envio de email leve (recomendado)
- **sha256sum**: Verificação de integridade

#### Performance
- **Checksum opcional**: Pode desabilitar para backups mais rápidos
- **Progresso otimizado**: rsync com --info=progress2
- **Limpeza assíncrona**: Remove temporários sem bloquear UI

### 📊 Estatísticas da Versão

- **Linhas adicionadas**: ~1.094
  - Bash: 494 linhas (3 scripts)
  - JavaScript: 400 linhas (12 funções)
  - HTML: 200 linhas (nova aba)
- **Arquivos criados**: 6
- **Arquivos modificados**: 4
- **Funções novas**: 12
- **Guias de documentação**: 2

### ⚠️ Limitações Conhecidas

1. **Dependências externas**: Requer virsh, rsync, jq instalados
2. **Backups grandes**: VMs de TB podem demorar horas
3. **VM em execução**: Backup pode ser inconsistente (avisar usuário)
4. **Sem restore na UI**: Restore deve ser manual via linha de comando
5. **Checksum lento**: SHA256 dobra tempo em arquivos grandes
6. **Logs não persistentes**: Log da UI é perdido ao fechar página

### 🔜 Próximas Versões

- [ ] Função de restore de VMs pela UI
- [ ] Snapshots LVM antes do backup
- [ ] Notificações por email de backups de VM
- [ ] Compressão de backups de VM
- [ ] Backup incremental/diferencial
- [ ] Agendamento cron para backups de VM
- [ ] Gráficos de histórico de backups

---

## [1.3.3] - 2024-12-28

### 🎨 UI/UX Premium - Transformação Completa

#### Modais Ultra Modernos
- **Background com blur**: Backdrop-filter com desfoque de 4px
- **Headers com gradientes**: Roxo (#667eea → #764ba2) com animação shimmer
- **Botão close circular**: Rotação de 90° e scale 1.1 ao hover
- **Animações suaves**: SlideUp com cubic-bezier e fadeIn
- **Scrollbar customizada**: Com gradiente roxo e hover effects
- **Sombras profundas**: Box-shadow com 20px e 60px para profundidade 3D

#### Botões com Gradientes
- **Primários**: Gradiente roxo (#667eea → #764ba2)
- **Secundários**: Gradiente rosa (#f093fb → #f5576c)
- **Terciários**: Gradiente azul (#4facfe → #00f2fe)
- **Danger**: Gradiente vermelho (#ff6b6b → #ee5a6f)
- **Efeito ripple**: Expansão de 300px ao hover
- **Elevação**: TranslateY(-2px) com sombra aumentada

#### Cards de Estatísticas
- **Bordas coloridas**: 4px no topo com 4 gradientes diferentes
- **Hover dramático**: TranslateY(-8px) com sombra de 24px
- **Transições suaves**: Cubic-bezier(0.4, 0, 0.2, 1)

#### Tabelas Aprimoradas
- **Header com gradiente**: Background #f5f7fa → #e9ecef
- **Hover nas linhas**: Scale(1.01) com sombra de 8px
- **Tipografia melhorada**: Text-transform uppercase, letter-spacing 0.5px
- **Bordas sutis**: Border-bottom #f1f3f5 em cada linha

#### Badges & Elementos
- **Badges arredondadas**: Border-radius 20px com sombra
- **Hover scale**: Transform scale(1.1) ao passar o mouse
- **Gradientes**: Verde (#51cf66 → #37b24d) e azul (#748ffc → #5c7cfa)

#### Alertas Modernos
- **Animação slideDown**: De -20px para 0 com ease
- **Gradientes por tipo**: Azul, verde, amarelo e vermelho
- **Border-left**: 4px colorida por severidade
- **Sombras**: Box-shadow de 12px com rgba

#### Dropdown de Ações
- **Botão gradiente**: Roxo com 36x36px circular
- **Rotação hover**: 90° com scale 1.1
- **Menu animado**: DropDown com cubic-bezier bounce
- **Items deslizantes**: TranslateX(8px) ao hover
- **Hover gradiente**: Items mudam para roxo com texto branco

#### Formulários
- **Inputs aprimorados**: Border 2px com transition
- **Focus azul**: Border #667eea com shadow rgba
- **Textarea monospace**: Monaco, Menlo, Ubuntu Mono
- **Placeholders itálicos**: Color #adb5bd

#### Cron Helper
- **Background gradiente**: Azul (#e3f2fd → #bbdefb)
- **Border colorida**: 5px #2196f3 à esquerda
- **Sombra suave**: 12px com rgba azul
- **Padding generoso**: var(--pf-global--spacer--lg)

#### Animações & Efeitos
- **FadeIn**: Opacity 0 → 1
- **SlideUp**: TranslateY(50px) → 0 com scale
- **SlideDown**: TranslateY(-20px) → 0
- **DropDown**: TranslateY(-20px) com bounce
- **Shimmer**: Background deslizante no header
- **Pulse**: Spinner com scale 1 → 1.1
- **Ripple**: Expansão circular nos botões

#### Títulos & Tipografia
- **Título com gradiente**: -webkit-background-clip: text
- **Gradient text**: Roxo com text-fill-color transparent
- **Font-weight**: 800 para títulos principais

### 🔧 Melhorias Técnicas
- **Scrollbar customizada**: ::-webkit-scrollbar com 10px
- **Border-radius**: 16px em cards, 12px em tabelas, 8px em inputs
- **Z-index hierarchy**: Modal 1000, header 2, botão close 2
- **Overflow hidden**: Em cards e modais para bordas limpas

### 🌟 Experiência Premium
Interface agora no **nível de aplicações SaaS premium** com:
- Animações suaves e naturais
- Gradientes em todos os elementos interativos
- Feedback visual instantâneo
- Profundidade e hierarquia visual clara
- Consistência de design em 100% da interface

## [1.3.2] - 2024-12-28

### 🐛 Corrigido
- **Erro ao salvar configuração**: Corrigido problema onde mensagens de erro não eram exibidas corretamente devido a `error.message` undefined
- **Tratamento de erros**: Implementado tratamento robusto com `error?.message || error?.toString()` em todas as operações
- **Visibilidade das abas**: Garantida visibilidade permanente das abas com `!important` no CSS e inicialização explícita
- **Navegação de abas**: Adicionada chamada `switchTab("backups")` na inicialização para garantir estado consistente

### 🎨 Melhorias de UI
- **Menu de Scripts**: Redesenhado com o mesmo padrão visual do backup manager
- **Cards de estatísticas**: Total Scripts, Agendados, Em Execução, Últimas Falhas
- **Seção de filtros**: Busca por nome, ordenação (6 opções), filtro de status
- **Visual aprimorado**: Hover effects, animações suaves, badges melhoradas
- **Responsividade**: Layout totalmente responsivo em todos os dispositivos

### ⚙️ Técnico
- Cache de scripts em `allScripts[]` para melhor performance
- Funções `updateStatCards()` e `applyFilters()` para gestão dinâmica de estado
- Consistência visual entre módulos de scripts e backups

## [1.3.1] - 2024-12-28

### 🐛 Corrigido
- **Navegação de abas**: Corrigido problema onde as abas desapareciam ao acessar a aba "Configurações"
- **Busca recursiva**: Implementado suporte completo para estruturas hierárquicas de diretórios
- **Profundidade configurável**: Adicionado campo para controlar níveis de subdiretórios (1-50 níveis)
- **Exibição de caminho**: Backups agora mostram o caminho relativo completo do arquivo
- **Busca aprimorada**: Busca agora procura também nos caminhos relativos dos arquivos
- **Ordenação por caminho**: Adicionadas opções de ordenação por caminho (A-Z e Z-A)
- **Ícones expandidos**: Reconhecimento de mais tipos de arquivo (.qcow2, .dump, .tar.gz, etc.)

### 📝 Documentação
- Adicionado [BACKUP-HIERARCHICAL.md](BACKUP-HIERARCHICAL.md) - Guia completo para estruturas hierárquicas
- Exemplos de configuração para diretórios organizados por data
- Casos de uso práticos para VMs e bancos de dados

## [1.3.0] - 2024-12-28

### 🎉 Adicionado - Gerenciador de Backups
- **Novo módulo completo de gerenciamento de backups**
- Interface dedicada para organização e gerenciamento de backups
- Configuração de múltiplos diretórios de monitoramento
- Suporte a padrões de arquivo personalizados (*.zip, *.tar.gz, etc.)
- Listagem completa de backups com informações detalhadas:
  - Nome do arquivo
  - Data de criação
  - Diretório de origem
  - Tamanho do arquivo
- Dashboard com estatísticas em tempo real:
  - Total de backups
  - Diretórios monitorados
  - Tamanho total ocupado
  - Data do último backup
- Sistema de busca e filtros avançados:
  - Busca por nome de arquivo
  - Filtro por diretório
  - 6 opções de ordenação (data, tamanho, nome)
- Seleção múltipla de backups com checkbox
- Ações disponíveis:
  - Download direto de backups
  - Envio por email (individual ou em lote)
  - Exclusão (individual ou em lote)
  - Exportação de múltiplos backups em tar.gz
- Configurações de email:
  - Email do destinatário padrão
  - Assunto personalizável com variáveis
  - Limite de tamanho para anexos
- Scripts utilitários incluídos:
  - `send-backup-email.sh` - Envio de backups por email
  - `create-backup.sh` - Criação de backups compactados
  - `restore-backup.sh` - Restauração de backups
  - `verify-backup.sh` - Verificação de integridade
  - `cleanup-old-backups.sh` - Limpeza de backups antigos
- Script de instalação automatizada
- Documentação completa em português:
  - Guia de uso detalhado
  - Guia de início rápido
  - Schema JSON de configuração
  - Exemplos práticos

### 🎨 Melhorado
- Interface com PatternFly 4 consistente
- Cards coloridos para estatísticas
- Animações suaves e feedback visual
- Design responsivo para mobile/tablet
- Sistema de alertas contextual
- Tooltips informativos

### 📝 Documentação
- Adicionado [BACKUP-MANAGER.md](BACKUP-MANAGER.md)
- Adicionado [BACKUP-QUICKSTART.md](BACKUP-QUICKSTART.md)
- Adicionado [config.schema.json](config.schema.json)
- Atualizado README.md principal

## [1.2.0] - 2025-12-26

### Adicionado
- Visualização de logs por script via modal (ordem desc)

## [1.2.1] - 2025-12-26

### Adicionado
- Execução de script como admin (sudo) via modal de senha
- Variáveis por script (arquivo `~/scripts/.env.<script>`)

### Alterado
- Modal de variáveis globais com melhor orientação visual (e botão renomeado)

## [1.2.2] - 2025-12-26

### Adicionado
- Listagem de agendamentos no modal do script (suporta múltiplos por script)
- Botão global “Agendamentos” para visualizar agendamentos e criar novos via select

### Corrigido
- Detecção/extração de agendamentos no crontab (linhas do wrapper `execute-script.sh`)

## [1.2.3] - 2025-12-26

### Alterado
- Bump de versão para 1.2.3

## [1.2.4] - 2025-12-26

### Alterado
- Bump de versão para 1.2.4
- Ações da tabela de scripts movidas para menu dropdown (reduz quantidade de botões)

## [1.2.5] - 2025-12-26

### Alterado
- Bump de versão para 1.2.5
- Modal de criar/editar script com visualização das variáveis carregadas (.env global e por script)
- Botão para copiar “script + variáveis” para facilitar suporte/uso com Copilot
## [1.2.6] - 2025-12-26

### Alterado
- Bump de versão para 1.2.6
- Importação de CSS refatorada para seguir o padrão do Cockpit (links estáticos em vez de JS dinâmico)
- CSP simplificada (removido fallback externo unpkg e unsafe-eval desnecessário)
- Adicionado atributo `lang="pt-BR"` no HTML
## [1.2.10] – 2025-12-26

### Corrigido

- **BUG CRÍTICO**: Variáveis de ambiente específicas do script (.env.<script>) não eram carregadas (SCRIPT_ENV_FILE definido antes de SCRIPT_NAME)
- Scripts com `set -u` falhavam com "unbound variable" ao referenciar variáveis do arquivo .env.<script>

## [1.2.9] – 2025-12-26

### Corrigido

- Erro JavaScript "expected expression, got '}'" ao clicar no dropdown (aspas conflitantes no onclick corrigidas)

## [1.2.8] – 2025-12-26

### Corrigido

- Dropdown de ações na tabela não era clicável (CSS customizado adicionado para posicionamento correto)
## [1.2.7] - 2025-12-26

### Alterado
- Bump de versão para 1.2.7
- Carregamento de CSS simplificado usando PatternFly 4 via CDN (unpkg)
- Removido loader JavaScript complexo que causava erros de DOM
## [1.1.0] - 2025-12-26

### Adicionado
- Editor de variáveis `~/scripts/.env` via modal na UI

### Alterado
- Execução/agendamentos passam a carregar `~/scripts/.env` antes de rodar o script

## [1.0.13] - 2025-12-25

### Adicionado
- Footer com versão do plugin e autor no canto inferior

### Corrigido
- Carregamento de CSS mais resiliente (tenta `shell/` e `branding/`, depois `base1/`/`static/`, com fallback via unpkg quando necessário)
- CSP explicitado para permitir CSS/fontes do unpkg (e `data:`) quando necessário
- Corrigido bind de eventos para salvar/criar script e salvar cron (evita falha ao clicar em "Salvar")
- Corrigido scanner do modal de importação (volta a listar scripts .sh elegíveis no HOME)

## [1.0.14] - 2025-12-25

### Alterado
- Bump de versão para 1.0.14

## [1.0.15] - 2025-12-26

### Alterado
- Bump de versão para 1.0.15
- Exibição do caminho do script em formato abreviado (ex.: `~/scripts/meu-script.sh`) na tabela
- Execução passa a exibir saída completa mesmo em caso de erro

## [1.0.12] - 2025-12-25

### Adicionado
- Botão "Buscar scripts" com modal para importar scripts existentes do HOME para `~/scripts`

### Corrigido
- UI passa a herdar o tema do Cockpit (remove dependência de PatternFly via CDN e evita cores hard-coded)

## [1.0.11] - 2025-12-25

### Corrigido
- Adicionado `label` na raiz do `manifest.json` (melhora a integração com o menu/navegação do Cockpit)

## [1.0.10] - 2025-12-25

### Corrigido
- Removida a exigência de versão mínima do Cockpit no `manifest.json` (evita o módulo ser ignorado e não aparecer no menu)

## [1.0.9] - 2025-12-25

### Corrigido
- `manifest.json` ajustado para `"version": 1` (melhora compatibilidade com Cockpit atual e visibilidade no menu)

## [1.0.8] - 2025-12-25

### Corrigido
- Migração do diretório do módulo Cockpit para `scheduling_exec` (evita problemas de detecção do pacote no Cockpit)
- Padronização de caminhos/documentação para `/usr/share/cockpit/scheduling_exec`

## [1.0.7] - 2025-12-25

### Corrigido
- Ajustes de publicação do repositório APT (nova tentativa de distribuição)

## [1.0.6] - 2025-12-25

### Corrigido
- Ajustes de CI/CD: build do .deb via diretório de staging (evita empacotar arquivos do repositório)

### Adicionado
- Workflow para publicar repositório APT no GitHub Pages (instalação via `apt install cockpit-scheduling-exec`)

## [1.0.5] - 2025-12-25

### Corrigido
- Adicionado campo `content-security-policy` no manifest.json para permitir recursos externos (unpkg.com)
- Corrigida estrutura do manifest.json para garantir que o módulo apareça no menu lateral do Cockpit

## [1.0.4] - 2025-01-XX

### Alterado
- **Interface completamente redesenhada seguindo padrões PatternFly e Cockpit**
- Migração para componentes PatternFly modernos:
  - Cards e seções com espaçamento adequado
  - Tabela com grid responsivo e classes semânticas
  - Modais com cabeçalho, corpo e rodapé estruturados
  - Botões com ícones FontAwesome
  - Badges para estatísticas
  - Alertas com ícones e formatação adequada
- Melhor hierarquia visual e organização de conteúdo
- Estado vazio com ícone e mensagem clara
- Formulários com labels e helpers text seguindo padrão
- Melhor responsividade mobile
- Paleta de cores consistente com Cockpit
- Espaçamentos usando variáveis CSS do PatternFly

### Corrigido
- Remoção de requisito de versão mínima do Cockpit no manifest.json que causava falha de detecção

## [1.0.3] - 2025-12-24

### Adicionado
- CI/CD com GitHub Actions para build e release automático
- Workflow para build automático de .deb no push para main
- Workflow para release automático em tags

## [1.0.0] - 2025-12-24

### Adicionado
- Interface web completa para gerenciamento de scripts
- Criação de scripts personalizados com editor de texto
- Edição de scripts existentes através de modal
- Execução manual de scripts com visualização de saída
- Sistema de agendamento via cron com interface visual
- Campos individuais para configuração de expressão cron
- Presets de agendamento comuns (diário, semanal, mensal, etc.)
- Listagem de scripts em tabela com informações detalhadas
- Sistema de metadados para rastreamento de estatísticas:
  - Data de criação
  - Data de última atualização
  - Data de última execução
  - Total de execuções
  - Número de execuções bem-sucedidas
  - Taxa de sucesso em porcentagem
- Visualização de próxima execução agendada
- Remoção de scripts e seus agendamentos
- Logs individuais de execução para cada script
- Scripts backend em Bash para todas as operações
- Armazenamento organizado em `$HOME/scripts`
- Metadados armazenados em `$HOME/.scripts-metadata`
- Integração completa com API do Cockpit
- Interface responsiva usando PatternFly
- Pacote Debian para instalação via apt
- Scripts de instalação manual
- Scripts de construção do pacote
- Script de desinstalação
- Documentação completa em português
- Guia de início rápido (QUICKSTART.md)
- Script de exemplo (rotina.sh)
- Licença MIT

### Segurança
- Scripts executados com permissões do usuário logado
- Armazenamento em diretório home do usuário
- Validação de nomes de arquivos (deve terminar em .sh)
- Permissões de execução aplicadas automaticamente

## [Unreleased]

### Planejado
- Editor de código com syntax highlighting
- Suporte a diferentes linguagens (Python, Node.js)
- Backup automático de scripts
- Histórico de execuções com saída completa
- Notificações de falha de execução
- Variáveis de ambiente personalizadas
- Templates de scripts comuns
- Exportar/importar scripts
- Busca e filtros na lista de scripts
- Gráficos de estatísticas
- Suporte a systemd timers como alternativa ao cron

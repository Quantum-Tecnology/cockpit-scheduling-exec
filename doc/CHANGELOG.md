# Changelog

Todas as mudanças notáveis deste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

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

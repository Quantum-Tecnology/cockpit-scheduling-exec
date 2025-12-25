# Changelog

Todas as mudanças notáveis deste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

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

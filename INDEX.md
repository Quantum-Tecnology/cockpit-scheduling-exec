# 📑 Índice do Projeto - Cockpit Scheduling Exec

Bem-vindo ao plugin Cockpit Scheduling Exec! Este índice ajuda você a navegar pela documentação do projeto.

## 🚀 Início Rápido

Para começar imediatamente:

1. **[QUICKSTART.md](QUICKSTART.md)** - Guia de início rápido
   - Instalação em 5 minutos
   - Primeiro script
   - Exemplos básicos

## 📚 Documentação Principal

### Para Usuários

- **[README.md](README.md)** - Documentação completa
  - Funcionalidades detalhadas
  - Instalação passo a passo
  - Guia de uso completo
  - Solução de problemas

- **[FAQ.md](FAQ.md)** - Perguntas frequentes
  - Problemas comuns e soluções
  - Dicas e truques
  - Exemplos práticos

### Para Desenvolvedores

- **[STRUCTURE.md](STRUCTURE.md)** - Arquitetura do projeto
  - Estrutura de arquivos
  - Fluxo de dados
  - Componentes e responsabilidades
  - Guia de desenvolvimento

- **[CONTRIBUTING.md](CONTRIBUTING.md)** - Como contribuir
  - Diretrizes de código
  - Processo de pull request
  - Convenções de commit

- **[CICD.md](CICD.md)** - CI/CD e Automação
  - Como funciona o build automático
  - Criar releases automaticamente
  - Troubleshooting de workflows
  - Melhores práticas

- **[.github/README.md](.github/README.md)** - Workflows GitHub Actions
  - Documentação técnica dos workflows
  - Configuração e permissões
  - Referências e exemplos
  - Checklist para contribuição

- **[CHANGELOG.md](CHANGELOG.md)** - Histórico de versões
  - Mudanças por versão
  - Funcionalidades adicionadas
  - Correções de bugs

## 📦 Arquivos do Projeto

### Configuração e Build

- **DEBIAN/control** - Metadados do pacote Debian
- **DEBIAN/postinst** - Script pós-instalação
- **DEBIAN/prerm** - Script pré-remoção
- **build.sh** - Construir pacote .deb
- **install-manual.sh** - Instalação manual
- **uninstall.sh** - Desinstalação

### Frontend (Interface Web)

- **usr/share/cockpit/scheduling-exec/manifest.json** - Manifesto do plugin
- **usr/share/cockpit/scheduling-exec/index.html** - Interface do usuário
- **usr/share/cockpit/scheduling-exec/index.js** - Lógica JavaScript

### Backend (Scripts Shell)

Localização: `usr/share/cockpit/scheduling-exec/scripts/`

**Scripts do Sistema:**
- **list-scripts.sh** - Lista todos os scripts
- **get-script.sh** - Obtém conteúdo de um script
- **save-script.sh** - Cria/atualiza script
- **delete-script.sh** - Remove script
- **execute-script.sh** - Executa script e atualiza estatísticas
- **get-cron.sh** - Obtém configuração cron
- **set-cron.sh** - Configura agendamento cron
- **remove-cron.sh** - Remove agendamento cron

**Scripts de Exemplo:**
- **rotina.sh** - Script básico de demonstração
- **backup-exemplo.sh** - Exemplo de backup
- **limpeza-logs-exemplo.sh** - Exemplo de limpeza
- **monitoramento-disco-exemplo.sh** - Exemplo de monitoramento
- **README-EXAMPLES.md** - Documentação dos exemplos

## 🎯 Guias por Tarefa

### Quero Instalar o Plugin

1. Leia: [QUICKSTART.md](QUICKSTART.md) → Seção "Instalação Rápida"
2. Escolha método de instalação
3. Siga os passos

### Quero Criar Meu Primeiro Script

1. Leia: [QUICKSTART.md](QUICKSTART.md) → Seção "Primeiro Uso"
2. Veja exemplos em: `usr/share/cockpit/scheduling-exec/scripts/`
3. Consulte: [FAQ.md](FAQ.md) → Seção "Uso Básico"

### Quero Agendar um Script

1. Leia: [README.md](README.md) → Seção "Agendar Execução"
2. Veja exemplos de cron: [FAQ.md](FAQ.md) → Seção "Agendamentos"
3. Use a interface visual no Cockpit

### Tenho um Problema

1. Verifique: [FAQ.md](FAQ.md) → Seção "Problemas Comuns"
2. Consulte: [README.md](README.md) → Seção "Solução de Problemas"
3. Veja logs: `~/.scripts-metadata/*.log`

### Quero Contribuir

1. Leia: [CONTRIBUTING.md](CONTRIBUTING.md)
2. Entenda: [STRUCTURE.md](STRUCTURE.md)
3. Faça fork e envie PR!

## 📖 Documentação por Nível

### Iniciante

**Começar aqui:**
1. [QUICKSTART.md](QUICKSTART.md) - Instalação e primeiro uso
2. Scripts de exemplo em `usr/share/cockpit/scheduling-exec/scripts/`
3. [FAQ.md](FAQ.md) - Perguntas básicas

### Intermediário

**Aprofundar conhecimento:**
1. [README.md](README.md) - Documentação completa
2. [FAQ.md](FAQ.md) - Casos de uso avançados
3. Personalização de scripts

### Avançado

**Desenvolvimento e contribuição:**
1. [STRUCTURE.md](STRUCTURE.md) - Arquitetura completa
2. [CONTRIBUTING.md](CONTRIBUTING.md) - Guia de contribuição
3. Código fonte em `usr/share/cockpit/scheduling-exec/`

## 🔍 Busca Rápida

### Por Funcionalidade

| Funcionalidade | Documentação | Código |
|----------------|--------------|--------|
| Criar script | [README.md](README.md#criar-um-novo-script) | index.js: `openCreateModal()` |
| Editar script | [README.md](README.md#editar-um-script) | index.js: `editScript()` |
| Executar script | [README.md](README.md#executar-um-script) | execute-script.sh |
| Agendar script | [README.md](README.md#agendar-execução-cron) | set-cron.sh |
| Ver estatísticas | [README.md](README.md#metadados-dos-scripts) | list-scripts.sh |

### Por Problema

| Problema | Solução |
|----------|---------|
| Plugin não aparece | [FAQ.md](FAQ.md#o-plugin-não-aparece-no-menu-do-cockpit) |
| Script não executa | [FAQ.md](FAQ.md#meu-script-não-funciona-quando-agendado-mas-funciona-manualmente) |
| Erro de permissão | [FAQ.md](FAQ.md#erro-permission-denied) |
| Cron não funciona | [README.md](README.md#agendamento-não-funciona) |

## 🗂️ Estrutura de Diretórios

```
cockpit-scheduling-exec/
│
├── 📘 Documentação
│   ├── README.md              (Principal)
│   ├── QUICKSTART.md          (Início rápido)
│   ├── FAQ.md                 (Perguntas)
│   ├── STRUCTURE.md           (Arquitetura)
│   ├── CONTRIBUTING.md        (Contribuir)
│   ├── CHANGELOG.md           (Versões)
│   └── INDEX.md               (Este arquivo)
│
├── 🔧 Scripts de Build
│   ├── build.sh
│   ├── install-manual.sh
│   └── uninstall.sh
│
├── 📦 Configuração Debian
│   └── DEBIAN/
│       ├── control
│       ├── postinst
│       └── prerm
│
├── 🌐 Plugin Cockpit
│   └── usr/share/cockpit/scheduling-exec/
│       ├── manifest.json
│       ├── index.html
│       ├── index.js
│       └── scripts/
│           ├── (scripts do sistema)
│           └── (exemplos)
│
└── 📄 Outros
    ├── LICENSE
    └── .gitignore
```

## 📞 Contato e Suporte

- **Email**: gustavo@quantumtecnology.com.br
- **Issues**: Reportar bugs ou sugerir melhorias
- **Pull Requests**: Contribuições são bem-vindas!

## 📜 Licença

Este projeto está sob a licença MIT. Veja [LICENSE](LICENSE) para detalhes.

## 🎓 Recursos Externos

- [Documentação do Cockpit](https://cockpit-project.org/guide/latest/)
- [Tutorial de Bash](https://www.gnu.org/software/bash/manual/)
- [Cron Guru](https://crontab.guru/) - Gerador de expressões cron
- [ShellCheck](https://www.shellcheck.net/) - Validar scripts shell

---

## 📊 Mapa de Navegação

```
Você está aqui → INDEX.md
│
├─ Quero usar o plugin
│  ├─→ QUICKSTART.md (Começar rápido)
│  ├─→ README.md (Documentação completa)
│  └─→ FAQ.md (Perguntas frequentes)
│
├─ Quero desenvolver/contribuir
│  ├─→ STRUCTURE.md (Entender arquitetura)
│  ├─→ CONTRIBUTING.md (Como contribuir)
│  └─→ Código fonte em usr/share/cockpit/scheduling-exec/
│
└─ Tenho um problema
   ├─→ FAQ.md (Soluções rápidas)
   └─→ README.md → Solução de Problemas
```

---

**Versão**: 1.0.0  
**Última Atualização**: 24/12/2025  
**Autor**: Gustavo Santarosa

**Dica**: Use Ctrl+F para buscar tópicos específicos neste índice!

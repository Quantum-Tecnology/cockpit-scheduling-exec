# Arquitetura Modular - Backup Manager

## Estrutura de Diretórios

```
scheduling_exec/
├── backup-manager.html          # Arquivo principal (legado/monolítico)
├── backup-manager-modular.html  # Versão modular (nova)
├── backup-manager.js            # Lógica JavaScript principal
├── manifest.json                # Manifest do Cockpit
│
├── css/
│   └── backup-manager.css       # Estilos CSS separados
│
├── js/
│   └── template-loader.js       # Carregador de templates
│
├── templates/
│   ├── tab-backups.html         # Template da aba Lista de Backups
│   ├── tab-config.html          # Template da aba Configurações
│   ├── tab-vms.html             # Template da aba Backup de VMs
│   ├── tab-automation.html      # Template da aba Automação
│   ├── tab-schedules.html       # Template da aba Agendamentos
│   │
│   └── modals/
│       ├── modal-add-directory.html      # Modal para adicionar diretório
│       ├── modal-add-script-dir.html     # Modal para adicionar diretório de scripts
│       ├── modal-confirm-delete.html     # Modal de confirmação de exclusão
│       ├── modal-email.html              # Modal de envio por email
│       ├── modal-directory-browser.html  # Modal navegador de diretórios
│       ├── modal-cron.html               # Modal de configuração cron
│       ├── modal-script.html             # Modal de criação/edição de script
│       ├── modal-env.html                # Modal de variáveis de ambiente
│       ├── modal-logs.html               # Modal de logs do script
│       └── modal-schedule.html           # Modal de agendamento
│
└── scripts/                     # Scripts shell auxiliares
    ├── backup_vms.sh
    ├── backup_postgres.sh
    └── ...
```

## Como Usar

### Carregamento de Templates

O `TemplateLoader` permite carregar templates HTML de forma assíncrona:

```javascript
// Carregar um único template
await TemplateLoader.loadInto('tab-backups', '#container');

// Carregar múltiplos templates
await TemplateLoader.loadMultiple([
  { name: 'tab-backups', target: '#container', position: 'append' },
  { name: 'tab-config', target: '#container', position: 'append' }
]);

// Carregar modal
const modalHtml = await TemplateLoader.loadModal('add-directory');
```

### Posições de Inserção

- `replace`: Substitui o conteúdo do elemento (padrão)
- `append`: Adiciona ao final do elemento
- `prepend`: Adiciona no início do elemento

## Migração

Para migrar do arquivo monolítico para a versão modular:

1. **Extrair Templates**: Copie cada seção do HTML para seu respectivo arquivo de template
2. **Extrair CSS**: Mova os estilos para `css/backup-manager.css`
3. **Atualizar Imports**: Referencie o CSS e o template-loader no HTML principal
4. **Testar**: Verifique se todos os templates carregam corretamente

## Benefícios

- **Manutenibilidade**: Cada componente em seu próprio arquivo
- **Reutilização**: Templates podem ser reutilizados em diferentes páginas
- **Performance**: Cache de templates carregados
- **Colaboração**: Diferentes desenvolvedores podem trabalhar em diferentes arquivos
- **Debugging**: Mais fácil encontrar e corrigir bugs em arquivos menores

## Versão

v1.5.0 — Luis Gustavo Santarosa Pinto

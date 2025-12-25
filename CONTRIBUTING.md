# Contribuindo para Cockpit Scheduling Exec

Obrigado pelo interesse em contribuir! Este documento fornece diretrizes para contribuições ao projeto.

## 🎯 Como Contribuir

### Reportar Bugs

Se você encontrou um bug, abra uma issue incluindo:

1. **Descrição clara** do problema
2. **Passos para reproduzir** o bug
3. **Comportamento esperado** vs **comportamento atual**
4. **Ambiente**:
   - Versão do Cockpit
   - Distribuição Linux e versão
   - Versão do plugin
5. **Logs relevantes** (se aplicável)

### Sugerir Melhorias

Para sugerir novas funcionalidades:

1. Verifique se já não existe uma issue similar
2. Descreva claramente a funcionalidade
3. Explique por que seria útil
4. Se possível, sugira uma implementação

### Pull Requests

1. **Fork** o repositório
2. **Clone** seu fork:
   ```bash
   git clone https://github.com/seu-usuario/cockpit-scheduling-exec.git
   ```

3. **Crie uma branch** para sua feature:
   ```bash
   git checkout -b feature/minha-feature
   ```

4. **Faça suas alterações** seguindo as diretrizes de código

5. **Teste** suas alterações:
   ```bash
   chmod +x install-manual.sh
   sudo ./install-manual.sh
   # Teste no Cockpit
   ```

6. **Commit** suas mudanças:
   ```bash
   git commit -m "Add: Descrição clara da mudança"
   ```

7. **Push** para sua branch:
   ```bash
   git push origin feature/minha-feature
   ```

8. **Abra um Pull Request** com descrição detalhada

## 📝 Diretrizes de Código

### JavaScript (index.js)

- Use `const` e `let`, evite `var`
- Funções descritivas e comentadas
- Tratamento de erros adequado
- Mensagens de erro amigáveis ao usuário

```javascript
// Bom
function loadScripts() {
    showLoading(true);
    
   cockpit.spawn(['/usr/share/cockpit/scheduling_exec/scripts/list-scripts.sh'])
        .then(output => {
            showLoading(false);
            const scripts = JSON.parse(output);
            renderScripts(scripts);
        })
        .catch(error => {
            showLoading(false);
            showError('Erro ao carregar scripts: ' + error.message);
        });
}
```

### HTML (index.html)

- Estrutura semântica
- Acessibilidade (alt, aria-labels)
- Classes CSS descritivas
- Comentários em seções principais

### Bash Scripts

- Sempre comece com `#!/bin/bash`
- Use `set -e` para falhar em erros
- Valide entradas
- Mensagens de erro no stderr
- Comentários explicativos

```bash
#!/bin/bash
# Descrição do que o script faz

set -e

PARAM="$1"

if [ -z "$PARAM" ]; then
    echo "Erro: Parâmetro obrigatório" >&2
    exit 1
fi

# Lógica do script...
```

### CSS

- Use classes, evite IDs para estilos
- Seletores específicos
- Comentários em seções
- Mobile-first quando aplicável

## 🧪 Testando

Antes de enviar um PR, teste:

1. **Instalação**:
   ```bash
   sudo ./install-manual.sh
   ```

2. **Funcionalidades básicas**:
   - Criar script
   - Editar script
   - Executar script
   - Agendar script
   - Remover script

3. **Casos extremos**:
   - Scripts com caracteres especiais
   - Scripts longos
   - Múltiplos agendamentos
   - Remover script agendado

4. **Compatibilidade**:
   - Teste em diferentes distribuições (se possível)
   - Verifique logs: `~/.scripts-metadata/*.log`

## 📚 Estrutura do Projeto

```
cockpit-scheduling-exec/
├── DEBIAN/              # Controle do pacote Debian
│   ├── control
│   ├── postinst
│   └── prerm
├── usr/share/cockpit/scheduling_exec/
│   ├── manifest.json    # Configuração do plugin
│   ├── index.html       # Interface do usuário
│   ├── index.js         # Lógica JavaScript
│   └── scripts/         # Scripts backend
│       ├── list-scripts.sh
│       ├── get-script.sh
│       ├── save-script.sh
│       ├── delete-script.sh
│       ├── execute-script.sh
│       ├── get-cron.sh
│       ├── set-cron.sh
│       ├── remove-cron.sh
│       └── rotina.sh
├── build.sh             # Construir pacote .deb
├── install-manual.sh    # Instalação manual
├── uninstall.sh         # Desinstalação
├── README.md
├── QUICKSTART.md
├── CHANGELOG.md
├── CONTRIBUTING.md
└── LICENSE
```

## 🎨 Convenções de Commit

Use prefixos descritivos:

- `Add:` Nova funcionalidade
- `Fix:` Correção de bug
- `Update:` Atualização de funcionalidade existente
- `Refactor:` Refatoração de código
- `Docs:` Mudanças na documentação
- `Style:` Formatação, espaços, etc.
- `Test:` Adição ou correção de testes
- `Chore:` Tarefas de manutenção

Exemplos:
```
Add: Suporte a variáveis de ambiente personalizadas
Fix: Correção de bug ao editar scripts com caracteres especiais
Update: Melhor tratamento de erros em agendamentos
Docs: Adicionar exemplos de scripts ao README
```

## 🔍 Code Review

Ao revisar PRs, verificamos:

1. **Funcionalidade**: O código faz o que promete?
2. **Qualidade**: Código limpo e manutenível?
3. **Testes**: Foi testado adequadamente?
4. **Documentação**: Mudanças documentadas?
5. **Compatibilidade**: Não quebra funcionalidades existentes?

## 📋 Checklist para PR

Antes de enviar, verifique:

- [ ] Código testado e funcionando
- [ ] Sem erros no console do navegador
- [ ] Scripts shell com permissões corretas
- [ ] Documentação atualizada (se necessário)
- [ ] CHANGELOG.md atualizado
- [ ] Commits com mensagens descritivas
- [ ] Código segue as convenções do projeto

## 🤝 Código de Conduta

- Seja respeitoso e construtivo
- Aceite feedback graciosamente
- Foque no que é melhor para o projeto
- Seja paciente com novos contribuidores

## 💬 Dúvidas?

Se tiver dúvidas sobre como contribuir:

1. Verifique a documentação existente
2. Procure em issues fechadas
3. Abra uma issue com sua dúvida
4. Entre em contato: gustavo@quantumtecnology.com.br

## 📜 Licença

Ao contribuir, você concorda que suas contribuições serão licenciadas sob a Licença MIT.

---

Obrigado por contribuir para tornar o Cockpit Scheduling Exec melhor! 🚀

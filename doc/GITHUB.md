# GitHub Actions Workflows

Este diretório contém os workflows automatizados para o projeto.

## 📋 Workflows Disponíveis

### 1. Build Debian Package (`build-debian.yml`)

**Quando executa:**
- Push para a branch `main`
- Pull Request para a branch `main`

**O que faz:**
1. Configura ambiente Ubuntu
2. Instala dependências (dpkg-dev)
3. Define permissões corretas para scripts
4. Constrói o pacote .deb
5. Verifica a integridade do pacote
6. Faz upload do .deb como artefato

**Artefato gerado:**
- `cockpit-scheduling-exec-deb` (disponível por 90 dias)

**Como baixar o artefato:**
1. Vá para a aba "Actions" no GitHub
2. Clique no workflow executado
3. Role até "Artifacts"
4. Baixe `cockpit-scheduling-exec-deb`

### 2. Release (`release.yml`)

**Quando executa:**
- Push de uma tag começando com `v*` (ex: `v1.0.0`, `v1.2.3`)

**O que faz:**
1. Configura ambiente Ubuntu
2. Extrai versão da tag
3. Atualiza o arquivo `DEBIAN/control` com a versão
4. Constrói o pacote .deb
5. Calcula checksums (SHA256 e MD5)
6. Cria release no GitHub com:
   - Arquivo .deb
   - Checksums
   - Notas de release automáticas
   - Instruções de instalação

**Como criar uma release:**

```bash
# 1. Atualizar CHANGELOG.md com as mudanças

# 2. Fazer commit das mudanças
git add .
git commit -m "Release: Versão 1.0.1"
git push

# 3. Criar tag
git tag -a v1.0.1 -m "Release version 1.0.1"

# 4. Enviar tag
git push origin v1.0.1

# O workflow será executado automaticamente e criará a release
```

## 🎯 Uso dos Workflows

### Desenvolvimento Normal

Ao fazer push para `main` ou abrir um PR:
- O workflow `build-debian.yml` será executado
- Um pacote .deb será construído e testado
- Você pode baixar o artefato para testes

### Criar Nova Versão

Quando quiser lançar uma nova versão:

1. **Atualizar CHANGELOG.md**
   ```markdown
   ## [1.0.1] - 2025-12-24
   
   ### Added
   - Nova funcionalidade X
   
   ### Fixed
   - Correção do bug Y
   ```

2. **Commit e push**
   ```bash
   git add CHANGELOG.md
   git commit -m "Update: Changelog para v1.0.1"
   git push
   ```

3. **Criar e enviar tag**
   ```bash
   git tag -a v1.0.1 -m "Release version 1.0.1"
   git push origin v1.0.1
   ```

4. **Aguardar workflow**
   - Vá para "Actions" no GitHub
   - Aguarde o workflow "Release" completar
   - A release será criada automaticamente

5. **Verificar release**
   - Vá para "Releases" no GitHub
   - Verifique a nova release
   - Baixe o .deb para distribuição

## 🔍 Verificar Status dos Workflows

### Via GitHub Web

1. Vá para a aba "Actions" no repositório
2. Veja todos os workflows executados
3. Clique em um workflow para ver detalhes

### Via Badge no README

Adicione badges ao README.md:

```markdown
![Build Status](https://github.com/QuantumTecnology/cockpit-scheduling-exec/actions/workflows/build-debian.yml/badge.svg)
![Release](https://github.com/QuantumTecnology/cockpit-scheduling-exec/actions/workflows/release.yml/badge.svg)
```

## 🐛 Troubleshooting

### Workflow falha no build

**Verifique:**
1. Permissões dos scripts estão corretas
2. Arquivo `DEBIAN/control` está válido
3. Estrutura de diretórios está correta

**Logs:**
- Clique no workflow falhado
- Expanda cada step para ver os logs

### Release não é criada

**Verifique:**
1. A tag foi enviada para o repositório
2. O formato da tag é `v*.*.*`
3. Permissões de escrita estão habilitadas para o workflow

**Permissões necessárias:**
- Settings → Actions → General → Workflow permissions
- Selecione "Read and write permissions"

### Artefato não disponível

**Possíveis causas:**
1. Workflow ainda está executando
2. Workflow falhou antes de fazer upload
3. Artefato expirou (90 dias)

## 📊 Métricas

Os workflows coletam as seguintes métricas:

- Tempo de build do pacote
- Tamanho do pacote .deb
- Sucesso/falha dos builds
- Frequência de releases

## 🔐 Segurança

### Secrets Necessários

Para funcionalidade completa, configure:

- `GITHUB_TOKEN` (automático, não precisa configurar)

### Permissões

Os workflows precisam de:
- `contents: write` - Para criar releases
- Permissões de leitura do repositório

## 📚 Referências

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Creating Releases](https://docs.github.com/en/repositories/releasing-projects-on-github/managing-releases-in-a-repository)
- [Workflow Syntax](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions)

## 💡 Dicas

1. **Teste localmente antes de fazer push**
   ```bash
   chmod +x scripts/build.sh
   ./scripts/build.sh
   ```

2. **Use tags semânticas**
   - `v1.0.0` - Major release
   - `v1.1.0` - Minor release (nova funcionalidade)
   - `v1.0.1` - Patch release (bug fix)

3. **Mantenha doc/CHANGELOG atualizado**
   - Documente todas as mudanças
   - Facilita criar release notes

4. **Revise artefatos antes de criar release**
   - Baixe e teste o .deb do workflow de build
   - Apenas crie tag quando tiver certeza

---

**Última atualização:** 24/12/2025

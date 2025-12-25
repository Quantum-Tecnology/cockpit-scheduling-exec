# 🤖 Guia de CI/CD - Cockpit Scheduling Exec

Este guia explica como o sistema de CI/CD funciona neste projeto.

## 📋 Visão Geral

O projeto usa **GitHub Actions** para automatizar:
- Build do pacote Debian
- Testes de integridade
- Criação de releases
- Distribuição de artefatos

## 🔄 Workflows

### 1. Build Automático (Continuous Integration)

**Arquivo:** `.github/workflows/build-debian.yml`

**Trigger:**
- Todo push para `main`
- Todo pull request para `main`

**Passos:**
1. Faz checkout do código
2. Instala ferramentas de build (dpkg-dev)
3. Define permissões para scripts
4. Constrói pacote .deb
5. Verifica integridade do pacote
6. Faz upload como artefato

**Resultado:**
- ✅ Build passa → Código está OK
- ❌ Build falha → Há problemas no código

### 2. Release Automático (Continuous Deployment)

**Arquivo:** `.github/workflows/release.yml`

**Trigger:**
- Push de tag com formato `v*` (ex: `v1.0.0`)

**Passos:**
1. Faz checkout do código
2. Extrai versão da tag
3. Atualiza arquivo DEBIAN/control
4. Constrói pacote .deb
5. Calcula checksums (SHA256, MD5)
6. Cria release no GitHub
7. Anexa arquivos à release

**Resultado:**
- Nova release publicada automaticamente
- Pacote .deb disponível para download
- Checksums para verificação

## 🚀 Como Usar

### Desenvolvimento Normal

```bash
# 1. Fazer mudanças no código
vim usr/share/cockpit/scheduling_exec/index.js

# 2. Commit e push
git add .
git commit -m "Add: Nova funcionalidade X"
git push origin main

# 3. GitHub Actions irá:
#    - Construir o pacote
#    - Executar verificações
#    - Disponibilizar artefato para teste
```

**Ver resultado:**
- Vá para [Actions](https://github.com/QuantumTecnology/cockpit-scheduling-exec/actions)
- Clique no último workflow "Build Debian Package"
- Veja os logs de cada step
- Baixe o artefato se o build passou

### Criar Nova Versão (Release)

#### Passo 1: Preparar Release

```bash
# Atualizar CHANGELOG.md
cat >> CHANGELOG.md << 'EOF'

## [1.0.1] - 2025-12-24

### Added
- Nova funcionalidade de backup automático

### Fixed
- Correção de bug no agendamento
EOF

# Commit
git add CHANGELOG.md
git commit -m "Docs: Update changelog for v1.0.1"
git push
```

#### Passo 2: Criar Tag

```bash
# Criar tag anotada
git tag -a v1.0.1 -m "Release version 1.0.1

Changelog:
- Nova funcionalidade de backup automático
- Correção de bug no agendamento
"

# Enviar tag para GitHub
git push origin v1.0.1
```

#### Passo 3: Aguardar Release

1. Vá para [Actions](https://github.com/QuantumTecnology/cockpit-scheduling-exec/actions)
2. Veja o workflow "Release" executando
3. Aguarde conclusão (~2-3 minutos)
4. Vá para [Releases](https://github.com/QuantumTecnology/cockpit-scheduling-exec/releases)
5. Verifique a nova release publicada

## 📦 Estrutura de Release

Cada release contém:

```
cockpit-scheduling-exec v1.0.1
├── cockpit-scheduling-exec_1.0.1_all.deb      # Pacote principal
├── cockpit-scheduling-exec_1.0.1_all.deb.sha256  # Checksum SHA256
├── cockpit-scheduling-exec_1.0.1_all.deb.md5     # Checksum MD5
└── Release Notes (geradas automaticamente)
```

## 🔍 Verificar Integridade

Usuários podem verificar a integridade do pacote:

```bash
# Baixar pacote e checksum
wget https://github.com/.../cockpit-scheduling-exec_1.0.1_all.deb
wget https://github.com/.../cockpit-scheduling-exec_1.0.1_all.deb.sha256

# Verificar
sha256sum -c cockpit-scheduling-exec_1.0.1_all.deb.sha256

# Se OK, instalar
sudo apt install ./cockpit-scheduling-exec_1.0.1_all.deb
```

## 🛠️ Troubleshooting

### Build Falha

**Problema:** Workflow "Build Debian Package" falha

**Soluções:**

1. **Erro de permissão:**
   ```bash
   # Localmente, verifique permissões
   ls -la usr/share/cockpit/scheduling_exec/scripts/
   
   # Corrigir se necessário
   chmod +x usr/share/cockpit/scheduling_exec/scripts/*.sh
   chmod +x DEBIAN/postinst DEBIAN/prerm
   ```

2. **Erro de sintaxe em control:**
   ```bash
   # Verificar arquivo DEBIAN/control
   cat DEBIAN/control
   
   # Deve seguir formato correto
   ```

3. **Estrutura de diretórios:**
   ```bash
   # Verificar estrutura
   tree -L 3
   ```

### Release Não Criada

**Problema:** Tag enviada mas release não aparece

**Soluções:**

1. **Formato da tag:**
   ```bash
   # Correto
   git tag -a v1.0.1 -m "Release"
   
   # Errado
   git tag -a 1.0.1 -m "Release"  # Falta 'v'
   ```

2. **Permissões:**
   - Settings → Actions → General
   - Workflow permissions: "Read and write permissions"
   - Allow GitHub Actions to create releases: ✓

3. **Verificar logs:**
   - Actions → Release workflow
   - Ver detalhes de cada step

### Artefato Não Disponível

**Problema:** Build passa mas artefato não está disponível

**Soluções:**

1. **Aguardar conclusão:**
   - Workflow pode levar 2-3 minutos
   - Recarregue a página

2. **Verificar step de upload:**
   - Clique no workflow
   - Expanda "Upload Debian package as artifact"
   - Veja se houve erro

3. **Prazo de retenção:**
   - Artefatos expiram em 90 dias
   - Releases nunca expiram

## 📊 Monitoramento

### Badges no README

Adicione badges para mostrar status:

```markdown
![Build Status](https://github.com/QuantumTecnology/cockpit-scheduling-exec/actions/workflows/build-debian.yml/badge.svg)
![Release](https://github.com/QuantumTecnology/cockpit-scheduling-exec/actions/workflows/release.yml/badge.svg)
```

### Notificações

Configure notificações:
1. Settings → Notifications
2. Actions: Ativar notificações
3. Receba emails quando builds falharem

## 🔐 Segurança

### Secrets

O projeto usa:
- `GITHUB_TOKEN` (automático) - Para criar releases

### Permissões Mínimas

Workflows têm apenas permissões necessárias:
```yaml
permissions:
  contents: write  # Para criar releases
```

### Verificação de Dependências

GitHub automaticamente verifica:
- Vulnerabilidades conhecidas
- Dependências desatualizadas
- Alertas de segurança

## 📈 Métricas

Acompanhe:
- **Build Success Rate:** % de builds bem-sucedidos
- **Build Time:** Tempo médio de build
- **Package Size:** Tamanho do .deb ao longo do tempo
- **Release Frequency:** Quantas releases por mês

Ver em: Actions → Insights

## 🎯 Melhores Práticas

### 1. Teste Localmente Primeiro

```bash
# Sempre teste antes de push
chmod +x build.sh
./build.sh

# Instale e teste
sudo apt install ./cockpit-scheduling-exec.deb
```

### 2. Commits Semânticos

```bash
# Use prefixos claros
git commit -m "Add: Nova funcionalidade"
git commit -m "Fix: Correção de bug"
git commit -m "Docs: Atualizar documentação"
```

### 3. Versionamento Semântico

- `v1.0.0` → `v2.0.0` - Breaking changes
- `v1.0.0` → `v1.1.0` - Nova funcionalidade
- `v1.0.0` → `v1.0.1` - Bug fix

### 4. Changelog Atualizado

Sempre atualize CHANGELOG.md antes de criar tag:
```markdown
## [1.0.1] - 2025-12-24

### Added
- Nova funcionalidade X

### Fixed
- Bug Y corrigido

### Changed
- Melhorado Z
```

### 5. Revisar PRs

- Use pull requests para mudanças grandes
- Aguarde build passar
- Revise código
- Merge para main

## 📚 Recursos

- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Workflow Syntax](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions)
- [Creating Releases](https://docs.github.com/en/repositories/releasing-projects-on-github)
- [Semantic Versioning](https://semver.org/)

## 💡 Dicas Rápidas

```bash
# Ver status de workflows
gh run list

# Ver logs de último workflow
gh run view --log

# Criar release manualmente
gh release create v1.0.1 ./cockpit-scheduling-exec.deb

# Listar releases
gh release list
```

---

**Dúvidas?** Veja [.github/README.md](.github/README.md) ou abra uma issue!

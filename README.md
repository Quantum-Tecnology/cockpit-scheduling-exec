# Cockpit Scheduling Exec

![Build Status](https://github.com/QuantumTecnology/cockpit-scheduling-exec/actions/workflows/build-debian.yml/badge.svg)
![Release](https://github.com/QuantumTecnology/cockpit-scheduling-exec/actions/workflows/release.yml/badge.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Version](https://img.shields.io/badge/version-1.6.30-green.svg)

Plugin para Cockpit que permite criar, editar, executar e agendar scripts shell personalizados através de uma interface web intuitiva. Agora com **Gerenciador de Backups** integrado!

## 🚀 Funcionalidades

### 📜 Scripts & Agendamentos

- ✅ **Criar Scripts Personalizados**: Interface amigável para criar scripts shell
- ✏️ **Editar Scripts**: Modal de edição com syntax highlighting
- ▶️ **Executar Scripts**: Execute scripts manualmente com um clique
- ⏰ **Agendar Execuções**: Configure agendamentos cron através de interface visual
- 📊 **Estatísticas**: Visualize estatísticas de execução de cada script
  - Data de criação
  - Data de última atualização
  - Data de última execução
  - Total de execuções
  - Taxa de sucesso
  - Próxima execução agendada
- 🗑️ **Remover Scripts**: Exclua scripts e seus agendamentos
- 📁 **Armazenamento Organizado**: Scripts salvos em `$HOME/scripts`

### 🗄️ Gerenciador de Backups (NOVO!)

- 📁 **Múltiplos Diretórios**: Monitore vários diretórios de backup
- 🌳 **Busca Recursiva**: Suporte completo para estruturas hierárquicas de diretórios
- 📦 **Listagem Inteligente**: Veja todos os backups com data, tamanho e caminho relativo
- 🔍 **Busca e Filtros**: Encontre backups por nome ou caminho
- 🎯 **Profundidade Configurável**: Controle quantos níveis de subdiretórios pesquisar
- ⬇️ **Download**: Baixe backups diretamente
- 📧 **Envio por Email**: Envie backups para emails pré-configurados
- 🗑️ **Gerenciamento**: Delete backups individuais ou em lote
- 📤 **Exportação**: Crie arquivos tar.gz com múltiplos backups
- 🧹 **Limpeza Automática**: Remove backups antigos com base em dias
- 📊 **Dashboard**: Estatísticas de backups em tempo real
- 🎨 **Ícones Inteligentes**: Reconhecimento automático de tipos (.qcow2, .dump, .sql.gz, etc.)

👉 [**Documentação Completa do Gerenciador de Backups**](doc/BACKUP-MANAGER.md)
👉 [**Guia de Início Rápido**](doc/BACKUP-QUICKSTART.md)
👉 [**Estruturas Hierárquicas**](doc/BACKUP-HIERARCHICAL.md)

## 📦 Instalação

### Pré-requisitos

- Cockpit instalado e em execução
- Sistema operacional Linux (Debian/Ubuntu recomendado)
- Cron instalado

### Download da Release (Recomendado)

Baixe o pacote .deb mais recente da [página de releases](https://github.com/QuantumTecnology/cockpit-scheduling-exec/releases):

```bash
# Baixar última versão
wget https://github.com/QuantumTecnology/cockpit-scheduling-exec/releases/latest/download/cockpit-scheduling-exec_1.0.8_all.deb

# Instalar
sudo apt install ./cockpit-scheduling-exec_1.0.8_all.deb
```

### Instalação via APT (repositório oficial)

Depois que o repositório APT deste projeto estiver publicado no GitHub Pages, você pode instalar sem baixar o `.deb` manualmente.

1. Importar a chave do repositório:
```bash
curl -fsSL https://quantum-tecnology.github.io/cockpit-scheduling-exec/gpg.key \
  | sudo gpg --dearmor --yes -o /usr/share/keyrings/cockpit-scheduling-exec-archive-keyring.gpg
```

2. Adicionar o repositório:
```bash
echo "deb [signed-by=/usr/share/keyrings/cockpit-scheduling-exec-archive-keyring.gpg] https://quantum-tecnology.github.io/cockpit-scheduling-exec stable main" \
  | sudo tee /etc/apt/sources.list.d/cockpit-scheduling-exec.list > /dev/null
```

3. Instalar:
```bash
sudo apt update
sudo apt install cockpit-scheduling-exec
```

Atualização:
```bash
sudo apt update
sudo apt upgrade
```
```

### Construir o Pacote Debian

Se preferir construir o pacote você mesmo:

1. Clone o repositório:
```bash
git clone https://github.com/QuantumTecnology/cockpit-scheduling-exec.git
cd cockpit-scheduling-exec
```

2. Construa o pacote .deb:
```bash
chmod +x scripts/build.sh
./scripts/build.sh
```

3. Instale o pacote:
```bash
sudo apt install ./build/cockpit-scheduling-exec_*_all.deb
```

Ou usando dpkg:
```bash
sudo dpkg -i build/cockpit-scheduling-exec_*_all.deb
sudo apt-get install -f  # Resolve dependências se necessário
```

### Instalação Manual (sem pacote)

Se preferir instalar manualmente sem construir o pacote:

```bash
# Copiar arquivos para o diretório do Cockpit
sudo mkdir -p /usr/share/cockpit/scheduling_exec
sudo cp -r usr/share/cockpit/scheduling_exec/* /usr/share/cockpit/scheduling_exec/

# Dar permissões de execução aos scripts
sudo chmod +x /usr/share/cockpit/scheduling_exec/scripts/*.sh

# Reiniciar o Cockpit
sudo systemctl restart cockpit
```

## 🎯 Uso

### Acessar o Plugin

1. Abra o Cockpit no seu navegador: `https://seu-servidor:9090`
2. Faça login com suas credenciais
3. No menu lateral, clique em "Scripts & Agendamentos"

### Criar um Novo Script

1. Clique no botão **"+ Novo Script"** no topo da página
2. Digite o nome do script (deve terminar com `.sh`)
3. Escreva o código do seu script no editor
4. Clique em **"Salvar"**

### Executar um Script

- Na tabela de scripts, clique no botão **▶** (Play) na linha do script desejado
- O script será executado imediatamente e você verá a saída

### Agendar Execução (Cron)

1. Na tabela de scripts, clique no botão **⏰** (Relógio)
2. Configure a expressão cron:
   - Use os campos individuais (Minuto, Hora, Dia, Mês, Dia da Semana)
   - Ou escolha um modelo pré-definido
3. Clique em **"Salvar Agendamento"**

#### Exemplos de Expressões Cron

- `* * * * *` - A cada minuto
- `*/5 * * * *` - A cada 5 minutos
- `0 * * * *` - A cada hora
- `0 0 * * *` - Diariamente à meia-noite
- `0 12 * * *` - Diariamente ao meio-dia
- `0 0 * * 0` - Semanalmente aos domingos
- `0 0 1 * *` - Mensalmente no dia 1

### Editar um Script

1. Clique no botão **✏** (Lápis) na linha do script
2. Modifique o conteúdo
3. Clique em **"Salvar"**

### Remover um Script

1. Clique no botão **🗑️** (Lixeira) na linha do script
2. Confirme a exclusão
3. O script e seu agendamento (se houver) serão removidos

## 📂 Estrutura de Arquivos

```
cockpit-scheduling-exec/
├── DEBIAN/
│   └── control                      # Metadados do pacote Debian
└── usr/share/cockpit/scheduling_exec/
    ├── manifest.json                # Manifesto do plugin Cockpit
    ├── index.html                   # Interface do usuário
    ├── index.js                     # Lógica JavaScript
    └── scripts/
        ├── list-scripts.sh          # Lista todos os scripts
        ├── get-script.sh            # Obtém conteúdo de um script
        ├── save-script.sh           # Cria/atualiza script
        ├── delete-script.sh         # Remove script
        ├── execute-script.sh        # Executa script e atualiza stats
        ├── get-cron.sh              # Obtém agendamento cron
        ├── set-cron.sh              # Configura agendamento cron
        ├── remove-cron.sh           # Remove agendamento cron
        └── rotina.sh                # Script de exemplo
```

### Diretórios do Usuário

Quando você usa o plugin, os seguintes diretórios são criados no seu home:

- `$HOME/scripts/` - Scripts criados por você
- `$HOME/.scripts-metadata/` - Metadados e logs de execução

## 🔧 Metadados dos Scripts

Para cada script, o sistema mantém as seguintes informações:

```json
{
  "created_at": 1234567890,
  "updated_at": 1234567890,
  "last_execution": 1234567890,
  "total_executions": 10,
  "successful_executions": 9
}
```

Estes dados são usados para exibir estatísticas na tabela.

## � CI/CD e Releases

### Build Automático

Este projeto usa GitHub Actions para build automático:

- **Push/PR para main**: Constrói o pacote .deb automaticamente
- **Tag v***: Cria release com o pacote .deb

### Baixar Builds Automáticos

1. Vá para [Actions](https://github.com/QuantumTecnology/cockpit-scheduling-exec/actions)
2. Clique no workflow "Build Debian Package"
3. Baixe o artefato `cockpit-scheduling-exec-deb`

### Criar Nova Release

Para maintainers:

```bash
# 1. Atualizar doc/CHANGELOG.md

# 2. Commit e push
git add .
git commit -m "Release: v1.0.8"
git push

# 3. Criar e enviar tag
git tag -a v1.0.8 -m "Release version 1.0.8"
git push origin v1.0.8

# O GitHub Actions criará a release automaticamente
```

Veja [doc/GITHUB.md](doc/GITHUB.md) para mais detalhes sobre CI/CD.

## 🛠️ Desenvolvimento

### Tecnologias Utilizadas

- **Cockpit API**: Para comunicação entre frontend e backend
- **PatternFly**: Framework CSS para interface consistente
- **Bash**: Scripts de backend
- **HTML/CSS/JavaScript**: Interface do usuário
- **GitHub Actions**: CI/CD para builds automáticos

### Modificar o Plugin

1. Edite os arquivos em `usr/share/cockpit/scheduling_exec/`
2. Para aplicar mudanças sem reinstalar:
```bash
sudo cp -r usr/share/cockpit/scheduling_exec/* /usr/share/cockpit/scheduling_exec/
sudo systemctl restart cockpit
```

3. Recarregue a página no navegador (Ctrl+F5)

## 📝 Logs

Os logs de execução dos scripts agendados são salvos em:
```
$HOME/.scripts-metadata/<nome-do-script>.log
```

## 🔐 Segurança

- Os scripts são executados com as permissões do usuário logado no Cockpit
- Scripts são armazenados no diretório home do usuário (`$HOME/scripts`)
- Apenas o proprietário pode executar os scripts (chmod +x)
- Recomenda-se revisar cuidadosamente qualquer script antes de executá-lo ou agendá-lo

## ⚠️ Solução de Problemas

### Plugin não aparece no menu do Cockpit

Se o plugin não aparecer no menu lateral após a instalação, execute o script de verificação:

```bash
# Baixar e executar o script de verificação
wget https://raw.githubusercontent.com/QuantumTecnology/cockpit-scheduling-exec/main/scripts/check-install.sh -O check-install.sh
chmod +x check-install.sh
./check-install.sh
```

Ou verifique manualmente:

1. **Verifique se o Cockpit está rodando:**
```bash
sudo systemctl status cockpit
```

2. **Verifique se os arquivos foram instalados:**
```bash
ls -la /usr/share/cockpit/scheduling_exec/
```
Devem existir: `manifest.json`, `index.html`, `index.js` e pasta `scripts/`

3. **Verifique o conteúdo do manifest.json:**
```bash
cat /usr/share/cockpit/scheduling_exec/manifest.json
```
Deve conter o campo `"menu"` com a entrada `"index"`.

4. **Reinicie o Cockpit:**
```bash
sudo systemctl restart cockpit
```

5. **Limpe o cache do navegador:**
   - Pressione `Ctrl+Shift+Del`
   - Selecione "Imagens e arquivos em cache"
   - Clique em "Limpar dados"

6. **Faça logout e login novamente no Cockpit**

7. **Se ainda não funcionar, reinstale:**
```bash
sudo apt remove cockpit-scheduling-exec
sudo apt install ./cockpit-scheduling-exec_1.0.8_all.deb
sudo systemctl restart cockpit
```

### Scripts não executam

1. Verifique se o script tem permissão de execução:
```bash
ls -la ~/scripts/
```

2. Teste o script manualmente:
```bash
bash ~/scripts/seu-script.sh
```

3. Verifique os logs:
```bash
cat ~/.scripts-metadata/seu-script.sh.log
```

### Agendamento não funciona

1. Verifique se o cron está rodando:
```bash
sudo systemctl status cron
```

2. Liste os agendamentos do usuário:
```bash
crontab -l
```

3. Verifique os logs do sistema:
```bash
sudo journalctl -u cron
```

## 📄 Licença

Este projeto está sob a licença especificada no arquivo LICENSE.

## 👤 Autor

**Gustavo Santarosa**
- Email: gustavo@quantumtecnology.com.br

## 🤝 Contribuindo

Contribuições são bem-vindas! Sinta-se à vontade para:

1. Fazer fork do projeto
2. Criar uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abrir um Pull Request

## 📚 Recursos Adicionais

- [Documentação do Cockpit](https://cockpit-project.org/guide/latest/)
- [Cron Tutorial](https://crontab.guru/)
- [Bash Scripting Guide](https://www.gnu.org/software/bash/manual/)

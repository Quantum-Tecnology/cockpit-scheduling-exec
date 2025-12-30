# -*- coding: utf-8 -*-
import codecs

file_path = r"f:\Projeto\QuantumTecnology\cockpit-scheduling-exec\usr\share\cockpit\scheduling_exec\backup-manager.js"

# Ler o arquivo com diferentes codificações tentando detectar a correta
try:
    with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
        content = f.read()
except:
    with open(file_path, 'r', encoding='latin-1') as f:
        content = f.read()

# Substituições
replacements = {
    'ðŸ"': '📁',
    'ðŸ ': '🏠',
    'ðŸ'¾': '💾',
    'ðŸ'¥': '👥',
    'ðŸ"¦': '📦',
    'ðŸ"': '📂',
    'ðŸ–¥ï¸': '🖥️',
    'ðŸ"§': '📧',
    'âœ…': '✅',
    'âŒ': '❌',
    'âš ï¸': '⚠️',
    'âœ"': '✓',
    'âœ—': '✗',
    'PadrÃ£o': 'Padrão',
    'UsuÃ¡rios': 'Usuários',
    'TemporÃ¡rio': 'Temporário',
    'AplicaÃ§Ãµes': 'Aplicações',
    'ServiÃ§os': 'Serviços',
    'configuraÃ§Ã£o': 'configuração',
    'diretÃ³rio': 'diretório',
    'ConfiguraÃ§Ã£o': 'Configuração',
    'DiretÃ³rio': 'Diretório',
    'UsuÃ¡rio': 'Usuário',
    'ConteÃºdo': 'Conteúdo',
    'InicializaÃ§Ã£o': 'Inicialização',
    'permissÃ£o': 'permissão',
    'permissÃµes': 'permissões',
    'referÃªncia': 'referência',
    'privilÃ©gios': 'privilégios',
    'variÃ¡veis': 'variáveis',
    'nÃ£o': 'não',
    'jÃ¡': 'já',
    'acessÃ­vel': 'acessível',
    'visÃ­vel': 'visível',
    'contÃ©m': 'contém',
    'navegaÃ§Ã£o': 'navegação',
    'invÃ¡lido': 'inválido',
    'Nenhum subdiretÃ³rio': 'Nenhum subdiretório',
    'Todos os diretÃ³rios': 'Todos os diretórios',
    'Erro ao listar diretÃ³rios': 'Erro ao listar diretórios',
    'Caminho invÃ¡lido': 'Caminho inválido',
    'conexÃ£o': 'conexão',
    'Salvando configuraÃ§Ã£o': 'Salvando configuração',
    'Arquivo de configuraÃ§Ã£o': 'Arquivo de configuração',
}

# Aplicar substituições
for old, new in replacements.items():
    content = content.replace(old, new)

# Salvar com UTF-8
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Arquivo corrigido com sucesso!")

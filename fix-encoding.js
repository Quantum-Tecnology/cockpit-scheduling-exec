const fs = require('fs');

const filePath = 'f:\\Projeto\\QuantumTecnology\\cockpit-scheduling-exec\\usr\\share\\cockpit\\scheduling_exec\\backup-manager.js';

// Ler arquivo
let content = fs.readFileSync(filePath, 'utf8');

// Definir substituições
const replacements = {
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
    'conexÃ£o': 'conexão',
    'InicializaÃ§Ã£o': 'Inicialização',
    'configuraÃ§Ã£o': 'configuração',
    'ConfiguraÃ§Ã£o': 'Configuração',
    'diretÃ³rio': 'diretório',
    'DiretÃ³rio': 'Diretório',
    'nÃ£o': 'não',
    'permissÃ£o': 'permissão',
    'permissÃµes': 'permissões',
    'privilÃ©gios': 'privilégios',
    'acessÃ­vel': 'acessível',
    'padrÃ£o': 'padrão',
    'PadrÃ£o': 'Padrão',
    'jÃ¡': 'já',
    'UsuÃ¡rio': 'Usuário',
    'UsuÃ¡rios': 'Usuários',
    'TemporÃ¡rio': 'Temporário',
    'AplicaÃ§Ãµes': 'Aplicações',
    'ServiÃ§os': 'Serviços',
    'variÃ¡veis': 'variáveis',
    'visÃ­vel': 'visível',
    'ConteÃºdo': 'Conteúdo',
    'contÃ©m': 'contém',
    'referÃªncia': 'referência',
    'navegaÃ§Ã£o': 'navegação',
    'invÃ¡lido': 'inválido'
};

// Aplicar substituições
for (const [old, newVal] of Object.entries(replacements)) {
    content = content.split(old).join(newVal);
}

// Salvar arquivo
fs.writeFileSync(filePath, content, 'utf8');

console.log('✅ Arquivo corrigido com sucesso!');

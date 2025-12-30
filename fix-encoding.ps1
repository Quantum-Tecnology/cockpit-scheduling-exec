# Script para corrigir codificação UTF-8 do arquivo
$filePath = "f:\Projeto\QuantumTecnology\cockpit-scheduling-exec\usr\share\cockpit\scheduling_exec\backup-manager.js"

# Ler o arquivo
$content = [System.IO.File]::ReadAllText($filePath, [System.Text.Encoding]::UTF8)

# Correções de emojis
$replacements = @{
    'ðŸ"' = '📁'
    'ðŸ ' = '🏠'
    'ðŸ'¾' = '💾'
    'ðŸ'¥' = '👥'
    'ðŸ"¦' = '📦'
    'ðŸ"' = '📂'
    'ðŸ–¥ï¸' = '🖥️'
    'ðŸ"§' = '📧'
    'âœ…' = '✅'
    'âŒ' = '❌'
    'âš ï¸' = '⚠️'
    'PadrÃ£o' = 'Padrão'
    'UsuÃ¡rios' = 'Usuários'
    'TemporÃ¡rio' = 'Temporário'
    'AplicaÃ§Ãµes' = 'Aplicações'
    'ServiÃ§os' = 'Serviços'
    'configuraÃ§Ã£o' = 'configuração'
    'diretÃ³rio' = 'diretório'
    'ConfiguraÃ§Ã£o' = 'Configuração'
    'DiretÃ³rio' = 'Diretório'
    'UsuÃ¡rio' = 'Usuário'
    'ConteÃºdo' = 'Conteúdo'
    'InicializaÃ§Ã£o' = 'Inicialização'
    'permissÃ£o' = 'permissão'
    'permissÃµes' = 'permissões'
    'referÃªncia' = 'referência'
    'privilÃ©gios' = 'privilégios'
    'variÃ¡veis' = 'variáveis'
    'nÃ£o' = 'não'
    'jÃ¡' = 'já'
    'acessÃ­vel' = 'acessível'
    'visÃ­vel' = 'visível'
    'contÃ©m' = 'contém'
    'navegaÃ§Ã£o' = 'navegação'
    'invÃ¡lido' = 'inválido'
    'Ã§' = 'ç'
    'Ã£' = 'ã'
    'Ã³' = 'ó'
    'Ãµ' = 'õ'
    'Ã¡' = 'á'
    'Ã­' = 'í'
    'Ã©' = 'é'
    'Ãª' = 'ê'
    'Ã ' = 'à'
    'âœ"' = '✓'
    'âœ—' = '✗'
    'Nenhum subdiretÃ³rio' = 'Nenhum subdiretório'
    'Todos os diretÃ³rios' = 'Todos os diretórios'
    'Erro ao listar diretÃ³rios' = 'Erro ao listar diretórios'
    'Caminho invÃ¡lido' = 'Caminho inválido'
}

# Aplicar todas as substituições
foreach ($key in $replacements.Keys) {
    $content = $content -replace [regex]::Escape($key), $replacements[$key]
}

# Salvar com UTF-8
[System.IO.File]::WriteAllText($filePath, $content, (New-Object System.Text.UTF8Encoding($false)))

Write-Host "✅ Arquivo corrigido com sucesso!" -ForegroundColor Green

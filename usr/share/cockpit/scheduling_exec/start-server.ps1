# Script para iniciar servidor web local para desenvolvimento
# Uso: .\start-server.ps1

Write-Host "Iniciando servidor web local..." -ForegroundColor Green
Write-Host "Diretorio: $PWD" -ForegroundColor Cyan
Write-Host ""

# Verificar se Python esta instalado
if (Get-Command python -ErrorAction SilentlyContinue) {
    Write-Host "Python encontrado" -ForegroundColor Green
    Write-Host "Abrindo servidor em http://localhost:8000" -ForegroundColor Yellow
    Write-Host "Acesse: http://localhost:8000/backup-manager-modular.html" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Pressione Ctrl+C para parar o servidor" -ForegroundColor Red
    Write-Host ""

    # Iniciar servidor Python
    python -m http.server 8000
}
elseif (Get-Command python3 -ErrorAction SilentlyContinue) {
    Write-Host "Python3 encontrado" -ForegroundColor Green
    Write-Host "Abrindo servidor em http://localhost:8000" -ForegroundColor Yellow
    Write-Host "Acesse: http://localhost:8000/backup-manager-modular.html" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Pressione Ctrl+C para parar o servidor" -ForegroundColor Red
    Write-Host ""

    # Iniciar servidor Python3
    python3 -m http.server 8000
}
else {
    Write-Host "Python nao encontrado!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Alternativas:" -ForegroundColor Yellow
    Write-Host "1. Instale Python: https://www.python.org/downloads/" -ForegroundColor Cyan
    Write-Host "2. Use o arquivo monolitico: backup-manager.html" -ForegroundColor Cyan
    Write-Host "3. Instale Node.js e use: npx http-server -p 8000" -ForegroundColor Cyan
}

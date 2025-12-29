#!/bin/bash
# Script de teste de configuração de email

echo "=== Teste de Configuração de Email ==="
echo ""

# 1. Verificar utilitários de email instalados
echo "1. Verificando utilitários de email instalados..."
MAIL_CMD=""
if command -v msmtp &> /dev/null; then
    echo "   ✅ 'msmtp' está instalado: $(which msmtp) [RECOMENDADO]"
    MAIL_CMD="msmtp"
    if [ -f ~/.msmtprc ]; then
        echo "      ✅ Configuração encontrada: ~/.msmtprc"
    elif [ -f /etc/msmtprc ]; then
        echo "      ✅ Configuração encontrada: /etc/msmtprc"
    else
        echo "      ⚠️  Configuração não encontrada (~/.msmtprc ou /etc/msmtprc)"
    fi
fi

if command -v mail &> /dev/null; then
    echo "   ✅ 'mail' está instalado: $(which mail)"
    if [ -z "$MAIL_CMD" ]; then MAIL_CMD="mail"; fi
fi

if command -v mailx &> /dev/null; then
    echo "   ✅ 'mailx' está instalado: $(which mailx)"
    if [ -z "$MAIL_CMD" ]; then MAIL_CMD="mailx"; fi
fi

if [ -z "$MAIL_CMD" ]; then
    echo "   ❌ Nenhum utilitário de email instalado"
    echo "   Recomendado (mais leve):"
    echo "   - sudo apt-get install msmtp msmtp-mta"
    echo "   Alternativas:"
    echo "   - Debian/Ubuntu: sudo apt-get install mailutils"
    echo "   - CentOS/RHEL: sudo yum install mailx"
    exit 1
fi
echo ""

# 2. Verificar Postfix/Sendmail
echo "2. Verificando servidor de email..."
if systemctl is-active --quiet postfix; then
    echo "   ✅ Postfix está rodando"
elif systemctl is-active --quiet sendmail; then
    echo "   ✅ Sendmail está rodando"
else
    echo "   ⚠️  Nenhum servidor de email (Postfix/Sendmail) está rodando"
    echo "   Para instalar e configurar Postfix:"
    echo "   - sudo apt-get install postfix"
    echo "   - sudo dpkg-reconfigure postfix"
fi
echo ""

# 3. Verificar arquivo de configuração
echo "3. Verificando configuração do sistema..."
if [ -f /etc/mailname ]; then
    echo "   ✅ /etc/mailname: $(cat /etc/mailname)"
else
    echo "   ⚠️  /etc/mailname não encontrado"
fi
echo ""

# 4. Teste de envio simples
echo "4. Teste de envio (se desejar testar, forneça um email):"
echo "   Uso: $0 <seu_email@exemplo.com>"

if [ ! -z "$1" ]; then
    TEST_EMAIL="$1"
    echo "   Enviando email de teste para: $TEST_EMAIL"

    echo "Teste de email do Cockpit Backup Manager" | \
        $MAIL_CMD -s "Teste - Cockpit Backup Manager" "$TEST_EMAIL" 2>&1

    if [ $? -eq 0 ]; then
        echo "   ✅ Email de teste enviado com sucesso!"
        echo "   Verifique sua caixa de entrada (ou spam)"
    else
        echo "   ❌ Falha ao enviar email de teste"
    fi
fi

echo ""
echo "=== Fim do Teste ==="

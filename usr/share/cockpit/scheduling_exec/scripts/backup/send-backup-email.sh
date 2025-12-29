#!/bin/bash
# Script para enviar backups por email
# Uso: send-backup-email.sh <destinatario> <assunto> <arquivos> [mensagem]

EMAIL_TO="$1"
SUBJECT="$2"
FILES="$3"
MESSAGE="$4"

if [ -z "$EMAIL_TO" ] || [ -z "$SUBJECT" ] || [ -z "$FILES" ]; then
    echo "ERRO: Parâmetros insuficientes" >&2
    echo "Uso: $0 <destinatario> <assunto> <arquivos> [mensagem]" >&2
    exit 1
fi

# Verificar qual utilitário de email está instalado (msmtp é preferido por ser mais leve)
MAIL_CMD=""
if command -v msmtp &> /dev/null; then
    MAIL_CMD="msmtp"
    echo "✅ Usando msmtp (recomendado)" >&2
elif command -v mail &> /dev/null; then
    MAIL_CMD="mail"
    echo "✅ Usando mail" >&2
elif command -v mailx &> /dev/null; then
    MAIL_CMD="mailx"
    echo "✅ Usando mailx" >&2
else
    echo "ERRO: Nenhum utilitário de email instalado" >&2
    echo "Recomendado (mais leve): sudo apt-get install msmtp msmtp-mta" >&2
    echo "Alternativas:" >&2
    echo "  - Debian/Ubuntu: sudo apt-get install mailutils" >&2
    echo "  - CentOS/RHEL: sudo yum install mailx" >&2
    exit 2
fi

# Criar arquivo temporário para o corpo do email
TEMP_BODY=$(mktemp)
trap "rm -f $TEMP_BODY" EXIT

# Criar corpo do email
cat > "$TEMP_BODY" << EOF
Backup do Sistema
==================

Data/Hora: $(date '+%d/%m/%Y às %H:%M:%S')
Servidor: $(hostname)
Usuário: $(whoami)

Arquivos anexados:
EOF

# Adicionar lista de arquivos
IFS=',' read -ra FILE_ARRAY <<< "$FILES"
for file in "${FILE_ARRAY[@]}"; do
    if [ -f "$file" ]; then
        FILE_SIZE=$(du -h "$file" | cut -f1)
        FILE_NAME=$(basename "$file")
        echo "  - $FILE_NAME ($FILE_SIZE)" >> "$TEMP_BODY"
    fi
done

# Adicionar mensagem personalizada se fornecida
if [ -n "$MESSAGE" ]; then
    echo "" >> "$TEMP_BODY"
    echo "Mensagem:" >> "$TEMP_BODY"
    echo "$MESSAGE" >> "$TEMP_BODY"
fi

# Adicionar rodapé
cat >> "$TEMP_BODY" << EOF

--
Este é um email automático gerado pelo Gerenciador de Backups.
Enviado em: $(date '+%d/%m/%Y às %H:%M:%S')
EOF

# Preparar anexos
ATTACHMENTS=""
for file in "${FILE_ARRAY[@]}"; do
    if [ -f "$file" ]; then
        ATTACHMENTS="$ATTACHMENTS -a $file"
    fi
done

# Enviar email
echo "Enviando email para $EMAIL_TO..." >&2
echo "Assunto: $SUBJECT" >&2
echo "Arquivos: ${#FILE_ARRAY[@]} arquivo(s)" >&2

if [ "$MAIL_CMD" = "msmtp" ]; then
    # msmtp usa formato diferente - precisa do cabeçalho completo
    {
        echo "To: $EMAIL_TO"
        echo "Subject: $SUBJECT"
        echo "Content-Type: text/plain; charset=UTF-8"
        echo ""
        cat "$TEMP_BODY"
    } | msmtp "$EMAIL_TO" 2>&1
    RESULT=$?

    # msmtp não suporta anexos diretamente - aviso
    if [ ${#FILE_ARRAY[@]} -gt 0 ]; then
        echo "⚠️  AVISO: msmtp não suporta anexos. Para enviar arquivos, use mail/mailx" >&2
        echo "    ou configure msmtp com mutt: sudo apt-get install mutt" >&2
    fi
elif [ "$MAIL_CMD" = "mail" ]; then
    cat "$TEMP_BODY" | mail -s "$SUBJECT" $ATTACHMENTS "$EMAIL_TO" 2>&1
    RESULT=$?
elif [ "$MAIL_CMD" = "mailx" ]; then
    cat "$TEMP_BODY" | mailx -s "$SUBJECT" $ATTACHMENTS "$EMAIL_TO" 2>&1
    RESULT=$?
fi

# Limpar arquivo temporário
rm -f "$TEMP_BODY"

if [ $RESULT -eq 0 ]; then
    echo "✅ Email enviado com sucesso para $EMAIL_TO"
    exit 0
else
    echo "ERRO: Falha ao enviar email (código: $RESULT)" >&2
    echo "Verifique a configuração do servidor de email (postfix/sendmail)" >&2
    exit 3
fi

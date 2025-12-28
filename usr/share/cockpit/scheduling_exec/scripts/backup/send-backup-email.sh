#!/bin/bash
# Script para enviar backups por email
# Uso: send-backup-email.sh <destinatario> <assunto> <arquivos> [mensagem]

EMAIL_TO="$1"
SUBJECT="$2"
FILES="$3"
MESSAGE="$4"

if [ -z "$EMAIL_TO" ] || [ -z "$SUBJECT" ] || [ -z "$FILES" ]; then
    echo "Erro: Parâmetros insuficientes" >&2
    echo "Uso: $0 <destinatario> <assunto> <arquivos> [mensagem]" >&2
    exit 1
fi

# Verificar se mail ou mailx está instalado
if ! command -v mail &> /dev/null && ! command -v mailx &> /dev/null; then
    echo "Erro: 'mail' ou 'mailx' não está instalado" >&2
    echo "Instale com: sudo apt-get install mailutils" >&2
    exit 1
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
if command -v mail &> /dev/null; then
    cat "$TEMP_BODY" | mail -s "$SUBJECT" $ATTACHMENTS "$EMAIL_TO"
elif command -v mailx &> /dev/null; then
    cat "$TEMP_BODY" | mailx -s "$SUBJECT" $ATTACHMENTS "$EMAIL_TO"
fi

if [ $? -eq 0 ]; then
    echo "Email enviado com sucesso para $EMAIL_TO"
    exit 0
else
    echo "Erro ao enviar email" >&2
    exit 1
fi

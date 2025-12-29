# 📧 Guia de Configuração do msmtp (Recomendado)

## Por que msmtp?

✅ **Vantagens do msmtp:**
- **Leve**: ~200KB vs 20MB+ do Postfix
- **Simples**: Um arquivo de configuração apenas
- **Rápido**: Envio direto via SMTP, sem daemon
- **Confiável**: Muito usado em scripts e servidores
- **Sem dependências pesadas**: Não precisa de Postfix/Sendmail

## 🚀 Instalação Rápida

```bash
sudo apt-get update
sudo apt-get install msmtp msmtp-mta
```

O `msmtp-mta` cria links simbólicos para que scripts que chamam `mail` usem o msmtp automaticamente.

---

## ⚙️ Configuração

### 1. Configuração Global (Recomendado para servidores)

Crie `/etc/msmtprc`:

```bash
sudo nano /etc/msmtprc
```

**Para Gmail:**
```conf
# Configuração padrão
defaults
auth           on
tls            on
tls_trust_file /etc/ssl/certs/ca-certificates.crt
logfile        /var/log/msmtp.log

# Conta Gmail
account        gmail
host           smtp.gmail.com
port           587
from           seu-email@gmail.com
user           seu-email@gmail.com
password       sua-senha-de-app

# Conta padrão
account default : gmail
```

**Para Outlook/Hotmail:**
```conf
defaults
auth           on
tls            on
tls_trust_file /etc/ssl/certs/ca-certificates.crt
logfile        /var/log/msmtp.log

account        outlook
host           smtp-mail.outlook.com
port           587
from           seu-email@outlook.com
user           seu-email@outlook.com
password       sua-senha

account default : outlook
```

**Para servidor SMTP próprio:**
```conf
defaults
auth           on
tls            on
tls_trust_file /etc/ssl/certs/ca-certificates.crt
logfile        /var/log/msmtp.log

account        empresa
host           smtp.suaempresa.com
port           587
from           noreply@suaempresa.com
user           seu-usuario
password       sua-senha

account default : empresa
```

### 2. Permissões de Segurança

```bash
# Definir permissões corretas
sudo chmod 600 /etc/msmtprc
sudo chown root:root /etc/msmtprc

# Criar arquivo de log
sudo touch /var/log/msmtp.log
sudo chmod 666 /var/log/msmtp.log
```

### 3. Configuração por Usuário (Opcional)

Se preferir configuração por usuário, crie `~/.msmtprc` com o mesmo formato e permissões 600.

---

## 🔐 Senhas de App (Gmail)

Para Gmail, você **PRECISA** usar uma Senha de App:

1. Acesse: https://myaccount.google.com/security
2. Ative **Verificação em duas etapas**
3. Acesse **Senhas de app**
4. Gere uma senha para "Mail"
5. Use essa senha de 16 caracteres no arquivo de configuração

---

## ✅ Testar Configuração

### Teste 1: msmtp direto

```bash
echo "Corpo do email de teste" | msmtp -a default destinatario@exemplo.com
```

### Teste 2: Via comando mail

```bash
echo "Teste via mail" | mail -s "Assunto Teste" destinatario@exemplo.com
```

### Teste 3: Via Cockpit

1. Acesse o **Gerenciador de Backups**
2. Vá em **Configurações**
3. Clique em **🔧 Testar Configuração de Email**

---

## 🔍 Debug de Problemas

### Ver logs:

```bash
sudo tail -f /var/log/msmtp.log
```

### Teste com verbose:

```bash
echo "teste" | msmtp -v --debug seu-email@exemplo.com
```

### Testar conta específica:

```bash
msmtp -a gmail --serverinfo
```

---

## 📋 Problemas Comuns

### 1. "cannot connect to smtp.gmail.com"

**Causas:**
- Firewall bloqueando porta 587
- Conexão de rede instável

**Solução:**
```bash
# Testar conexão
telnet smtp.gmail.com 587

# Verificar firewall
sudo ufw status
sudo ufw allow 587/tcp
```

### 2. "authentication failed"

**Causas:**
- Senha incorreta
- Senha de app não gerada (Gmail)
- Verificação em 2 etapas desativada

**Solução:**
- Use Senha de App, não a senha normal
- Verifique se copiou corretamente (sem espaços)

### 3. "recipient refused"

**Causas:**
- Email de destino inválido
- Conta Gmail não verificada

**Solução:**
- Verifique o email do destinatário
- Teste com outro destinatário

### 4. "permission denied: /var/log/msmtp.log"

**Solução:**
```bash
sudo chmod 666 /var/log/msmtp.log
```

---

## 🆚 Comparação: msmtp vs Postfix

| Característica | msmtp | Postfix |
|---------------|-------|---------|
| Tamanho | ~200KB | ~20MB+ |
| Instalação | 1 pacote | Múltiplos pacotes |
| Configuração | 1 arquivo simples | Múltiplos arquivos |
| Daemon | Não (mais rápido) | Sim (consome memória) |
| Uso | Scripts, envios simples | Servidor de email completo |
| Fila | Não | Sim |
| **Recomendado para** | **Cockpit e scripts** | Servidores de email |

---

## 💡 Dicas e Boas Práticas

1. **Use msmtp-mta**: Cria links para compatibilidade com `mail`
2. **Senha de app sempre**: Nunca use senha principal
3. **Permissões 600**: Proteja o arquivo de configuração
4. **Teste após instalar**: Use o botão de teste no Cockpit
5. **Monitore logs**: `tail -f /var/log/msmtp.log`
6. **Múltiplas contas**: Você pode ter Gmail, Outlook, etc no mesmo arquivo

---

## 📧 Configuração Múltiplas Contas

Você pode ter várias contas no `/etc/msmtprc`:

```conf
defaults
auth           on
tls            on
tls_trust_file /etc/ssl/certs/ca-certificates.crt
logfile        /var/log/msmtp.log

# Conta Gmail
account        gmail
host           smtp.gmail.com
port           587
from           empresa@gmail.com
user           empresa@gmail.com
password       senha-de-app-gmail

# Conta empresarial
account        empresa
host           smtp.empresa.com.br
port           587
from           backup@empresa.com.br
user           backup@empresa.com.br
password       senha-empresa

# Conta padrão (usada se não especificar)
account default : gmail
```

Para usar conta específica:
```bash
echo "teste" | msmtp -a empresa destinatario@exemplo.com
```

---

## 🔄 Migração de Postfix para msmtp

Se você já usa Postfix:

```bash
# 1. Backup da configuração atual
sudo cp /etc/postfix/main.cf /etc/postfix/main.cf.backup

# 2. Parar Postfix
sudo systemctl stop postfix
sudo systemctl disable postfix

# 3. Instalar msmtp
sudo apt-get install msmtp msmtp-mta

# 4. Configurar msmtp (ver seções acima)
sudo nano /etc/msmtprc

# 5. Testar
echo "Migration test" | mail -s "Test" seu-email@exemplo.com
```

---

## 📚 Recursos Adicionais

- **Documentação oficial**: https://marlam.de/msmtp/
- **Exemplos**: `/usr/share/doc/msmtp/examples/`
- **Man page**: `man msmtp`

---

## 🎯 Exemplo Completo de Uso

```bash
#!/bin/bash

# Enviar email com msmtp
DESTINATARIO="admin@exemplo.com"
ASSUNTO="Backup Concluído"
CORPO="Backup realizado com sucesso em $(date)"

echo "$CORPO" | msmtp -a default \
    --subject="$ASSUNTO" \
    "$DESTINATARIO"

# Ou usando o formato compatível com mail
{
    echo "To: $DESTINATARIO"
    echo "Subject: $ASSUNTO"
    echo ""
    echo "$CORPO"
} | msmtp "$DESTINATARIO"
```

---

**Versão:** 1.3.3  
**Data:** 28/12/2025  
**Recomendação:** ⭐⭐⭐⭐⭐ Use msmtp para scripts e servidores!

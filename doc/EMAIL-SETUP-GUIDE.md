# 📧 Guia de Configuração de Email - Cockpit Backup Manager

## Pré-requisitos

Para o envio de emails funcionar, você precisa:

1. **Utilitário de email instalado** (`mail` ou `mailx`)
2. **Servidor de email configurado** (Postfix ou Sendmail)

---

## 🔧 Instalação e Configuração

### 1. Instalar o mailutils

**Debian/Ubuntu:**
```bash
sudo apt-get update
sudo apt-get install mailutils
```

**CentOS/RHEL:**
```bash
sudo yum install mailx
```

### 2. Instalar e Configurar Postfix

**Instalação:**
```bash
sudo apt-get install postfix
```

Durante a instalação, você será questionado sobre o tipo de configuração:
- Escolha **"Internet Site"** para servidor de email completo
- Ou **"Satellite system"** para usar um servidor SMTP externo

**Configuração Básica:**
```bash
sudo dpkg-reconfigure postfix
```

Responda às perguntas:
1. **General type**: Internet Site
2. **System mail name**: seu-dominio.com (ou hostname do servidor)
3. **Root and postmaster mail recipient**: seu-email@exemplo.com
4. **Other destinations**: deixe o padrão ou adicione domínios
5. **Force synchronous updates**: No
6. **Local networks**: 127.0.0.0/8 [::ffff:127.0.0.0]/104 [::1]/128
7. **Mailbox size limit**: 0 (sem limite)
8. **Local address extension character**: +
9. **Internet protocols**: all

### 3. Configurar Relay SMTP (Opcional)

Se você quiser usar um servidor SMTP externo (Gmail, Outlook, etc.):

**Editar /etc/postfix/main.cf:**
```bash
sudo nano /etc/postfix/main.cf
```

**Adicionar no final:**
```
# Relay SMTP
relayhost = [smtp.gmail.com]:587
smtp_use_tls = yes
smtp_sasl_auth_enable = yes
smtp_sasl_password_maps = hash:/etc/postfix/sasl_passwd
smtp_sasl_security_options = noanonymous
smtp_tls_CAfile = /etc/ssl/certs/ca-certificates.crt
```

**Criar arquivo de credenciais:**
```bash
sudo nano /etc/postfix/sasl_passwd
```

**Adicionar:**
```
[smtp.gmail.com]:587 seu-email@gmail.com:sua-senha-de-app
```

**Proteger e processar:**
```bash
sudo chmod 600 /etc/postfix/sasl_passwd
sudo postmap /etc/postfix/sasl_passwd
sudo systemctl restart postfix
```

### 4. Configurar Gmail (se usar Gmail)

1. Acesse sua conta do Google
2. Vá em **Segurança** → **Verificação em duas etapas** (ative se não estiver)
3. Vá em **Senhas de app**
4. Gere uma senha de app para "Mail"
5. Use essa senha no arquivo `/etc/postfix/sasl_passwd`

---

## ✅ Testar a Configuração

### Teste via linha de comando:

```bash
echo "Teste de email" | mail -s "Assunto do Teste" seu-email@exemplo.com
```

### Teste via Cockpit:

1. Acesse o **Gerenciador de Backups**
2. Vá na aba **Configurações**
3. Preencha o email do destinatário
4. Clique em **🔧 Testar Configuração de Email**

Você verá:
- ✅ Status da instalação do mail/mailx
- ✅ Status do servidor de email (Postfix/Sendmail)
- ✅ Teste de envio (se informar um email)

---

## 📋 Verificar Logs

Se houver problemas, verifique os logs:

```bash
# Logs do Postfix
sudo tail -f /var/log/mail.log
# ou
sudo tail -f /var/log/maillog

# Status do serviço
sudo systemctl status postfix

# Fila de emails
mailq
```

---

## 🔍 Problemas Comuns

### Erro: "mail: command not found"
**Solução:** Instale o mailutils
```bash
sudo apt-get install mailutils
```

### Erro: "Postfix não está rodando"
**Solução:** Inicie o serviço
```bash
sudo systemctl start postfix
sudo systemctl enable postfix
```

### Emails não chegam
1. Verifique os logs: `sudo tail -f /var/log/mail.log`
2. Verifique se o firewall está bloqueando: `sudo ufw status`
3. Teste a conexão SMTP:
```bash
telnet smtp.gmail.com 587
```

### Gmail bloqueia emails
- Use **Senhas de App** em vez da senha normal
- Ative **Verificação em duas etapas**
- Verifique se "Acesso a apps menos seguros" está ativado (não recomendado)

---

## 🚀 Exemplo de Uso no Cockpit

1. **Configure o email** na aba Configurações
2. **Selecione backups** para enviar
3. **Clique em "📧 Enviar por Email"**
4. **Digite o destinatário** (opcional, usa o configurado)
5. **Adicione uma mensagem** (opcional)
6. **Clique em Enviar**

---

## 📧 Alternativas ao Postfix

### Sendmail
```bash
sudo apt-get install sendmail
sudo sendmailconfig
```

### msmtp (mais leve)
```bash
sudo apt-get install msmtp msmtp-mta
```

Configure em `/etc/msmtprc`:
```
defaults
auth           on
tls            on
tls_trust_file /etc/ssl/certs/ca-certificates.crt
logfile        /var/log/msmtp.log

account        gmail
host           smtp.gmail.com
port           587
from           seu-email@gmail.com
user           seu-email@gmail.com
password       sua-senha-de-app

account default : gmail
```

---

## 💡 Dicas

1. **Teste sempre após configurar**: Use o botão de teste no Cockpit
2. **Monitore os logs**: `sudo tail -f /var/log/mail.log`
3. **Limite de tamanho**: Configure o tamanho máximo de anexo (padrão: 25MB)
4. **Senhas seguras**: Use senhas de app, nunca a senha principal
5. **Backup local**: Sempre mantenha backups locais, email é apenas conveniência

---

## 📞 Suporte

Se você continuar tendo problemas:

1. Execute o teste: `sudo bash /usr/share/cockpit/scheduling_exec/scripts/backup/test-email.sh seu-email@exemplo.com`
2. Verifique os logs: `sudo tail -100 /var/log/mail.log`
3. Teste manualmente: `echo "teste" | mail -s "teste" seu-email@exemplo.com`

---

**Versão:** 1.3.3  
**Última Atualização:** $(date +%d/%m/%Y)

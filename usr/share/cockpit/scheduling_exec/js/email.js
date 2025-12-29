/**
 * Email Module - Gerenciamento de Email
 * Funções para envio de backups por email
 */

// Estado
let emailConfig = {
  recipient: "",
  subject: "Backups - {{date}}",
  maxSize: 25, // MB
};

// ============================================================================
// MODAL DE EMAIL
// ============================================================================

function openEmailModalForBackup(id) {
  window.selectedBackups.clear();
  window.selectedBackups.add(id);
  openEmailModal();
}

function openEmailModal() {
  if (window.selectedBackups.size === 0) {
    showAlert("warning", "Selecione pelo menos um backup para enviar.");
    return;
  }

  const modal = document.getElementById("email-modal");
  const filesList = document.getElementById("email-files-list");
  const emailTo = document.getElementById("email-to");

  // Preencher lista de arquivos
  const backups = Array.from(window.selectedBackups).map((id) =>
    window.allBackups.find((b) => b.id === id)
  );

  if (filesList) {
    filesList.innerHTML = backups
      .map(
        (b) => `
      <div style="padding: var(--pf-global--spacer--xs); border-bottom: 1px solid var(--pf-global--BorderColor--100);">
        ${getFileIcon(b.name)} ${escapeHtml(b.name)} (${formatSize(b.size)})
      </div>
    `
      )
      .join("");
  }

  // Preencher email do destinatário
  if (emailTo) {
    emailTo.value = emailConfig.recipient;
  }

  if (modal) {
    modal.style.display = "block";
  }
}

function closeEmailModal() {
  const modal = document.getElementById("email-modal");
  const form = document.getElementById("send-email-form");

  if (modal) modal.style.display = "none";
  if (form) form.reset();
}

// ============================================================================
// ENVIAR EMAIL
// ============================================================================

async function sendEmail() {
  const emailTo = document.getElementById("email-to").value.trim();
  const message = document.getElementById("email-message").value.trim();

  if (!emailTo) {
    showAlert("warning", "Por favor, informe o email do destinatário.");
    return;
  }

  const backups = Array.from(window.selectedBackups).map((id) =>
    window.allBackups.find((b) => b.id === id)
  );
  const totalSize = backups.reduce((sum, b) => sum + b.size, 0);
  const maxSize = emailConfig.maxSize * 1024 * 1024;

  if (totalSize > maxSize) {
    showAlert(
      "warning",
      `O tamanho total dos arquivos (${formatSize(
        totalSize
      )}) excede o limite de ${formatSize(maxSize)}.`
    );
    return;
  }

  try {
    showAlert("info", "📧 Enviando email...", 0);

    const files = backups.map((b) => b.fullPath).join(",");
    const subject = emailConfig.subject.replace(
      "{{date}}",
      formatDate(new Date().toISOString())
    );

    const script =
      "/usr/share/cockpit/scheduling_exec/scripts/backup/send-backup-email.sh";

    console.log("Enviando email:", {
      emailTo,
      subject,
      filesCount: backups.length,
      totalSize: formatSize(totalSize),
    });

    const result = await cockpit.spawn(
      [script, emailTo, subject, files, message],
      { err: "message", superuser: "try" }
    );

    console.log("Resultado:", result);
    showAlert("success", `✅ Email enviado com sucesso para ${emailTo}!`);
    closeEmailModal();
  } catch (error) {
    console.error("Erro ao enviar email:", error);

    let errorMsg = "Erro desconhecido";

    if (error?.message) {
      errorMsg = error.message;

      // Mensagens de erro específicas
      if (
        errorMsg.includes("Nenhum utilitário de email instalado") ||
        errorMsg.includes("não está instalado") ||
        errorMsg.includes("not installed")
      ) {
        errorMsg =
          "❌ Sistema de email não configurado.\n\n" +
          "📦 Recomendado (mais leve):\n" +
          "   sudo apt-get install msmtp msmtp-mta\n\n" +
          "📄 Veja: doc/MSMTP-SETUP-GUIDE.md";
      } else if (errorMsg.includes("configuração do servidor")) {
        errorMsg =
          "❌ Servidor de email não configurado.\n" +
          "Configure o msmtp (~/.msmtprc ou /etc/msmtprc)\n" +
          "Veja o guia: doc/MSMTP-SETUP-GUIDE.md";
      } else if (errorMsg.includes("Parâmetros insuficientes")) {
        errorMsg = "❌ Erro nos parâmetros do email. Verifique os dados.";
      } else if (errorMsg.includes("authentication failed")) {
        errorMsg =
          "❌ Falha na autenticação.\n" +
          "Para Gmail, use Senha de App (não a senha normal).\n" +
          "Veja: doc/MSMTP-SETUP-GUIDE.md";
      } else if (errorMsg.includes("cannot connect")) {
        errorMsg =
          "❌ Não foi possível conectar ao servidor SMTP.\n" +
          "Verifique sua conexão e firewall (porta 587).";
      }
    } else if (error?.toString) {
      errorMsg = error.toString();
    }

    showAlert("danger", errorMsg, 15000);
  }
}

// ============================================================================
// CONFIGURAÇÃO DE EMAIL
// ============================================================================

function updateEmailForm() {
  const recipientEl = document.getElementById("email-recipient");
  const subjectEl = document.getElementById("email-subject");
  const maxSizeEl = document.getElementById("max-email-size");

  if (recipientEl) recipientEl.value = emailConfig.recipient;
  if (subjectEl) subjectEl.value = emailConfig.subject;
  if (maxSizeEl) maxSizeEl.value = emailConfig.maxSize;
}

function loadEmailConfig(config) {
  if (config) {
    emailConfig = { ...emailConfig, ...config };
    updateEmailForm();
  }
}

function getEmailConfig() {
  return emailConfig;
}

async function saveEmailConfig() {
  const recipientEl = document.getElementById("email-recipient");
  const subjectEl = document.getElementById("email-subject");
  const maxSizeEl = document.getElementById("max-email-size");

  emailConfig.recipient = recipientEl ? recipientEl.value.trim() : "";
  emailConfig.subject = subjectEl
    ? subjectEl.value.trim()
    : "Backups - {{date}}";
  emailConfig.maxSize = maxSizeEl ? parseInt(maxSizeEl.value) : 25;

  return emailConfig;
}

// ============================================================================
// TESTAR CONFIGURAÇÃO
// ============================================================================

async function testEmailConfiguration() {
  try {
    showAlert("info", "🔧 Testando configuração de email...", 0);

    const script =
      "/usr/share/cockpit/scheduling_exec/scripts/backup/test-email.sh";
    const recipient = document.getElementById("email-recipient").value.trim();

    console.log("Testando configuração de email...");

    const result = await cockpit.spawn([script, recipient || ""], {
      err: "message",
      superuser: "try",
    });

    console.log("Resultado do teste:", result);

    // Processar resultado
    const lines = result.split("\n");
    let hasError = false;
    let errorMessage = "";
    let successMessage = "";

    for (const line of lines) {
      if (line.includes("❌")) {
        hasError = true;
        errorMessage += line + "\n";
      } else if (line.includes("✅")) {
        successMessage += line + "\n";
      }
    }

    if (hasError) {
      showAlert(
        "warning",
        `⚠️ Problemas encontrados:\n${errorMessage}\n${successMessage}`,
        15000
      );
    } else {
      showAlert("success", `✅ Configuração OK!\n${successMessage}`, 10000);
    }
  } catch (error) {
    console.error("Erro ao testar configuração:", error);
    const errorMsg = error?.message || error?.toString() || "Erro desconhecido";
    showAlert("danger", `❌ Erro ao testar configuração: ${errorMsg}`, 10000);
  }
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================

function setupEmailEventListeners() {
  const form = document.getElementById("email-config-form");
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      await saveEmailConfig();
      await window.saveConfiguration();
    });
  }

  const testBtn = document.getElementById("test-email-config-btn");
  if (testBtn) {
    testBtn.addEventListener("click", testEmailConfiguration);
  }
}

// ============================================================================
// EXPORTAR PARA USO GLOBAL
// ============================================================================

window.emailConfig = emailConfig;
window.openEmailModalForBackup = openEmailModalForBackup;
window.openEmailModal = openEmailModal;
window.closeEmailModal = closeEmailModal;
window.sendEmail = sendEmail;
window.updateEmailForm = updateEmailForm;
window.loadEmailConfig = loadEmailConfig;
window.getEmailConfig = getEmailConfig;
window.saveEmailConfig = saveEmailConfig;
window.testEmailConfiguration = testEmailConfiguration;
window.setupEmailEventListeners = setupEmailEventListeners;

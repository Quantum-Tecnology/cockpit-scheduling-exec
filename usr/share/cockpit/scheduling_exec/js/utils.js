/**
 * Utilitários comuns para o Backup Manager
 * Funções auxiliares de formatação, escape e UI
 */

// ============================================================================
// FORMATAÇÃO
// ============================================================================

function formatSize(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function getSizeClass(bytes) {
  if (bytes > 1073741824) return "pf-m-red"; // > 1GB
  if (bytes > 104857600) return "pf-m-orange"; // > 100MB
  return "pf-m-green";
}

function formatDate(isoString) {
  if (!isoString) return "-";
  const date = new Date(isoString);
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRelativeTime(isoString) {
  if (!isoString) return "-";
  const date = new Date(isoString);
  const now = new Date();
  const diff = now - date;

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 60) return `${minutes} min atrás`;
  if (hours < 24) return `${hours}h atrás`;
  return `${days} dias atrás`;
}

function getFileIcon(filename) {
  const ext = filename.split(".").pop().toLowerCase();
  const icons = {
    // Arquivos compactados
    gz: "📦",
    tar: "📦",
    zip: "📦",
    "7z": "📦",
    rar: "📦",
    xz: "📦",
    bz2: "📦",
    // Bancos de dados
    sql: "🗄️",
    dump: "🗄️",
    bak: "🗄️",
    // Imagens
    img: "💿",
    iso: "💿",
    qcow2: "💿",
    vmdk: "💿",
    vdi: "💿",
    // Logs e texto
    log: "📄",
    txt: "📄",
    // XML e config
    xml: "📋",
    json: "📋",
    yaml: "📋",
    yml: "📋",
    // Scripts
    sh: "⚙️",
    bash: "⚙️",
    py: "🐍",
  };
  return icons[ext] || "📁";
}

// ============================================================================
// ESCAPE E SEGURANÇA
// ============================================================================

function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function escapeJs(value) {
  if (value == null) return "";
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r");
}

function makeSafeId(value) {
  if (!value) return "";
  return String(value)
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .toLowerCase();
}

// ============================================================================
// ALERTAS E LOADING
// ============================================================================

function showAlert(type, message, timeout = 5000) {
  const container = document.getElementById("alert-container");
  if (!container) return;

  const alertId = "alert-" + Date.now();
  const alertHtml = `
    <div id="${alertId}" class="pf-c-alert pf-m-${type}" aria-label="${type}">
      <div class="pf-c-alert__icon">
        ${getAlertIcon(type)}
      </div>
      <p class="pf-c-alert__title">${message}</p>
      <div class="pf-c-alert__action">
        <button class="pf-c-button pf-m-plain" type="button" onclick="document.getElementById('${alertId}').remove()">
          <span aria-hidden="true">×</span>
        </button>
      </div>
    </div>
  `;

  container.insertAdjacentHTML("beforeend", alertHtml);

  if (timeout > 0) {
    setTimeout(() => {
      const alertEl = document.getElementById(alertId);
      if (alertEl) alertEl.remove();
    }, timeout);
  }
}

function getAlertIcon(type) {
  switch (type) {
    case "success":
      return "✓";
    case "danger":
      return "✕";
    case "warning":
      return "⚠";
    case "info":
      return "ℹ";
    default:
      return "ℹ";
  }
}

function showLoading(show) {
  const loading = document.getElementById("loading");
  if (loading) {
    loading.style.display = show ? "block" : "none";
  }
}

// ============================================================================
// COCKPIT ERROR FORMATTING
// ============================================================================

function formatCockpitError(error) {
  if (!error) return "Erro desconhecido";
  if (typeof error === "string") return error;
  if (error.message) return error.message;
  if (error.problem) return error.problem;
  return JSON.stringify(error);
}

// Exportar para uso global (compatibilidade com scripts inline)
window.formatSize = formatSize;
window.getSizeClass = getSizeClass;
window.formatDate = formatDate;
window.formatRelativeTime = formatRelativeTime;
window.getFileIcon = getFileIcon;
window.escapeHtml = escapeHtml;
window.escapeJs = escapeJs;
window.makeSafeId = makeSafeId;
window.showAlert = showAlert;
window.getAlertIcon = getAlertIcon;
window.showLoading = showLoading;
window.formatCockpitError = formatCockpitError;

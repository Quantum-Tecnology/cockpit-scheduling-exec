// Inicializar conexão com Cockpit
const cockpit = window.cockpit;

// Estado da aplicação
let backupDirectories = [];
let allBackups = [];
let selectedBackups = new Set();
let currentDeleteTarget = null;
let emailConfig = {
  recipient: "",
  subject: "Backup do Sistema - {{date}}",
  maxSize: 25,
};
let userHome = null;
let configFile = null;

// Constantes
const SCRIPTS_DIR = "/usr/share/cockpit/scheduling_exec/scripts/backup";

// Inicialização
document.addEventListener("DOMContentLoaded", async () => {
  console.log("Backup Manager: Inicializando...");

  // Obter home do usuário usando getent ou whoami
  try {
    // Tentar obter usuário atual
    const user = await cockpit.spawn(["whoami"], { err: "message" });
    const username = user.trim();

    // Obter home do passwd
    const passwdEntry = await cockpit.spawn(["getent", "passwd", username], {
      err: "message",
    });
    const homePath = passwdEntry.trim().split(":")[5];

    userHome = homePath || `/home/${username}`;
    configFile = `${userHome}/.backup-manager/config.json`;

    console.log("Backup Manager: Usuário:", username);
    console.log("Backup Manager: Home do usuário:", userHome);
    console.log("Backup Manager: Arquivo de configuração:", configFile);
  } catch (error) {
    console.error("Backup Manager: Erro ao obter home:", error);
    // Fallback: usar /tmp para evitar problemas de permissão
    userHome = "/tmp";
    configFile = "/tmp/.backup-manager-config.json";
    console.log("Backup Manager: Usando /tmp como fallback");
  }

  // Garantir que as abas estejam sempre visíveis
  const tabsContainer = document.getElementById("backup-tabs");
  if (tabsContainer) {
    tabsContainer.style.display = "block";
    tabsContainer.style.visibility = "visible";
    tabsContainer.style.opacity = "1";
    console.log("Backup Manager: Abas configuradas");
  } else {
    console.error("Backup Manager: Elemento #backup-tabs não encontrado!");
  }

  // Carregar configuração primeiro, depois os backups
  await loadConfiguration();
  await loadBackups();
  setupEventListeners();

  // Garantir que a aba de backups esteja visível inicialmente
  switchTab("backups");

  console.log("Backup Manager: Inicialização completa");
});

// ============================================================================
// CONFIGURAÇÃO
// ============================================================================

async function loadConfiguration() {
  // Usar caminho do sistema
  const systemConfigFile = "/var/lib/cockpit/backup-manager/config.json";

  console.log("Backup Manager: Carregando configuração de", systemConfigFile);
  try {
    const result = await cockpit.spawn(["cat", systemConfigFile], {
      err: "message",
    });
    const config = JSON.parse(result);
    backupDirectories = config.directories || [];
    emailConfig = { ...emailConfig, ...config.email };

    // Atualizar referência global
    configFile = systemConfigFile;

    console.log(
      "Backup Manager: Configuração carregada com sucesso!",
      backupDirectories.length,
      "diretório(s)"
    );

    updateUI();
    updateDirectoriesList();
    updateDirectoryFilter();
    updateEmailForm();
  } catch (error) {
    console.log(
      "Backup Manager: Arquivo de configuração não encontrado, criando novo..."
    );
    // Se o arquivo não existir, criar configuração padrão
    configFile = systemConfigFile;
    backupDirectories = [];
    await saveConfiguration();
  }
}

async function saveConfiguration() {
  const config = {
    directories: backupDirectories,
    email: emailConfig,
    version: "1.0.0",
    lastUpdated: new Date().toISOString(),
  };

  console.log(
    "Backup Manager: Salvando configuração...",
    backupDirectories.length,
    "diretório(s)"
  );

  try {
    // Usar diretório do sistema acessível
    const configDir = "/var/lib/cockpit/backup-manager";
    const targetFile = `${configDir}/config.json`;

    console.log("Backup Manager: Diretório de configuração:", configDir);

    // Criar diretório se não existir (com sudo)
    try {
      await cockpit.spawn(["test", "-d", configDir], { err: "ignore" });
      console.log("Backup Manager: Diretório já existe");
    } catch (e) {
      console.log(
        "Backup Manager: Criando diretório (solicitando privilégios)..."
      );
      await cockpit.spawn(["mkdir", "-p", configDir], {
        err: "message",
        superuser: "require",
      });
      console.log("Backup Manager: Diretório criado com sucesso");
    }

    console.log("Backup Manager: Salvando arquivo em:", targetFile);
    const configJson = JSON.stringify(config, null, 2);

    // Salvar com privilégios de root
    const process = cockpit.spawn(["tee", targetFile], {
      err: "message",
      superuser: "require",
    });
    process.input(configJson);
    await process;

    // Garantir permissões corretas no arquivo
    await cockpit.spawn(["chmod", "644", targetFile], {
      err: "ignore",
      superuser: "require",
    });

    console.log("Backup Manager: ✓ Configuração salva em", targetFile);
    showAlert("success", "✅ Configuração salva com sucesso!");

    // Atualizar referência global
    configFile = targetFile;

    // Verificar se foi salvo corretamente
    console.log("Backup Manager: Verificando arquivo salvo...");
    const verify = await cockpit.spawn(["cat", targetFile], {
      err: "message",
    });
    console.log(
      "Backup Manager: ✓ Arquivo contém:",
      verify.substring(0, 100) + "..."
    );
  } catch (error) {
    console.error("Backup Manager: ✗ Erro ao salvar configuração:", error);
    const errorMsg =
      error?.message ||
      error?.toString() ||
      JSON.stringify(error) ||
      "Erro desconhecido";
    showAlert("danger", `❌ Erro ao salvar configuração: ${errorMsg}`);
    throw error; // Re-lançar para debug
  }
}

// ============================================================================
// DIRETÓRIOS
// ============================================================================

function openAddDirectoryModal() {
  document.getElementById("add-directory-modal").style.display = "block";
  document.getElementById("directory-path").focus();
}

function closeAddDirectoryModal() {
  document.getElementById("add-directory-modal").style.display = "none";
  document.getElementById("add-directory-form").reset();
}

async function browseDirectory() {
  const pathInput = document.getElementById("directory-path");
  const currentPath = pathInput.value || userHome;

  // Abrir modal de navegação de diretórios
  document.getElementById("directory-browser-modal").style.display = "block";
  await loadDirectoryContents(currentPath);
}

function closeDirectoryBrowser() {
  document.getElementById("directory-browser-modal").style.display = "none";
}

async function loadDirectoryContents(path) {
  const container = document.getElementById("directory-list");
  const currentPathSpan = document.getElementById("current-path");
  const pathInput = document.getElementById("directory-path");

  currentPathSpan.textContent = path;
  container.innerHTML =
    '<div style="text-align: center; padding: 2rem;">Carregando...</div>';

  try {
    // Listar diretórios
    const result = await cockpit.spawn(
      ["find", path, "-maxdepth", "1", "-type", "d"],
      { err: "message" }
    );

    const dirs = result
      .trim()
      .split("\n")
      .filter((d) => d && d !== path)
      .sort();

    if (dirs.length === 0) {
      container.innerHTML =
        '<div style="text-align: center; padding: 2rem; color: #999;">Nenhum subdiretório encontrado</div>';
      return;
    }

    container.innerHTML = dirs
      .map((dir) => {
        const name = dir.split("/").pop();
        return `
          <div class="directory-item" style="padding: 0.75rem; border-bottom: 1px solid #e9ecef; display: flex; align-items: center; justify-content: space-between; cursor: pointer;" onmouseenter="this.style.backgroundColor='#f8f9fa'" onmouseleave="this.style.backgroundColor='white'">
            <div style="display: flex; align-items: center; flex: 1;" onclick="loadDirectoryContents('${escapeHtml(
              dir
            )}')">
              <span style="font-size: 1.5rem; margin-right: 0.75rem;">📁</span>
              <span style="font-family: monospace;">${escapeHtml(name)}</span>
            </div>
            <button class="pf-c-button pf-m-primary pf-m-small" onclick="selectDirectory('${escapeHtml(
              dir
            )}')">Selecionar</button>
          </div>
        `;
      })
      .join("");
  } catch (error) {
    container.innerHTML = `<div style="text-align: center; padding: 2rem; color: #c9190b;">Erro ao listar diretórios: ${escapeHtml(
      error?.message || "Caminho inválido"
    )}</div>`;
  }
}

function selectDirectory(path) {
  document.getElementById("directory-path").value = path;
  closeDirectoryBrowser();
  showAlert("success", `✅ Diretório selecionado: ${path}`);
}

function navigateToParent() {
  const currentPath = document.getElementById("current-path").textContent;
  if (currentPath === "/") return;

  const parentPath = currentPath.split("/").slice(0, -1).join("/") || "/";
  loadDirectoryContents(parentPath);
}

function navigateToHome() {
  loadDirectoryContents(userHome);
}

function navigateToRoot() {
  loadDirectoryContents("/");
}

function showCommonDirectories() {
  const container = document.getElementById("directory-list");
  const commonDirs = [
    { path: userHome, icon: "🏠", label: "Home" },
    { path: "/var/backups", icon: "💾", label: "Sistema - /var/backups" },
    { path: "/home", icon: "👥", label: "Usuários - /home" },
    { path: "/tmp", icon: "📦", label: "Temporário - /tmp" },
    { path: "/opt", icon: "📁", label: "Aplicações - /opt" },
    { path: "/srv", icon: "🖥️", label: "Serviços - /srv" },
  ];

  document.getElementById("current-path").textContent = "Diretórios Comuns";
  container.innerHTML = commonDirs
    .map(
      (dir) => `
      <div class="directory-item" style="padding: 0.75rem; border-bottom: 1px solid #e9ecef; display: flex; align-items: center; justify-content: space-between; cursor: pointer;" onmouseenter="this.style.backgroundColor='#f8f9fa'" onmouseleave="this.style.backgroundColor='white'">
        <div style="display: flex; align-items: center; flex: 1;" onclick="loadDirectoryContents('${escapeHtml(
          dir.path
        )}')">
          <span style="font-size: 1.5rem; margin-right: 0.75rem;">${
            dir.icon
          }</span>
          <span>${escapeHtml(dir.label)}</span>
        </div>
        <button class="pf-c-button pf-m-primary pf-m-small" onclick="selectDirectory('${escapeHtml(
          dir.path
        )}')">Selecionar</button>
      </div>
    `
    )
    .join("");
}

async function addDirectory() {
  const path = document.getElementById("directory-path").value.trim();
  const label = document.getElementById("directory-label").value.trim();
  const pattern = document.getElementById("file-pattern").value.trim() || "*";
  const maxDepth = document.getElementById("max-depth").value.trim() || "10";

  if (!path) {
    showAlert("warning", "Por favor, informe o caminho do diretório.");
    return;
  }

  // Verificar se o diretório existe
  try {
    await cockpit.spawn(["test", "-d", path]);
  } catch (error) {
    showAlert("danger", `Diretório não encontrado: ${path}`);
    return;
  }

  // Verificar se já existe
  if (backupDirectories.some((d) => d.path === path)) {
    showAlert("warning", "Este diretório já está na lista.");
    return;
  }

  // Adicionar diretório
  backupDirectories.push({
    id: Date.now().toString(),
    path: path,
    label: label || path.split("/").pop(),
    pattern: pattern,
    maxDepth: parseInt(maxDepth),
    addedAt: new Date().toISOString(),
  });

  await saveConfiguration();
  updateDirectoriesList();
  updateDirectoryFilter();
  closeAddDirectoryModal();

  // Recarregar backups automaticamente
  console.log("Backup Manager: Recarregando lista de backups...");
  await loadBackups();
  console.log("Backup Manager: Lista de backups atualizada");
}

async function removeDirectory(id) {
  const directory = backupDirectories.find((d) => d.id === id);
  if (!directory) return;

  currentDeleteTarget = { type: "directory", id: id, name: directory.path };
  document.getElementById(
    "delete-message"
  ).textContent = `Você está prestes a remover o diretório "${directory.label}" da lista de monitoramento. Os arquivos não serão deletados.`;
  document.getElementById("delete-confirm-modal").style.display = "block";
}

function updateDirectoriesList() {
  const container = document.getElementById("directories-list");

  if (backupDirectories.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="padding: var(--pf-global--spacer--lg);">
        <p style="color: var(--pf-global--Color--200); text-align: center;">
          Nenhum diretório configurado ainda.
        </p>
      </div>
    `;
    return;
  }

  container.innerHTML = backupDirectories
    .map(
      (dir) => `
    <div class="directory-item">
      <div style="display: flex; align-items: center; flex: 1;">
        <span class="directory-icon">📁</span>
        <div>
          <div style="font-weight: bold;">${escapeHtml(dir.label)}</div>
          <div class="directory-path">${escapeHtml(dir.path)}</div>
          <small style="color: var(--pf-global--Color--200);">
            Padrão: ${escapeHtml(dir.pattern)} |
            Profundidade: ${dir.maxDepth || 1} |
            Adicionado em: ${formatDate(dir.addedAt)}
          </small>
        </div>
      </div>
      <button class="pf-c-button pf-m-danger pf-m-small" onclick="removeDirectory('${
        dir.id
      }')">
        🗑️ Remover
      </button>
    </div>
  `
    )
    .join("");
}

function updateDirectoryFilter() {
  const select = document.getElementById("directory-filter");
  const currentValue = select.value;

  select.innerHTML =
    '<option value="">Todos os diretórios</option>' +
    backupDirectories
      .map(
        (dir) =>
          `<option value="${escapeHtml(dir.path)}">${escapeHtml(
            dir.label
          )}</option>`
      )
      .join("");

  if (currentValue) {
    select.value = currentValue;
  }
}

// ============================================================================
// BACKUPS
// ============================================================================

async function loadBackups() {
  console.log("Backup Manager: loadBackups() chamado");
  console.log(
    "Backup Manager: Número de diretórios configurados:",
    backupDirectories.length
  );

  allBackups = [];

  if (backupDirectories.length === 0) {
    console.log(
      "Backup Manager: Nenhum diretório configurado, não há backups para carregar"
    );
    updateBackupsTable();
    updateStats();
    return;
  }

  showAlert("info", "🔄 Carregando lista de backups...", 2000);
  console.log(
    "Backup Manager: Iniciando carregamento de backups de",
    backupDirectories.length,
    "diretório(s)"
  );

  for (const dir of backupDirectories) {
    console.log(
      `Backup Manager: Carregando backups de ${dir.label} (${dir.path})`
    );
    try {
      await loadBackupsFromDirectory(dir);
      console.log(`Backup Manager: ✓ Backups carregados de ${dir.label}`);
    } catch (error) {
      console.error(
        `Backup Manager: ✗ Erro ao carregar backups de ${dir.path}:`,
        error
      );
    }
  }

  console.log(
    "Backup Manager: Total de backups encontrados:",
    allBackups.length
  );
  updateBackupsTable();
  updateStats();
  showAlert(
    "success",
    `✅ ${allBackups.length} backup(s) encontrado(s)!`,
    3000
  );
}

async function loadBackupsFromDirectory(directory) {
  try {
    // Listar arquivos do diretório recursivamente
    const patterns = directory.pattern.split(",").map((p) => p.trim());
    const files = [];
    const maxDepth = directory.maxDepth || 10;

    for (const pattern of patterns) {
      try {
        const command =
          pattern === "*"
            ? [
                "find",
                directory.path,
                "-maxdepth",
                maxDepth.toString(),
                "-type",
                "f",
              ]
            : [
                "find",
                directory.path,
                "-maxdepth",
                maxDepth.toString(),
                "-type",
                "f",
                "-name",
                pattern,
              ];

        const result = await cockpit.spawn(command, { err: "ignore" });
        const foundFiles = result
          .trim()
          .split("\n")
          .filter((f) => f);
        files.push(...foundFiles);
      } catch (error) {
        // Padrão não encontrou arquivos
      }
    }

    // Obter informações detalhadas de cada arquivo
    for (const file of files) {
      try {
        const stat = await cockpit.spawn(["stat", "-c", "%s|%Y|%n", file]);
        const [size, mtime, name] = stat.trim().split("|");

        // Calcular caminho relativo ao diretório base
        const relativePath = name.replace(directory.path + "/", "");
        const fileName = name.split("/").pop();
        const subPath = relativePath.substring(
          0,
          relativePath.length - fileName.length
        );

        allBackups.push({
          id: `${directory.id}-${name}`,
          name: fileName,
          relativePath: relativePath,
          subPath: subPath || "/",
          fullPath: name,
          directory: directory,
          directoryLabel: directory.label,
          directoryPath: directory.path,
          size: parseInt(size),
          createdAt: new Date(parseInt(mtime) * 1000).toISOString(),
          selected: false,
        });
      } catch (error) {
        console.error(`Erro ao obter info de ${file}:`, error);
      }
    }
  } catch (error) {
    throw error;
  }
}

function updateBackupsTable() {
  const tbody = document.getElementById("backups-table-body");
  const emptyState = document.getElementById("empty-state");

  if (allBackups.length === 0) {
    tbody.innerHTML = "";
    emptyState.style.display = "block";
    document.querySelector(".backup-table-wrapper").style.display = "none";
    return;
  }

  emptyState.style.display = "none";
  document.querySelector(".backup-table-wrapper").style.display = "block";

  const filteredBackups = getFilteredBackups();

  tbody.innerHTML = filteredBackups
    .map(
      (backup) => `
    <tr>
      <td>
        <input
          type="checkbox"
          class="custom-checkbox backup-checkbox"
          data-backup-id="${backup.id}"
          ${selectedBackups.has(backup.id) ? "checked" : ""}
          onchange="toggleBackupSelection('${backup.id}', this.checked)"
        >
      </td>
      <td>
        <div style="display: flex; align-items: center;">
          <span style="margin-right: var(--pf-global--spacer--sm);">
            ${getFileIcon(backup.name)}
          </span>
          <div>
            <div style="font-family: monospace; font-size: 0.9rem; font-weight: bold;">
              ${escapeHtml(backup.name)}
            </div>
            ${
              backup.subPath && backup.subPath !== "/"
                ? `<small style="color: var(--pf-global--Color--200); font-family: monospace;">
                📂 ${escapeHtml(backup.subPath)}
              </small>`
                : ""
            }
          </div>
        </div>
      </td>
      <td>
        <div>
          ${formatDate(backup.createdAt)}
        </div>
        <small style="color: var(--pf-global--Color--200);">
          ${formatRelativeTime(backup.createdAt)}
        </small>
      </td>
      <td>
        <div style="font-weight: bold;">${escapeHtml(
          backup.directoryLabel
        )}</div>
        <small style="font-family: monospace; color: var(--pf-global--Color--200);">
          ${escapeHtml(backup.directoryPath)}
        </small>
      </td>
      <td>
        <span class="size-badge ${getSizeClass(backup.size)}">
          ${formatSize(backup.size)}
        </span>
      </td>
      <td style="text-align: right;">
        <div class="action-buttons">
          <button
            class="pf-c-button pf-m-secondary btn-icon"
            onclick="downloadBackup('${backup.id}')"
            data-tooltip="Download"
          >
            ⬇️
          </button>
          <button
            class="pf-c-button pf-m-secondary btn-icon"
            onclick="openEmailModalForBackup('${backup.id}')"
            data-tooltip="Enviar por email"
          >
            📧
          </button>
          <button
            class="pf-c-button pf-m-danger btn-icon"
            onclick="deleteBackup('${backup.id}')"
            data-tooltip="Deletar"
          >
            🗑️
          </button>
        </div>
      </td>
    </tr>
  `
    )
    .join("");

  updateSelectionButtons();
}

function getFilteredBackups() {
  let filtered = [...allBackups];

  // Filtro de busca (agora busca também no caminho relativo)
  const searchTerm = document
    .getElementById("search-input")
    .value.toLowerCase();
  if (searchTerm) {
    filtered = filtered.filter(
      (b) =>
        b.name.toLowerCase().includes(searchTerm) ||
        (b.relativePath && b.relativePath.toLowerCase().includes(searchTerm))
    );
  }

  // Filtro de diretório
  const directoryFilter = document.getElementById("directory-filter").value;
  if (directoryFilter) {
    filtered = filtered.filter((b) => b.directoryPath === directoryFilter);
  }

  // Ordenação
  const sortBy = document.getElementById("sort-by").value;
  filtered.sort((a, b) => {
    switch (sortBy) {
      case "date-desc":
        return new Date(b.createdAt) - new Date(a.createdAt);
      case "date-asc":
        return new Date(a.createdAt) - new Date(b.createdAt);
      case "size-desc":
        return b.size - a.size;
      case "size-asc":
        return a.size - b.size;
      case "name-asc":
        return a.name.localeCompare(b.name);
      case "name-desc":
        return b.name.localeCompare(a.name);
      case "path-asc":
        return (a.relativePath || a.name).localeCompare(
          b.relativePath || b.name
        );
      case "path-desc":
        return (b.relativePath || b.name).localeCompare(
          a.relativePath || a.name
        );
      default:
        return 0;
    }
  });

  return filtered;
}

function filterBackups() {
  updateBackupsTable();
}

// ============================================================================
// SELEÇÃO
// ============================================================================

function toggleBackupSelection(id, checked) {
  if (checked) {
    selectedBackups.add(id);
  } else {
    selectedBackups.delete(id);
  }
  updateSelectionButtons();
  updateSelectAllCheckbox();
}

function toggleSelectAll(checkbox) {
  const filteredBackups = getFilteredBackups();
  filteredBackups.forEach((backup) => {
    if (checkbox.checked) {
      selectedBackups.add(backup.id);
    } else {
      selectedBackups.delete(backup.id);
    }
  });
  updateBackupsTable();
}

function selectAllBackups() {
  const filteredBackups = getFilteredBackups();
  filteredBackups.forEach((backup) => selectedBackups.add(backup.id));
  updateBackupsTable();
}

function deselectAllBackups() {
  selectedBackups.clear();
  updateBackupsTable();
}

function updateSelectAllCheckbox() {
  const checkbox = document.getElementById("select-all-checkbox");
  const filteredBackups = getFilteredBackups();
  const allSelected =
    filteredBackups.length > 0 &&
    filteredBackups.every((b) => selectedBackups.has(b.id));
  checkbox.checked = allSelected;
}

function updateSelectionButtons() {
  const hasSelection = selectedBackups.size > 0;
  document.getElementById("export-selected-btn").disabled = !hasSelection;
  document.getElementById("delete-selected-btn").disabled = !hasSelection;
}

// ============================================================================
// AÇÕES DE BACKUP
// ============================================================================

async function downloadBackup(id) {
  const backup = allBackups.find((b) => b.id === id);
  if (!backup) return;

  try {
    // Usar o recurso de download do Cockpit
    const file = cockpit.file(backup.fullPath, { binary: true });
    const content = await file.read();

    // Criar download
    const blob = new Blob([content], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = backup.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showAlert("success", `Download de "${backup.name}" iniciado!`);
  } catch (error) {
    const errorMsg = error?.message || error?.toString() || "Erro desconhecido";
    showAlert("danger", `Erro ao fazer download: ${errorMsg}`);
  }
}

function openEmailModalForBackup(id) {
  selectedBackups.clear();
  selectedBackups.add(id);
  openEmailModal();
}

function openEmailModal() {
  if (selectedBackups.size === 0) {
    showAlert("warning", "Selecione pelo menos um backup para enviar.");
    return;
  }

  const modal = document.getElementById("email-modal");
  const filesList = document.getElementById("email-files-list");
  const emailTo = document.getElementById("email-to");

  // Preencher lista de arquivos
  const backups = Array.from(selectedBackups).map((id) =>
    allBackups.find((b) => b.id === id)
  );
  filesList.innerHTML = backups
    .map(
      (b) => `
    <div style="padding: var(--pf-global--spacer--xs); border-bottom: 1px solid var(--pf-global--BorderColor--100);">
      ${getFileIcon(b.name)} ${escapeHtml(b.name)} (${formatSize(b.size)})
    </div>
  `
    )
    .join("");

  // Preencher email do destinatário
  emailTo.value = emailConfig.recipient;

  modal.style.display = "block";
}

function closeEmailModal() {
  document.getElementById("email-modal").style.display = "none";
  document.getElementById("send-email-form").reset();
}

async function sendEmail() {
  const emailTo = document.getElementById("email-to").value.trim();
  const message = document.getElementById("email-message").value.trim();

  if (!emailTo) {
    showAlert("warning", "Por favor, informe o email do destinatário.");
    return;
  }

  const backups = Array.from(selectedBackups).map((id) =>
    allBackups.find((b) => b.id === id)
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

    await cockpit.spawn([
      "/usr/share/cockpit/scheduling_exec/scripts/backup/send-backup-email.sh",
      emailTo,
      subject,
      files,
      message,
    ]);

    showAlert("success", `✅ Email enviado com sucesso para ${emailTo}!`);
    closeEmailModal();
  } catch (error) {
    const errorMsg = error?.message || error?.toString() || "Erro desconhecido";
    showAlert("danger", `Erro ao enviar email: ${errorMsg}`);
  }
}

function deleteBackup(id) {
  const backup = allBackups.find((b) => b.id === id);
  if (!backup) return;

  currentDeleteTarget = {
    type: "backup",
    id: id,
    name: backup.name,
    path: backup.fullPath,
  };
  document.getElementById(
    "delete-message"
  ).textContent = `Você está prestes a deletar o arquivo "${backup.name}". Esta ação não pode ser desfeita.`;
  document.getElementById("delete-confirm-modal").style.display = "block";
}

async function deleteSelectedBackups() {
  if (selectedBackups.size === 0) return;

  const backups = Array.from(selectedBackups).map((id) =>
    allBackups.find((b) => b.id === id)
  );
  currentDeleteTarget = {
    type: "multiple",
    backups: backups,
    names: backups.map((b) => b.name),
  };

  document.getElementById(
    "delete-message"
  ).textContent = `Você está prestes a deletar ${backups.length} arquivo(s). Esta ação não pode ser desfeita.`;
  document.getElementById("delete-confirm-modal").style.display = "block";
}

function closeDeleteModal() {
  document.getElementById("delete-confirm-modal").style.display = "none";
  currentDeleteTarget = null;
}

async function confirmDelete() {
  if (!currentDeleteTarget) return;

  try {
    if (currentDeleteTarget.type === "directory") {
      // Remover diretório da configuração
      backupDirectories = backupDirectories.filter(
        (d) => d.id !== currentDeleteTarget.id
      );
      await saveConfiguration();
      updateDirectoriesList();
      updateDirectoryFilter();
      await loadBackups();
    } else if (currentDeleteTarget.type === "backup") {
      // Deletar arquivo único
      await cockpit.spawn(["rm", "-f", currentDeleteTarget.path]);
      await loadBackups();
      showAlert(
        "success",
        `Backup "${currentDeleteTarget.name}" deletado com sucesso!`
      );
    } else if (currentDeleteTarget.type === "multiple") {
      // Deletar múltiplos arquivos
      const paths = currentDeleteTarget.backups.map((b) => b.fullPath);
      await cockpit.spawn(["rm", "-f", ...paths]);
      selectedBackups.clear();
      await loadBackups();
      showAlert(
        "success",
        `${currentDeleteTarget.backups.length} backup(s) deletado(s) com sucesso!`
      );
    }

    closeDeleteModal();
  } catch (error) {
    const errorMsg = error?.message || error?.toString() || "Erro desconhecido";
    showAlert("danger", `Erro ao deletar: ${errorMsg}`);
  }
}

async function exportSelectedBackups() {
  if (selectedBackups.size === 0) {
    showAlert("warning", "Selecione pelo menos um backup para exportar.");
    return;
  }

  const backups = Array.from(selectedBackups).map((id) =>
    allBackups.find((b) => b.id === id)
  );
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outputFile = `${userHome}/backups-export-${timestamp}.tar.gz`;

  try {
    showAlert("info", "📦 Criando arquivo de exportação...", 0);

    const files = backups.map((b) => b.fullPath);
    await cockpit.spawn(["tar", "-czf", outputFile, ...files]);

    showAlert("success", `✅ Backups exportados para: ${outputFile}`);
  } catch (error) {
    const errorMsg = error?.message || error?.toString() || "Erro desconhecido";
    showAlert("danger", `Erro ao exportar: ${errorMsg}`);
  }
}

async function exportAllBackups() {
  if (allBackups.length === 0) {
    showAlert("warning", "Não há backups para exportar.");
    return;
  }

  // Selecionar todos e exportar
  allBackups.forEach((b) => selectedBackups.add(b.id));
  await exportSelectedBackups();
  selectedBackups.clear();
  updateBackupsTable();
}

async function refreshBackupList() {
  selectedBackups.clear();
  await loadBackups();
}

async function cleanOldBackups() {
  // Modal para confirmar limpeza de backups antigos
  const days = prompt(
    "Deletar backups com mais de quantos dias? (Digite um número)",
    "30"
  );

  if (!days || isNaN(days)) return;

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));

  const oldBackups = allBackups.filter(
    (b) => new Date(b.createdAt) < cutoffDate
  );

  if (oldBackups.length === 0) {
    showAlert("info", `Não há backups com mais de ${days} dias.`);
    return;
  }

  currentDeleteTarget = {
    type: "multiple",
    backups: oldBackups,
    names: oldBackups.map((b) => b.name),
  };

  document.getElementById(
    "delete-message"
  ).textContent = `Você está prestes a deletar ${oldBackups.length} backup(s) com mais de ${days} dias.`;
  document.getElementById("delete-confirm-modal").style.display = "block";
}

// ============================================================================
// EMAIL CONFIGURATION
// ============================================================================

function updateEmailForm() {
  document.getElementById("email-recipient").value = emailConfig.recipient;
  document.getElementById("email-subject").value = emailConfig.subject;
  document.getElementById("max-email-size").value = emailConfig.maxSize;
}

function setupEventListeners() {
  document
    .getElementById("email-config-form")
    .addEventListener("submit", async (e) => {
      e.preventDefault();

      emailConfig.recipient = document
        .getElementById("email-recipient")
        .value.trim();
      emailConfig.subject = document
        .getElementById("email-subject")
        .value.trim();
      emailConfig.maxSize = parseInt(
        document.getElementById("max-email-size").value
      );

      await saveConfiguration();
    });
}

// ============================================================================
// UI HELPERS
// ============================================================================

function switchTab(tab) {
  console.log(`Backup Manager: Mudando para aba ${tab}`);

  // Garantir que as abas estejam visíveis
  const tabsContainer = document.getElementById("backup-tabs");
  if (tabsContainer) {
    tabsContainer.style.display = "block";
    tabsContainer.style.visibility = "visible";
    tabsContainer.style.opacity = "1";
  } else {
    console.error(
      "Backup Manager: Elemento #backup-tabs não encontrado em switchTab!"
    );
  }

  // Atualizar abas
  document.querySelectorAll(".pf-c-tabs__item").forEach((item) => {
    item.classList.remove("pf-m-current");
  });

  const tabElement = document.getElementById(`tab-${tab}`);
  if (tabElement && tabElement.parentElement) {
    tabElement.parentElement.classList.add("pf-m-current");
    console.log(`Backup Manager: Aba ${tab} marcada como ativa`);
  } else {
    console.error(`Backup Manager: Elemento #tab-${tab} não encontrado!`);
  }

  // Atualizar conteúdo
  const backupsTab = document.getElementById("backups-tab-content");
  const configTab = document.getElementById("config-tab-content");

  if (backupsTab) {
    backupsTab.style.display = tab === "backups" ? "block" : "none";
  }
  if (configTab) {
    configTab.style.display = tab === "config" ? "block" : "none";
  }

  console.log(`Backup Manager: Conteúdo da aba ${tab} exibido`);
}

function updateStats() {
  const totalBackups = allBackups.length;
  const totalDirectories = backupDirectories.length;
  const totalSize = allBackups.reduce((sum, b) => sum + b.size, 0);
  const lastBackup =
    allBackups.length > 0
      ? allBackups.sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        )[0]
      : null;

  document.getElementById("total-backups").textContent = totalBackups;
  document.getElementById("total-directories").textContent = totalDirectories;
  document.getElementById("total-size").textContent = formatSize(totalSize);
  document.getElementById("last-backup").textContent = lastBackup
    ? formatRelativeTime(lastBackup.createdAt)
    : "Nunca";
}

function updateUI() {
  updateStats();
  updateDirectoriesList();
  updateBackupsTable();
}

function showAlert(type, message, timeout = 5000) {
  const container = document.getElementById("alerts-container");
  const id = "alert-" + Date.now();

  const alertHTML = `
    <div class="pf-c-alert pf-m-${type}" id="${id}">
      <div class="pf-c-alert__icon">
        <i class="fas fa-${getAlertIcon(type)}"></i>
      </div>
      <h4 class="pf-c-alert__title">${message}</h4>
      <div class="pf-c-alert__action">
        <button class="pf-c-button pf-m-plain" onclick="document.getElementById('${id}').remove()">
          <i class="fas fa-times"></i>
        </button>
      </div>
    </div>
  `;

  container.insertAdjacentHTML("beforeend", alertHTML);

  if (timeout > 0) {
    setTimeout(() => {
      const alert = document.getElementById(id);
      if (alert) alert.remove();
    }, timeout);
  }
}

function getAlertIcon(type) {
  const icons = {
    success: "check-circle",
    danger: "exclamation-circle",
    warning: "exclamation-triangle",
    info: "info-circle",
  };
  return icons[type] || "info-circle";
}

// ============================================================================
// FORMATTERS
// ============================================================================

function formatSize(bytes) {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

function getSizeClass(bytes) {
  const mb = bytes / (1024 * 1024);
  if (mb < 10) return "size-small";
  if (mb < 100) return "size-medium";
  return "size-large";
}

function formatDate(isoString) {
  const date = new Date(isoString);
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRelativeTime(isoString) {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Agora mesmo";
  if (diffMins < 60)
    return `${diffMins} minuto${diffMins > 1 ? "s" : ""} atrás`;
  if (diffHours < 24)
    return `${diffHours} hora${diffHours > 1 ? "s" : ""} atrás`;
  if (diffDays < 30) return `${diffDays} dia${diffDays > 1 ? "s" : ""} atrás`;
  if (diffDays < 365)
    return `${Math.floor(diffDays / 30)} mês${
      diffDays >= 60 ? "es" : ""
    } atrás`;
  return `${Math.floor(diffDays / 365)} ano${diffDays >= 730 ? "s" : ""} atrás`;
}

function getFileIcon(filename) {
  const ext = filename.split(".").pop().toLowerCase();
  const fullExt = filename.toLowerCase();

  // Verificar extensões compostas primeiro
  if (fullExt.endsWith(".tar.gz") || fullExt.endsWith(".tgz")) return "📦";
  if (fullExt.endsWith(".tar.bz2") || fullExt.endsWith(".tbz2")) return "📦";
  if (fullExt.endsWith(".tar.xz")) return "📦";
  if (fullExt.endsWith(".sql.gz")) return "🗄️";
  if (fullExt.endsWith(".qcow2")) return "💿";

  const icons = {
    zip: "📦",
    tar: "📦",
    gz: "📦",
    rar: "📦",
    "7z": "📦",
    xz: "📦",
    bz2: "📦",
    sql: "🗄️",
    dump: "🗄️",
    db: "🗄️",
    sqlite: "🗄️",
    mysql: "🗄️",
    pgsql: "🗄️",
    bak: "💾",
    backup: "💾",
    img: "💿",
    iso: "💿",
    vmdk: "💿",
    vdi: "💿",
    qcow: "💿",
    qcow2: "💿",
    txt: "📄",
    log: "📋",
  };
  return icons[ext] || "📁";
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

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

// Variáveis globais para VMs
let allVMs = [];
let selectedVMs = new Set();
let vmBackupConfig = {
  destDir: "/mnt/storage/backups/vm_backups",
  retentionDays: 7,
  verifyChecksum: false,
};

// Variáveis globais para Automação/Scripts
let scriptDirectories = []; // Diretórios configurados pelo usuário
let allScripts = [];
let selectedScripts = new Set();
let automationCurrentEditingScript = null;
let automationImportCandidates = [];
let automationCurrentSudoScript = null;
let automationCurrentScriptEnv = null;
let automationCronModalMode = "script";
let automationOpenRowActionsMenuId = null;
let automationCurrentLogScript = null;

// Constantes
const SCRIPTS_DIR = "/usr/share/cockpit/scheduling_exec/scripts/backup";
const VM_SCRIPTS_DIR = "/usr/share/cockpit/scheduling_exec/scripts/vm";

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
    scriptDirectories = config.scriptDirectories || [];
    emailConfig = { ...emailConfig, ...config.email };
    vmBackupConfig = { ...vmBackupConfig, ...(config.vmBackupConfig || {}) };

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
    updateVMConfigForm();
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
    scriptDirectories: scriptDirectories,
    email: emailConfig,
    vmBackupConfig: vmBackupConfig,
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
  const outputFile = `/tmp/backups-export-${timestamp}.tar.gz`;

  try {
    showAlert("info", "📦 Criando arquivo de exportação...", 0);

    // Criar arquivo tar.gz no servidor
    const files = backups.map((b) => b.fullPath);
    await cockpit.spawn(["tar", "-czf", outputFile, ...files], {
      superuser: "try",
    });

    console.log("Backup Manager: Arquivo criado:", outputFile);
    showAlert("info", "📥 Iniciando download...", 0);

    // Ler o conteúdo do arquivo usando cockpit.file() com binary: true
    const file = cockpit.file(outputFile, { binary: true, superuser: "try" });
    const content = await file.read();

    // Criar Blob e iniciar download automático no navegador
    const blob = new Blob([content], { type: "application/gzip" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `backups-export-${timestamp}.tar.gz`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showAlert(
      "success",
      `✅ Download de ${backups.length} backup(s) iniciado!`
    );

    // Remover arquivo temporário após 5 segundos
    setTimeout(async () => {
      try {
        await cockpit.spawn(["rm", "-f", outputFile], { superuser: "try" });
        console.log("Backup Manager: Arquivo temporário removido:", outputFile);
      } catch (error) {
        console.error(
          "Backup Manager: Erro ao remover arquivo temporário:",
          error
        );
      }
    }, 5000);
  } catch (error) {
    const errorMsg = error?.message || error?.toString() || "Erro desconhecido";
    showAlert("danger", `Erro ao exportar: ${errorMsg}`);

    // Tentar remover arquivo em caso de erro
    try {
      await cockpit.spawn(["rm", "-f", outputFile], { superuser: "try" });
    } catch (e) {
      // Ignorar erros na limpeza
    }
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

  document
    .getElementById("test-email-config-btn")
    .addEventListener("click", testEmailConfiguration);
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
  const vmsTab = document.getElementById("vms-tab-content");
  const automationTab = document.getElementById("automation-tab-content");

  if (backupsTab) {
    backupsTab.style.display = tab === "backups" ? "block" : "none";
  }
  if (configTab) {
    configTab.style.display = tab === "config" ? "block" : "none";
  }
  if (vmsTab) {
    vmsTab.style.display = tab === "vms" ? "block" : "none";
    // Verificar permissões e auto-descobrir VMs
    if (tab === "vms") {
      const permissionsChecked = sessionStorage.getItem(
        "vm-permissions-checked"
      );
      if (!permissionsChecked) {
        setTimeout(() => checkAndFixVMScriptPermissions(), 500);
        sessionStorage.setItem("vm-permissions-checked", "true");
      }

      // Auto-descobrir VMs após verificar permissões
      if (allVMs.length === 0) {
        const discoveryRan = sessionStorage.getItem("vm-discovery-ran");
        if (!discoveryRan) {
          setTimeout(() => discoverVMs(), 1000);
          sessionStorage.setItem("vm-discovery-ran", "true");
        }
      }
    }
  }
  if (automationTab) {
    automationTab.style.display = tab === "automation" ? "block" : "none";
    // Auto-carregar scripts e renderizar diretórios
    if (tab === "automation") {
      // Renderizar lista de diretórios configurados
      automationRenderScriptDirectoriesList();

      // Auto-carregar scripts se ainda não carregou
      if (allScripts.length === 0) {
        const scriptsLoaded = sessionStorage.getItem("scripts-loaded");
        if (!scriptsLoaded) {
          console.log("Backup Manager: Carregando scripts automaticamente...");
          setTimeout(() => automationLoadScripts(), 500);
          sessionStorage.setItem("scripts-loaded", "true");
        }
      }
    }
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

// ============================================================================
// BACKUP DE VMs
// ============================================================================

// Verificar e corrigir permissões dos scripts de VM automaticamente
async function checkAndFixVMScriptPermissions() {
  try {
    console.log("VM Backup: Verificando permissões dos scripts...");

    const scripts = [
      "discover-vms.sh",
      "backup-vm.sh",
      "backup-all-vms.sh",
      "diagnose-vms.sh",
      "test-falcon-front.sh",
    ];

    let needsFix = false;

    // Verificar se os scripts têm permissão de execução
    for (const script of scripts) {
      const scriptPath = `${VM_SCRIPTS_DIR}/${script}`;

      try {
        // Tentar obter permissões do arquivo
        const stat = await cockpit.spawn(["stat", "-c", "%a", scriptPath], {
          err: "ignore",
          superuser: "try",
        });

        const permissions = stat.trim();
        console.log(`VM Backup: ${script} permissões: ${permissions}`);

        // Verificar se tem bit de execução (últimos 3 dígitos devem ter x)
        // Permissão ideal: 755 ou 775
        if (!permissions.match(/[57]/)) {
          needsFix = true;
          console.log(`VM Backup: ${script} precisa de permissão de execução`);
          break;
        }
      } catch (error) {
        console.warn(`VM Backup: Não foi possível verificar ${script}:`, error);
        needsFix = true;
        break;
      }
    }

    // Se precisar corrigir, fazer automaticamente
    if (needsFix) {
      console.log("VM Backup: Aplicando permissões automaticamente...");

      try {
        // Aplicar chmod +x em todos os scripts
        await cockpit.spawn(["bash", "-c", `chmod +x ${VM_SCRIPTS_DIR}/*.sh`], {
          err: "message",
          superuser: "require", // Vai pedir senha se necessário
        });

        console.log("VM Backup: ✅ Permissões aplicadas com sucesso!");
        showAlert("success", "✅ Scripts configurados automaticamente!");
      } catch (error) {
        console.error("VM Backup: Erro ao aplicar permissões:", error);

        // Se falhar, mostrar alerta com instruções
        const errorMsg = error?.message || "Erro ao aplicar permissões";

        showAlert(
          "warning",
          `⚠️ Não foi possível configurar automaticamente.\n\n` +
            `Execute no servidor:\n` +
            `sudo chmod +x ${VM_SCRIPTS_DIR}/*.sh`,
          15000
        );
      }
    } else {
      console.log("VM Backup: ✅ Todas as permissões OK!");
    }
  } catch (error) {
    console.error("VM Backup: Erro ao verificar permissões:", error);
    // Não mostrar erro ao usuário, apenas log
  }
}

// Função para descobrir VMs
async function discoverVMs() {
  console.log("VM Backup: Iniciando descoberta de VMs...");

  const loadingDiv = document.getElementById("vm-discovery-loading");
  const tableContainer = document.getElementById("vm-table-container");
  const emptyState = document.getElementById("vm-empty-state");
  const discoverBtn = document.getElementById("discover-vms-btn");

  try {
    // Mostrar loading
    loadingDiv.style.display = "block";
    tableContainer.style.display = "none";
    emptyState.style.display = "none";
    discoverBtn.disabled = true;

    addVMLog("🔍 Procurando VMs no sistema...");

    // Verificar se virsh está instalado
    try {
      await cockpit.spawn(["which", "virsh"], { err: "ignore" });
    } catch (error) {
      throw new Error(
        "virsh não encontrado. Instale o pacote libvirt-clients."
      );
    }

    // Chamar script de descoberta
    const scriptPath = `${VM_SCRIPTS_DIR}/discover-vms.sh`;
    const result = await cockpit.spawn(["bash", scriptPath], {
      err: "message",
      superuser: "try",
      environ: ["DEBUG=true"], // Habilitar debug
    });

    console.log("VM Backup: Resultado bruto:", result);

    // Parsear JSON
    allVMs = JSON.parse(result);

    console.log("VM Backup: VMs descobertas:", allVMs.length);
    addVMLog(`✅ ${allVMs.length} VM(s) encontrada(s)`);

    // Renderizar tabela
    renderVMTable();

    // Mostrar tabela ou empty state
    if (allVMs.length > 0) {
      tableContainer.style.display = "block";
      emptyState.style.display = "none";
    } else {
      tableContainer.style.display = "none";
      emptyState.innerHTML = `
        <div style="font-size: 4rem; margin-bottom: var(--pf-global--spacer--md); opacity: 0.5;">⚠️</div>
        <h3>Nenhuma VM encontrada</h3>
        <p style="color: var(--pf-global--Color--200);">
          Não há máquinas virtuais configuradas no sistema.
        </p>
      `;
      emptyState.style.display = "block";
    }

    showAlert("success", `✅ ${allVMs.length} VM(s) encontrada(s)`);
  } catch (error) {
    console.error("VM Backup: Erro ao descobrir VMs:", error);
    const errorMsg = error?.message || error?.toString() || "Erro desconhecido";
    showAlert("danger", `Erro ao descobrir VMs: ${errorMsg}`);
    addVMLog(`❌ Erro: ${errorMsg}`);

    emptyState.innerHTML = `
      <div style="font-size: 4rem; margin-bottom: var(--pf-global--spacer--md); opacity: 0.5;">❌</div>
      <h3>Erro ao descobrir VMs</h3>
      <p style="color: var(--pf-global--danger-color--100);">${escapeHtml(
        errorMsg
      )}</p>
      <button class="pf-c-button pf-m-primary" onclick="discoverVMs()">🔄 Tentar Novamente</button>
    `;
    emptyState.style.display = "block";
  } finally {
    loadingDiv.style.display = "none";
    discoverBtn.disabled = false;
  }
}

// Função para diagnóstico de VMs
async function diagnoseVMs() {
  console.log("VM Backup: Iniciando diagnóstico...");

  const diagnoseBtn = document.getElementById("diagnose-vms-btn");

  try {
    diagnoseBtn.disabled = true;
    showAlert("info", "🩺 Executando diagnóstico...", 0);
    addVMLog("========================================");
    addVMLog("🩺 INICIANDO DIAGNÓSTICO");
    addVMLog("========================================");

    const scriptPath = `${VM_SCRIPTS_DIR}/diagnose-vms.sh`;

    // Executar diagnóstico
    const result = await cockpit.spawn(["bash", scriptPath], {
      err: "out", // Combinar stderr com stdout
      superuser: "try",
    });

    // Adicionar resultado ao log
    const lines = result.split("\n");
    lines.forEach((line) => {
      if (line.trim()) {
        addVMLog(line);
      }
    });

    addVMLog("========================================");
    addVMLog("✅ DIAGNÓSTICO CONCLUÍDO");
    addVMLog("========================================");

    showAlert("success", "✅ Diagnóstico concluído! Veja o log abaixo.");
  } catch (error) {
    console.error("VM Backup: Erro no diagnóstico:", error);
    const errorMsg = error?.message || error?.toString() || "Erro desconhecido";
    showAlert("danger", `❌ Erro no diagnóstico: ${errorMsg}`);
    addVMLog(`❌ ERRO: ${errorMsg}`);
  } finally {
    diagnoseBtn.disabled = false;
  }
}

// Função para renderizar tabela de VMs
function renderVMTable() {
  const tbody = document.getElementById("vms-table-body");

  if (allVMs.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align: center; padding: var(--pf-global--spacer--xl);">
          <div style="opacity: 0.5;">Nenhuma VM encontrada</div>
        </td>
      </tr>
    `;
    updateVMStats();
    return;
  }

  tbody.innerHTML = allVMs
    .map((vm) => {
      const isSelected = selectedVMs.has(vm.name);
      const statusBadge =
        vm.status === "running"
          ? '<span class="pf-c-label pf-m-green"><span class="pf-c-label__content">🟢 Rodando</span></span>'
          : '<span class="pf-c-label"><span class="pf-c-label__content">⚪ Parada</span></span>';

      const diskPaths = vm.disks.map((d) => d.path).join("\n");
      const diskTooltip =
        vm.disks.length > 0 ? `title="${escapeHtml(diskPaths)}"` : "";

      return `
        <tr>
          <td>
            <input
              type="checkbox"
              class="custom-checkbox vm-checkbox"
              data-vm-name="${escapeHtml(vm.name)}"
              ${isSelected ? "checked" : ""}
              onchange="toggleVMSelection('${escapeHtml(
                vm.name
              )}', this.checked)"
            />
          </td>
          <td><strong>${escapeHtml(vm.name)}</strong></td>
          <td>${statusBadge}</td>
          <td>${vm.disks.length} disco(s)</td>
          <td><span class="size-badge ${getSizeClass(
            vm.total_size
          )}">${formatSize(vm.total_size)}</span></td>
          <td ${diskTooltip} style="cursor: help; max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            ${vm.disks.length > 0 ? escapeHtml(vm.disks[0].path) : "—"}
            ${
              vm.disks.length > 1
                ? ` <span style="color: var(--pf-global--Color--200);">+${
                    vm.disks.length - 1
                  } mais</span>`
                : ""
            }
          </td>
        </tr>
      `;
    })
    .join("");

  updateVMStats();
}

// Função para alternar seleção de VM
function toggleVMSelection(vmName, selected) {
  if (selected) {
    selectedVMs.add(vmName);
  } else {
    selectedVMs.delete(vmName);
  }

  updateVMStats();

  // Atualizar botão de backup
  const backupBtn = document.getElementById("backup-selected-vms-btn");
  backupBtn.disabled = selectedVMs.size === 0;
}

// Função para selecionar/desselecionar todas as VMs
function toggleSelectAllVMs(checkbox) {
  const isChecked = checkbox.checked;

  document.querySelectorAll(".vm-checkbox").forEach((cb) => {
    cb.checked = isChecked;
    const vmName = cb.getAttribute("data-vm-name");
    if (isChecked) {
      selectedVMs.add(vmName);
    } else {
      selectedVMs.delete(vmName);
    }
  });

  updateVMStats();

  const backupBtn = document.getElementById("backup-selected-vms-btn");
  backupBtn.disabled = selectedVMs.size === 0;
}

// Função para atualizar estatísticas de VMs
function updateVMStats() {
  const totalVMs = allVMs.length;
  const selectedCount = selectedVMs.size;

  // Calcular tamanho total das VMs selecionadas
  let totalSize = 0;
  allVMs.forEach((vm) => {
    if (selectedVMs.has(vm.name)) {
      totalSize += vm.total_size;
    }
  });

  document.getElementById("vm-stats-total").textContent = totalVMs;
  document.getElementById("vm-stats-selected").textContent = selectedCount;
  document.getElementById("vm-stats-size").textContent = formatSize(totalSize);
}

// Função para fazer backup de VMs selecionadas
async function backupSelectedVMs() {
  if (selectedVMs.size === 0) {
    showAlert("warning", "Selecione pelo menos uma VM para fazer backup.");
    return;
  }

  const confirmMsg = `Fazer backup de ${
    selectedVMs.size
  } VM(s) selecionada(s)?\n\nDestino: ${vmBackupConfig.destDir}\nRetenção: ${
    vmBackupConfig.retentionDays
  } dias\nChecksum: ${vmBackupConfig.verifyChecksum ? "Sim" : "Não"}`;

  if (!confirm(confirmMsg)) {
    return;
  }

  const backupBtn = document.getElementById("backup-selected-vms-btn");
  backupBtn.disabled = true;
  backupBtn.innerHTML =
    '<span class="loading-spinner"></span> Fazendo backup...';

  try {
    clearVMLog();
    addVMLog("========================================");
    addVMLog("🚀 INICIANDO BACKUP DE VMs");
    addVMLog("========================================");
    addVMLog(`VMs selecionadas: ${selectedVMs.size}`);
    addVMLog(`Destino: ${vmBackupConfig.destDir}`);
    addVMLog(`Retenção: ${vmBackupConfig.retentionDays} dias`);
    addVMLog(
      `Verificar checksum: ${vmBackupConfig.verifyChecksum ? "Sim" : "Não"}`
    );
    addVMLog("========================================");
    addVMLog("");

    const selectedVMsList = Array.from(selectedVMs).join(",");
    const scriptPath = `${VM_SCRIPTS_DIR}/backup-all-vms.sh`;

    // Executar script de backup
    const proc = cockpit.spawn(
      [
        "bash",
        scriptPath,
        selectedVMsList,
        vmBackupConfig.destDir,
        vmBackupConfig.retentionDays.toString(),
        vmBackupConfig.verifyChecksum.toString(),
      ],
      {
        err: "out",
        superuser: "try",
      }
    );

    // Capturar saída em tempo real
    proc.stream((data) => {
      const lines = data.split("\n");
      lines.forEach((line) => {
        if (line.trim()) {
          addVMLog(line);
        }
      });
    });

    const result = await proc;

    console.log("VM Backup: Resultado:", result);

    // Parsear resultado JSON (última linha)
    const lines = result.trim().split("\n");
    const jsonLine = lines[lines.length - 1];

    try {
      const summary = JSON.parse(jsonLine);

      addVMLog("");
      addVMLog("========================================");
      addVMLog("✅ BACKUP CONCLUÍDO");
      addVMLog("========================================");
      addVMLog(`Total de VMs: ${summary.summary.total_vms}`);
      addVMLog(`Sucesso: ${summary.summary.success_count}`);
      addVMLog(`Falhas: ${summary.summary.failed_count}`);
      addVMLog(`Tamanho total: ${formatSize(summary.summary.total_size)}`);
      addVMLog(`Tempo total: ${summary.summary.total_duration}s`);
      addVMLog(`Arquivos antigos removidos: ${summary.summary.deleted_count}`);
      addVMLog("========================================");

      if (summary.summary.failed_count === 0) {
        showAlert(
          "success",
          `✅ Backup de ${summary.summary.success_count} VM(s) concluído com sucesso!`
        );
      } else {
        showAlert(
          "warning",
          `⚠️ Backup concluído com ${summary.summary.failed_count} falha(s). Verifique o log.`
        );
      }
    } catch (e) {
      console.warn("VM Backup: Não foi possível parsear JSON do resultado:", e);
      addVMLog("");
      addVMLog("✅ Backup concluído");
      showAlert("success", "✅ Backup de VMs concluído!");
    }
  } catch (error) {
    console.error("VM Backup: Erro durante backup:", error);
    const errorMsg = error?.message || error?.toString() || "Erro desconhecido";
    addVMLog("");
    addVMLog("========================================");
    addVMLog("❌ ERRO NO BACKUP");
    addVMLog("========================================");
    addVMLog(errorMsg);
    showAlert("danger", `Erro ao fazer backup: ${errorMsg}`);
  } finally {
    backupBtn.disabled = false;
    backupBtn.innerHTML = "📦 Fazer Backup das VMs Selecionadas";
  }
}

// Função para limpar backups antigos de VMs
async function cleanOldVMBackups() {
  const days = prompt(
    `Remover backups de VMs com mais de quantos dias?\n\nDiretório: ${vmBackupConfig.destDir}`,
    vmBackupConfig.retentionDays.toString()
  );

  if (!days || isNaN(days) || parseInt(days) < 0) {
    return;
  }

  const confirmMsg = `Tem certeza que deseja remover backups de VMs com mais de ${days} dias?\n\nDiretório: ${vmBackupConfig.destDir}`;

  if (!confirm(confirmMsg)) {
    return;
  }

  try {
    addVMLog("🗑️ Procurando backups antigos...");

    const result = await cockpit.spawn(
      [
        "bash",
        "-c",
        `find "${vmBackupConfig.destDir}" -type f -mtime +${days} -exec du -b {} + | awk '{sum+=$1} END {print sum}'; find "${vmBackupConfig.destDir}" -type f -mtime +${days} | wc -l`,
      ],
      {
        err: "message",
        superuser: "try",
      }
    );

    const [totalSize, fileCount] = result.trim().split("\n");
    const deletedSize = parseInt(totalSize) || 0;
    const deletedCount = parseInt(fileCount) || 0;

    if (deletedCount === 0) {
      addVMLog(`ℹ️ Nenhum backup encontrado com mais de ${days} dias`);
      showAlert("info", `Não há backups de VMs com mais de ${days} dias.`);
      return;
    }

    // Remover arquivos
    await cockpit.spawn(
      [
        "bash",
        "-c",
        `find "${vmBackupConfig.destDir}" -type f -mtime +${days} -delete`,
      ],
      {
        err: "message",
        superuser: "try",
      }
    );

    addVMLog(
      `✅ ${deletedCount} arquivo(s) removido(s) (${formatSize(deletedSize)})`
    );
    showAlert("success", `✅ ${deletedCount} backup(s) antigo(s) removido(s)`);
  } catch (error) {
    const errorMsg = error?.message || error?.toString() || "Erro desconhecido";
    addVMLog(`❌ Erro: ${errorMsg}`);
    showAlert("danger", `Erro ao limpar backups: ${errorMsg}`);
  }
}

// Função para atualizar configuração de VM backup
function updateVMBackupConfig() {
  vmBackupConfig.destDir = document.getElementById("vm-dest-dir").value.trim();
  vmBackupConfig.retentionDays = parseInt(
    document.getElementById("vm-retention-days").value
  );
  vmBackupConfig.verifyChecksum =
    document.getElementById("vm-verify-checksum").checked;

  console.log("VM Backup: Configuração atualizada:", vmBackupConfig);

  // Salvar configuração
  saveConfiguration();
}

// Função para atualizar formulário de configuração de VMs
function updateVMConfigForm() {
  const destDirInput = document.getElementById("vm-dest-dir");
  const retentionInput = document.getElementById("vm-retention-days");
  const checksumInput = document.getElementById("vm-verify-checksum");

  if (destDirInput) destDirInput.value = vmBackupConfig.destDir;
  if (retentionInput) retentionInput.value = vmBackupConfig.retentionDays;
  if (checksumInput) checksumInput.checked = vmBackupConfig.verifyChecksum;
}

// ============================================================================
// AUTOMAÇÃO / SCRIPTS
// ============================================================================

// Funções auxiliares para automação
function automationShowLoading(show) {
  const el = document.getElementById("automation-loading");
  if (el) el.style.display = show ? "block" : "none";
}

function automationShowError(message) {
  console.error("Automation Error:", message);
  const errorDiv = document.getElementById("automation-error-message");
  const errorText = document.getElementById("automation-error-text");
  if (errorText) errorText.textContent = message;
  if (errorDiv) {
    errorDiv.style.display = "block";
    setTimeout(() => {
      errorDiv.style.display = "none";
    }, 15000);
  }
  showAlert("danger", `❌ ${message}`);
}

function automationFormatDate(timestamp) {
  if (!timestamp || timestamp === "-") return "-";
  const date = new Date(timestamp * 1000);
  return date.toLocaleString("pt-BR");
}

function automationGetNextCronExecution(cronExpression) {
  if (!cronExpression || cronExpression === "-") return "-";
  return "Agendado: " + cronExpression;
}

function automationEscapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function automationMakeSafeId(value) {
  return String(value || "")
    .replaceAll(/[^a-zA-Z0-9_-]/g, "_")
    .replaceAll(/_+/g, "_")
    .replaceAll(/^_+|_+$/g, "");
}

function automationFormatCockpitError(error) {
  if (error == null) return "(sem detalhes)";
  if (typeof error === "string") return error;
  if (error instanceof Error && error.message) return error.message;

  const parts = [];
  if (typeof error.message === "string" && error.message.trim()) {
    parts.push(error.message.trim());
  }
  if (typeof error.problem === "string" && error.problem.trim()) {
    parts.push(`problem=${error.problem.trim()}`);
  }
  if (typeof error.exit_status !== "undefined") {
    parts.push(`exit_status=${String(error.exit_status)}`);
  }
  if (parts.length > 0) return parts.join(" | ");

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

// Atualizar cards de estatísticas
function automationUpdateStatCards(scripts) {
  console.log(
    "Automation: Atualizando cards de estatísticas com",
    scripts.length,
    "scripts"
  );

  const totalEl = document.getElementById("automation-stat-total-scripts");
  const scheduledEl = document.getElementById("automation-stat-scheduled");
  const runningEl = document.getElementById("automation-stat-running");
  const failuresEl = document.getElementById("automation-stat-failures");

  if (!totalEl || !scheduledEl || !runningEl || !failuresEl) {
    console.warn("Automation: Elementos de estatísticas não encontrados");
    return;
  }

  const total = scripts.length;
  const scheduled = scripts.filter(
    (s) => s.cron_expression && s.cron_expression !== ""
  ).length;
  const running = 0; // TODO: Implementar detecção de scripts em execução
  const failures = scripts.filter((s) => {
    const failureRate =
      s.total_executions > 0
        ? (s.total_executions - s.successful_executions) / s.total_executions
        : 0;
    return failureRate > 0.1; // Scripts com mais de 10% de falha
  }).length;

  totalEl.textContent = total;
  scheduledEl.textContent = scheduled;
  runningEl.textContent = running;
  failuresEl.textContent = failures;

  console.log("Automation: Stats -", { total, scheduled, running, failures });
}

// Aplicar filtros e ordenação
function automationApplyFilters() {
  console.log("Automation: Aplicando filtros");

  const searchValue =
    document.getElementById("automation-filter-search")?.value.toLowerCase() ||
    "";
  const sortValue =
    document.getElementById("automation-filter-sort")?.value || "name-asc";
  const statusValue =
    document.getElementById("automation-filter-status")?.value || "all";

  let filtered = [...allScripts];

  // Aplicar busca
  if (searchValue) {
    filtered = filtered.filter((script) =>
      script.name.toLowerCase().includes(searchValue)
    );
  }

  // Aplicar filtro de status
  if (statusValue !== "all") {
    switch (statusValue) {
      case "scheduled":
        filtered = filtered.filter(
          (s) => s.cron_expression && s.cron_expression !== ""
        );
        break;
      case "not-scheduled":
        filtered = filtered.filter(
          (s) => !s.cron_expression || s.cron_expression === ""
        );
        break;
      case "running":
        filtered = []; // TODO: Implementar
        break;
      case "failed":
        filtered = filtered.filter((s) => {
          const failureRate =
            s.total_executions > 0
              ? (s.total_executions - s.successful_executions) /
                s.total_executions
              : 0;
          return failureRate > 0.1;
        });
        break;
    }
  }

  // Aplicar ordenação
  switch (sortValue) {
    case "name-asc":
      filtered.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case "name-desc":
      filtered.sort((a, b) => b.name.localeCompare(a.name));
      break;
    case "created-desc":
      filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      break;
    case "created-asc":
      filtered.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      break;
    case "executions-desc":
      filtered.sort((a, b) => b.total_executions - a.total_executions);
      break;
    case "next-asc":
      filtered.sort((a, b) => {
        const aHasCron = a.cron_expression && a.cron_expression !== "";
        const bHasCron = b.cron_expression && b.cron_expression !== "";
        if (!aHasCron && !bHasCron) return 0;
        if (!aHasCron) return 1;
        if (!bHasCron) return -1;
        return a.cron_expression.localeCompare(b.cron_expression);
      });
      break;
  }

  automationRenderScripts(filtered);
}

// ============================================================================
// GERENCIAMENTO DE DIRETÓRIOS DE SCRIPTS
// ============================================================================

// Renderizar lista de diretórios de scripts
function automationRenderScriptDirectoriesList() {
  const container = document.getElementById(
    "automation-script-directories-list"
  );

  if (!container) {
    console.error(
      "Automation: Elemento automation-script-directories-list não encontrado"
    );
    return;
  }

  if (scriptDirectories.length === 0) {
    container.innerHTML = `
      <div class="pf-c-empty-state pf-m-sm">
        <div class="pf-c-empty-state__content">
          <i class="fas fa-folder-open pf-c-empty-state__icon" style="font-size: 3rem; margin-bottom: 1rem;"></i>
          <h2 class="pf-c-title pf-m-lg">Nenhum diretório configurado</h2>
          <div class="pf-c-empty-state__body">
            Adicione diretórios onde seus scripts estão localizados.
          </div>
        </div>
      </div>
    `;
    return;
  }

  const html = `
    <table class="pf-c-table pf-m-grid-md" role="grid">
      <thead>
        <tr role="row">
          <th role="columnheader">Caminho</th>
          <th role="columnheader">Rótulo</th>
          <th role="columnheader">Recursivo</th>
          <th role="columnheader" style="width: 100px;">Ações</th>
        </tr>
      </thead>
      <tbody role="rowgroup">
        ${scriptDirectories
          .map(
            (dir, index) => `
          <tr role="row">
            <td role="cell"><code>${escapeHtml(dir.path)}</code></td>
            <td role="cell">${escapeHtml(dir.label || "-")}</td>
            <td role="cell">
              <span class="pf-c-badge ${dir.maxDepth !== 1 ? "pf-m-read" : ""}">
                ${dir.maxDepth !== 1 ? "✅ Sim" : "❌ Não"}
              </span>
            </td>
            <td role="cell">
              <button class="pf-c-button pf-m-danger pf-m-small"
                      onclick="automationRemoveScriptDirectory(${index})">
                🗑️ Remover
              </button>
            </td>
          </tr>
        `
          )
          .join("")}
      </tbody>
    </table>
  `;

  container.innerHTML = html;
  console.log(
    "Automation: Lista de diretórios renderizada -",
    scriptDirectories.length,
    "diretório(s)"
  );
}

// Adicionar diretório de script
async function automationAddScriptDirectory() {
  console.log("Automation: Abrindo prompt para adicionar diretório");

  // Obter caminho do diretório
  const path = prompt(
    "Digite o caminho do diretório onde estão seus scripts:\n\n(ex: /home/user/scripts, /opt/scripts, ~/meus-scripts, etc.)"
  );

  if (!path || path.trim() === "") {
    console.log("Automation: Operação cancelada pelo usuário");
    return;
  }

  const trimmedPath = path.trim();

  // Verificar se o diretório já existe na lista
  const exists = scriptDirectories.some((d) => d.path === trimmedPath);
  if (exists) {
    showAlert("warning", "⚠️ Este diretório já está configurado!");
    return;
  }

  // Obter rótulo
  const defaultLabel =
    trimmedPath
      .split("/")
      .filter((x) => x)
      .pop() || trimmedPath;
  const label = prompt(
    "Digite um rótulo para identificar este diretório (opcional):",
    defaultLabel
  );

  // Perguntar sobre recursividade
  const recursive = confirm(
    "Deseja buscar scripts em subdiretórios também?\n\n• OK = Sim (busca recursiva)\n• Cancelar = Não (somente o diretório principal)"
  );

  // Adicionar à lista
  scriptDirectories.push({
    path: trimmedPath,
    label: label && label.trim() !== "" ? label.trim() : defaultLabel,
    maxDepth: recursive ? 10 : 1,
  });

  console.log("Automation: Diretório adicionado:", {
    path: trimmedPath,
    label,
    maxDepth: recursive ? 10 : 1,
  });

  // Salvar configuração
  try {
    await saveConfiguration();
    automationRenderScriptDirectoriesList();
    showAlert("success", "✅ Diretório adicionado! Recarregando scripts...");

    // Auto-recarregar scripts
    await automationLoadScripts();
  } catch (error) {
    console.error("Automation: Erro ao salvar configuração:", error);
    showAlert("danger", "❌ Erro ao salvar: " + (error.message || error));
    // Remover o diretório que foi adicionado
    scriptDirectories.pop();
  }
}

// Remover diretório de script
async function automationRemoveScriptDirectory(index) {
  if (index < 0 || index >= scriptDirectories.length) {
    console.error("Automation: Índice inválido:", index);
    return;
  }

  const dir = scriptDirectories[index];

  if (
    !confirm(
      `Remover diretório "${dir.path}" (${dir.label})?\n\nOs scripts deste diretório não serão mais listados.`
    )
  ) {
    console.log("Automation: Remoção cancelada pelo usuário");
    return;
  }

  console.log("Automation: Removendo diretório:", dir);

  scriptDirectories.splice(index, 1);

  try {
    await saveConfiguration();
    automationRenderScriptDirectoriesList();
    showAlert("success", "✅ Diretório removido! Recarregando scripts...");

    // Auto-recarregar scripts
    await automationLoadScripts();
  } catch (error) {
    console.error("Automation: Erro ao salvar configuração:", error);
    showAlert("danger", "❌ Erro ao salvar: " + (error.message || error));
    // Re-adicionar o diretório que foi removido
    scriptDirectories.splice(index, 0, dir);
    automationRenderScriptDirectoriesList();
  }
}

// ============================================================================
// CARREGAMENTO DE SCRIPTS
// ============================================================================

// Carregar lista de scripts
async function automationLoadScripts() {
  console.log("Automation: Carregando scripts dos diretórios configurados...");
  automationShowLoading(true);

  allScripts = [];

  if (scriptDirectories.length === 0) {
    console.log("Automation: Nenhum diretório configurado");
    automationShowLoading(false);
    automationRenderScripts([]);
    automationUpdateStatCards([]);
    showAlert(
      "warning",
      "⚠️ Configure pelo menos um diretório de scripts primeiro.",
      5000
    );
    return;
  }

  try {
    for (const dir of scriptDirectories) {
      console.log(
        `Automation: Buscando scripts em: ${dir.path} (maxDepth: ${dir.maxDepth})`
      );

      // Construir comando find
      const findCmd =
        dir.maxDepth === 1
          ? ["find", dir.path, "-maxdepth", "1", "-type", "f", "-name", "*.sh"]
          : [
              "find",
              dir.path,
              "-maxdepth",
              String(dir.maxDepth),
              "-type",
              "f",
              "-name",
              "*.sh",
            ];

      try {
        const result = await cockpit.spawn(findCmd, {
          err: "ignore",
          superuser: "try",
        });

        const files = result
          .trim()
          .split("\n")
          .filter((f) => f);
        console.log(
          `Automation: ${files.length} script(s) encontrado(s) em ${dir.path}`
        );

        for (const filePath of files) {
          // Obter informações do arquivo
          try {
            const stat = await cockpit.spawn(
              ["stat", "-c", "%s %Y %a", filePath],
              { err: "ignore", superuser: "try" }
            );

            const [size, mtime, permissions] = stat.trim().split(" ");
            const fileName = filePath.split("/").pop();

            // Verificar se já existe (evitar duplicatas)
            const exists = allScripts.some((s) => s.path === filePath);
            if (exists) {
              console.log(`Automation: Script duplicado ignorado: ${filePath}`);
              continue;
            }

            allScripts.push({
              name: fileName,
              path: filePath, // Caminho completo original
              directory: dir.label || dir.path,
              size: parseInt(size) || 0,
              lastModified: new Date(parseInt(mtime) * 1000).toISOString(),
              last_execution: null,
              created_at: new Date(parseInt(mtime) * 1000).toISOString(),
              updated_at: new Date(parseInt(mtime) * 1000).toISOString(),
              permissions: permissions,
              total_executions: 0,
              successful_executions: 0,
              cron_expression: "",
              scheduled: false,
              nextRun: null,
            });
          } catch (error) {
            console.warn(
              `Automation: Erro ao obter info de ${filePath}:`,
              error
            );
          }
        }
      } catch (error) {
        console.warn(`Automation: Erro ao buscar em ${dir.path}:`, error);
        showAlert(
          "warning",
          `⚠️ Erro ao buscar em ${dir.path}: ${error.message || error}`,
          5000
        );
      }
    }

    console.log(
      `Automation: Total de ${allScripts.length} script(s) carregados`
    );
    automationShowLoading(false);
    automationRenderScripts(allScripts);
    automationUpdateStatCards(allScripts);

    if (allScripts.length === 0) {
      showAlert(
        "info",
        "ℹ️ Nenhum script (.sh) encontrado nos diretórios configurados.",
        5000
      );
    } else {
      showAlert(
        "success",
        `✅ ${allScripts.length} script(s) carregado(s) com sucesso!`,
        3000
      );
    }
  } catch (error) {
    console.error("Automation: Erro ao carregar scripts:", error);
    automationShowLoading(false);
    automationShowError(
      "Erro ao carregar scripts: " + automationFormatCockpitError(error)
    );
  }
}

// Carregar lista de scripts (FUNÇÃO ANTIGA - MANTER PARA COMPATIBILIDADE)
function automationLoadScripts_OLD() {
  console.log("Automation: Carregando scripts...");
  automationShowLoading(true);

  cockpit
    .spawn(["/usr/share/cockpit/scheduling_exec/scripts/list-scripts.sh"], {
      err: "message",
    })
    .then((output) => {
      automationShowLoading(false);
      console.log("Automation: Scripts carregados com sucesso");

      const scripts = JSON.parse(output);
      allScripts = scripts;
      automationUpdateStatCards(scripts);
      automationApplyFilters();
    })
    .catch((error) => {
      automationShowLoading(false);
      console.error("Automation: Erro ao carregar scripts:", error);
      automationShowError(
        "Erro ao carregar scripts: " + automationFormatCockpitError(error)
      );
    });
}

// Renderizar tabela de scripts
function automationRenderScripts(scripts) {
  console.log("Automation: Renderizando", scripts.length, "scripts");

  const tbody = document.getElementById("automation-scripts-body");
  const emptyState = document.getElementById("automation-empty-state");

  if (!tbody) {
    console.error(
      "Automation: Elemento automation-scripts-body não encontrado"
    );
    return;
  }

  tbody.innerHTML = "";

  if (scripts.length === 0) {
    if (emptyState) emptyState.style.display = "block";
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 2rem;">
          <div class="pf-c-empty-state pf-m-sm">
            <div class="pf-c-empty-state__content">
              <h2 class="pf-c-title pf-m-lg">Nenhum script encontrado</h2>
              <div class="pf-c-empty-state__body">
                ${
                  scriptDirectories.length === 0
                    ? "Configure diretórios de scripts primeiro!"
                    : "Nenhum arquivo .sh encontrado nos diretórios configurados."
                }
              </div>
            </div>
          </div>
        </td>
      </tr>`;
    return;
  }

  if (emptyState) emptyState.style.display = "none";

  scripts.forEach((script) => {
    const row = document.createElement("tr");
    row.setAttribute("role", "row");

    const scriptName = script.name;
    const safeId = automationMakeSafeId(scriptName) || "script";
    const menuId = `automation-row-actions-${safeId}`;
    const scriptPath = script.path || `~/scripts/${scriptName}`;

    const successRate =
      script.total_executions > 0
        ? (
            (script.successful_executions / script.total_executions) *
            100
          ).toFixed(1)
        : "-";

    row.innerHTML = `
      <td role="cell" data-label="Nome do Script">
        <strong>${automationEscapeHtml(scriptName)}</strong>
        <div><small><code title="${automationEscapeHtml(
          scriptPath
        )}">${automationEscapeHtml(scriptPath)}</code></small></div>
      </td>
      <td role="cell" data-label="Diretório">
        <span class="pf-c-badge pf-m-read">${automationEscapeHtml(
          script.directory || "-"
        )}</span>
      </td>
      <td role="cell" data-label="Próxima Execução">
        ${automationGetNextCronExecution(script.cron_expression)}
      </td>
      <td role="cell" data-label="Última Execução">
        ${automationFormatDate(script.last_execution)}
      </td>
      <td role="cell" data-label="Execuções" class="pf-m-center">
        <span class="pf-c-badge pf-m-read">${script.total_executions}</span>
      </td>
      <td role="cell" data-label="Sucessos" class="pf-m-center">
        <span class="pf-c-badge pf-m-read pf-m-success">${
          script.successful_executions
        }</span>
        ${
          script.total_executions > 0
            ? `<small style="display: block; margin-top: 4px;">${successRate}%</small>`
            : ""
        }
      </td>
      <td role="cell" data-label="Ações" class="pf-m-center">
        <div style="display: flex; justify-content: center;">
          <div class="pf-c-dropdown js-row-actions">
            <button class="pf-c-dropdown__toggle pf-m-plain js-row-actions-toggle" type="button" onclick="automationToggleRowActionsMenu('${automationEscapeHtml(
              menuId
            )}')" style="padding: 0.5rem; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 4px; cursor: pointer;">
              ⋮
            </button>
            <ul class="pf-c-dropdown__menu js-row-actions-menu" id="${automationEscapeHtml(
              menuId
            )}" hidden style="position: fixed; z-index: 9999; background: white; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); min-width: 12rem;">
              <li><button class="pf-c-dropdown__menu-item" onclick="automationCloseAllRowActionsMenus(); automationExecuteScript('${automationEscapeHtml(
                scriptName
              )}');">▶️ Executar</button></li>
              <li><button class="pf-c-dropdown__menu-item" onclick="automationCloseAllRowActionsMenus(); automationOpenSudoModal('${automationEscapeHtml(
                scriptName
              )}');">🔐 Executar (admin)</button></li>
              <li><button class="pf-c-dropdown__menu-item" onclick="automationCloseAllRowActionsMenus(); automationOpenScriptEnvModal('${automationEscapeHtml(
                scriptName
              )}');">🔧 Variáveis (script)</button></li>
              <li><button class="pf-c-dropdown__menu-item" onclick="automationCloseAllRowActionsMenus(); automationOpenLogModal('${automationEscapeHtml(
                scriptName
              )}');">📋 Logs</button></li>
              <li><button class="pf-c-dropdown__menu-item" onclick="automationCloseAllRowActionsMenus(); automationEditScript('${automationEscapeHtml(
                scriptName
              )}');">✏️ Editar</button></li>
              <li><button class="pf-c-dropdown__menu-item" onclick="automationCloseAllRowActionsMenus(); automationOpenCronModal('${automationEscapeHtml(
                scriptName
              )}');">⏰ Agendar</button></li>
              <li><button class="pf-c-dropdown__menu-item" onclick="automationCloseAllRowActionsMenus(); automationDeleteScript('${automationEscapeHtml(
                scriptName
              )}');" style="color: #c9190b;">🗑️ Excluir</button></li>
            </ul>
          </div>
        </div>
      </td>
    `;

    tbody.appendChild(row);
  });

  console.log("Automation: Scripts renderizados");
}

// Controle de menu de ações
function automationCloseAllRowActionsMenus() {
  document.querySelectorAll(".js-row-actions-menu").forEach((menu) => {
    menu.hidden = true;
  });
  automationOpenRowActionsMenuId = null;
}

function automationToggleRowActionsMenu(menuId) {
  const menu = document.getElementById(menuId);
  if (!menu) return;

  if (
    automationOpenRowActionsMenuId &&
    automationOpenRowActionsMenuId !== menuId
  ) {
    automationCloseAllRowActionsMenus();
  }

  const willOpen = menu.hidden === true;
  automationCloseAllRowActionsMenus();

  if (willOpen) {
    const toggle = document.querySelector(`[onclick*="'${menuId}'"]`);
    if (toggle) {
      const rect = toggle.getBoundingClientRect();
      menu.style.position = "fixed";
      menu.style.top = `${rect.bottom + 8}px`;
      menu.style.left = `${rect.right - 192}px`;
      menu.hidden = false;
      automationOpenRowActionsMenuId = menuId;
    }
  }
}

// Modais - Criar/Editar Script
function automationOpenCreateModal() {
  console.log("Automation: Abrindo modal de criação");
  automationCurrentEditingScript = null;
  document.getElementById("automation-modal-title").textContent = "Novo Script";
  document.getElementById("automation-script-name").value = "";
  document.getElementById("automation-script-name").disabled = false;
  document.getElementById("automation-script-content").value =
    '#!/bin/bash\n\n# Seu script aqui\necho "Executando script..."\n';
  document.getElementById("automation-script-path").value =
    "~/scripts/<script>.sh";
  document.getElementById("automation-scriptModal").style.display = "block";
}

function automationCloseScriptModal() {
  document.getElementById("automation-scriptModal").style.display = "none";
  automationCurrentEditingScript = null;
}

function automationSaveScript() {
  console.log("Automation: Salvando script");
  const scriptName = document
    .getElementById("automation-script-name")
    .value.trim();
  const scriptContent = document.getElementById(
    "automation-script-content"
  ).value;
  const scriptPathInput = document
    .getElementById("automation-script-path")
    .value.trim();

  if (!scriptName.endsWith(".sh")) {
    automationShowError("O nome do script deve terminar com .sh");
    return;
  }

  automationShowLoading(true);
  automationCloseScriptModal();

  let scriptPath;

  // Se estiver editando, usar o caminho existente
  if (automationCurrentEditingScript) {
    const script = allScripts.find(
      (s) => s.name === automationCurrentEditingScript
    );
    if (script) {
      scriptPath = script.path;
      console.log("Automation: Atualizando script existente:", scriptPath);
    } else {
      automationShowLoading(false);
      automationShowError("Script não encontrado para edição.");
      return;
    }
  } else {
    // Se for novo, perguntar onde salvar
    const defaultDir =
      scriptDirectories.length > 0 ? scriptDirectories[0].path : "~/scripts";
    const dir = prompt(
      "Digite o diretório onde deseja salvar o script:",
      defaultDir
    );

    if (!dir || dir.trim() === "") {
      automationShowLoading(false);
      showAlert("warning", "⚠️ Operação cancelada");
      return;
    }

    scriptPath = `${dir.trim()}/${scriptName}`;
    console.log("Automation: Criando novo script:", scriptPath);
  }

  // Salvar o script usando tee
  const proc = cockpit.spawn(["tee", scriptPath], {
    err: "message",
    superuser: "try",
  });

  proc.input(scriptContent);

  proc
    .then(() => {
      console.log("Automation: Conteúdo salvo, ajustando permissões...");

      // Tornar executável
      return cockpit.spawn(["chmod", "+x", scriptPath], {
        err: "message",
        superuser: "try",
      });
    })
    .then(() => {
      automationShowLoading(false);
      console.log("Automation: Script salvo com sucesso");
      showAlert(
        "success",
        `✅ Script ${scriptName} salvo com sucesso em ${scriptPath}!`
      );
      automationLoadScripts();
    })
    .catch((error) => {
      automationShowLoading(false);
      console.error("Automation: Erro ao salvar script:", error);
      automationShowError(
        "Erro ao salvar script: " + automationFormatCockpitError(error)
      );
    });
}

// Editar script
function automationEditScript(scriptName) {
  console.log("Automation: Editando script:", scriptName);

  // Buscar o script no array para obter o caminho completo
  const script = allScripts.find((s) => s.name === scriptName);
  if (!script) {
    console.error("Automation: Script não encontrado:", scriptName);
    automationShowError(
      `Script "${scriptName}" não encontrado na lista de scripts carregados.`
    );
    return;
  }

  const scriptPath = script.path;
  console.log("Automation: Caminho do script:", scriptPath);

  automationShowLoading(true);
  automationCurrentEditingScript = scriptName;

  // Ler o conteúdo do script diretamente
  cockpit
    .spawn(["cat", scriptPath], {
      err: "message",
      superuser: "try",
    })
    .then((content) => {
      automationShowLoading(false);
      document.getElementById("automation-modal-title").textContent =
        "Editar Script: " + scriptName;
      document.getElementById("automation-script-name").value = scriptName;
      document.getElementById("automation-script-name").disabled = true;
      document.getElementById("automation-script-content").value = content;
      document.getElementById("automation-script-path").value = scriptPath;
      document.getElementById("automation-scriptModal").style.display = "block";
    })
    .catch((error) => {
      automationShowLoading(false);
      console.error("Automation: Erro ao carregar script:", error);
      automationShowError(
        "Erro ao carregar script: " + automationFormatCockpitError(error)
      );
    });
}

// Excluir script
function automationDeleteScript(scriptName) {
  // Buscar o script no array para obter o caminho completo
  const script = allScripts.find((s) => s.name === scriptName);
  if (!script) {
    console.error("Automation: Script não encontrado:", scriptName);
    automationShowError(
      `Script "${scriptName}" não encontrado na lista de scripts carregados.`
    );
    return;
  }

  const scriptPath = script.path;

  if (
    !confirm(
      `Tem certeza que deseja excluir o script "${scriptName}"?\n\nCaminho: ${scriptPath}\n\nEsta ação não pode ser desfeita.`
    )
  ) {
    return;
  }

  console.log("Automation: Excluindo script:", scriptPath);
  automationShowLoading(true);

  // Excluir o arquivo diretamente
  cockpit
    .spawn(["rm", "-f", scriptPath], {
      err: "message",
      superuser: "try",
    })
    .then(() => {
      automationShowLoading(false);
      console.log("Automation: Script excluído com sucesso");
      showAlert("success", `✅ Script ${scriptName} excluído com sucesso!`);
      automationLoadScripts();
    })
    .catch((error) => {
      automationShowLoading(false);
      console.error("Automation: Erro ao excluir script:", error);
      automationShowError(
        "Erro ao excluir script: " + automationFormatCockpitError(error)
      );
    });
}

// Executar script
function automationExecuteScript(scriptName, sudoPassword = null) {
  console.log(
    "Automation: Executando script:",
    scriptName,
    sudoPassword ? "(com sudo)" : ""
  );

  // Buscar o script no array para obter o caminho completo
  const script = allScripts.find((s) => s.name === scriptName);
  if (!script) {
    console.error("Automation: Script não encontrado:", scriptName);
    automationShowError(
      `Script "${scriptName}" não encontrado na lista de scripts carregados.`
    );
    return;
  }

  const scriptPath = script.path;
  console.log("Automation: Caminho do script:", scriptPath);

  if (
    !sudoPassword &&
    !confirm(`Executar o script "${scriptName}"?\n\nCaminho: ${scriptPath}`)
  ) {
    return;
  }

  automationShowLoading(true);

  // Executar diretamente o script usando bash
  const args = sudoPassword
    ? ["bash", scriptPath] // Para sudo, executar com bash
    : ["bash", scriptPath];

  let proc = cockpit.spawn(args, {
    err: "message",
    superuser: sudoPassword ? "require" : "try",
  });

  if (sudoPassword) {
    proc = proc.input(sudoPassword + "\n");
  }

  proc
    .then((output) => {
      automationShowLoading(false);
      console.log("Automation: Script executado com sucesso");

      showAlert("success", `✅ Script ${scriptName} executado com sucesso!`);

      // Mostrar saída se houver
      if (output && output.trim()) {
        const title = sudoPassword
          ? `Script executado como admin com sucesso!\n\nCaminho: ${scriptPath}\n\nSaída:`
          : `Script executado com sucesso!\n\nCaminho: ${scriptPath}\n\nSaída:`;
        alert(title + "\n" + output);
      } else {
        alert(
          `${
            sudoPassword ? "Script executado como admin" : "Script executado"
          } com sucesso!\n\nCaminho: ${scriptPath}\n\n(sem saída)`
        );
      }

      // Recarregar para atualizar estatísticas
      automationLoadScripts();
    })
    .catch((error) => {
      automationShowLoading(false);
      console.error("Automation: Erro ao executar script:", error);

      const errorMsg = automationFormatCockpitError(error);
      showAlert("danger", `❌ Script ${scriptName} finalizou com erro`);
      alert(
        `${
          sudoPassword
            ? "Script como admin finalizou com erro"
            : "Script finalizou com erro"
        }.\n\nCaminho: ${scriptPath}\n\nErro:\n${errorMsg}`
      );
    });
}

// Modal Sudo
function automationOpenSudoModal(scriptName) {
  automationCurrentSudoScript = scriptName;
  document.getElementById(
    "automation-sudo-title"
  ).textContent = `Executar como Admin: ${scriptName}`;
  document.getElementById("automation-sudo-password").value = "";
  document.getElementById("automation-sudoModal").style.display = "block";
  setTimeout(
    () => document.getElementById("automation-sudo-password")?.focus(),
    0
  );
}

function automationCloseSudoModal() {
  document.getElementById("automation-sudoModal").style.display = "none";
  automationCurrentSudoScript = null;
  document.getElementById("automation-sudo-password").value = "";
}

function automationExecuteSudo() {
  const password = document.getElementById("automation-sudo-password").value;
  if (!password) {
    automationShowError("Informe a senha do sudo");
    return;
  }
  automationCloseSudoModal();
  automationExecuteScript(automationCurrentSudoScript, password);
}

// Modal Variáveis do Script
function automationOpenScriptEnvModal(scriptName) {
  console.log("Automation: Abrindo modal de variáveis do script:", scriptName);
  automationCurrentScriptEnv = scriptName;
  document.getElementById(
    "automation-script-env-title"
  ).textContent = `Variáveis do script: ${scriptName}`;
  document.getElementById("automation-script-env-content").value = "";
  document.getElementById("automation-scriptEnvModal").style.display = "block";
  automationLoadScriptEnvFile(scriptName);
}

function automationCloseScriptEnvModal() {
  document.getElementById("automation-scriptEnvModal").style.display = "none";
  automationCurrentScriptEnv = null;
}

function automationLoadScriptEnvFile(scriptName) {
  automationShowLoading(true);
  cockpit
    .spawn(
      [
        "/usr/share/cockpit/scheduling_exec/scripts/get-script-env.sh",
        scriptName,
      ],
      { err: "message" }
    )
    .then((content) => {
      automationShowLoading(false);
      document.getElementById("automation-script-env-content").value =
        content || "";
    })
    .catch((error) => {
      automationShowLoading(false);
      automationShowError(
        "Erro ao carregar variáveis do script: " +
          automationFormatCockpitError(error)
      );
    });
}

function automationSaveScriptEnv() {
  const scriptName = automationCurrentScriptEnv;
  const envContent = document.getElementById(
    "automation-script-env-content"
  ).value;

  if (!scriptName) {
    automationShowError("Nenhum script selecionado para variáveis");
    return;
  }

  console.log("Automation: Salvando variáveis do script:", scriptName);
  automationShowLoading(true);
  automationCloseScriptEnvModal();

  cockpit
    .spawn(
      [
        "/usr/share/cockpit/scheduling_exec/scripts/save-script-env.sh",
        scriptName,
      ],
      { err: "message" }
    )
    .input(envContent)
    .then(() => {
      automationShowLoading(false);
      console.log("Automation: Variáveis do script salvas com sucesso");
      showAlert(
        "success",
        `✅ Variáveis do script ${scriptName} salvas com sucesso!`
      );
    })
    .catch((error) => {
      automationShowLoading(false);
      console.error("Automation: Erro ao salvar variáveis:", error);
      automationShowError(
        "Erro ao salvar variáveis do script: " +
          automationFormatCockpitError(error)
      );
    });
}

// Modal Logs
function automationOpenLogModal(scriptName) {
  console.log("Automation: Abrindo modal de logs:", scriptName);
  automationCurrentLogScript = scriptName;
  document.getElementById(
    "automation-log-title"
  ).textContent = `Logs: ${scriptName}`;
  document.getElementById("automation-log-content").value = "";
  document.getElementById("automation-logModal").style.display = "block";
  automationLoadScriptLog(scriptName);
}

function automationCloseLogModal() {
  document.getElementById("automation-logModal").style.display = "none";
  automationCurrentLogScript = null;
}

function automationLoadScriptLog(scriptName) {
  document.getElementById("automation-log-loading").style.display = "block";
  cockpit
    .spawn(
      [
        "/usr/share/cockpit/scheduling_exec/scripts/get-script-log.sh",
        scriptName,
        "400",
      ],
      { err: "message" }
    )
    .then((content) => {
      document.getElementById("automation-log-loading").style.display = "none";
      document.getElementById("automation-log-content").value = content || "";
    })
    .catch((error) => {
      document.getElementById("automation-log-loading").style.display = "none";
      automationShowError(
        "Erro ao carregar logs: " + automationFormatCockpitError(error)
      );
    });
}

// Modal Variáveis Globais
function automationOpenEnvModal() {
  console.log("Automation: Abrindo modal de variáveis globais");
  document.getElementById("automation-envModal").style.display = "block";
  automationLoadEnvFile();
}

function automationCloseEnvModal() {
  document.getElementById("automation-envModal").style.display = "none";
}

function automationLoadEnvFile() {
  automationShowLoading(true);
  cockpit
    .spawn(["/usr/share/cockpit/scheduling_exec/scripts/get-env.sh"], {
      err: "message",
    })
    .then((content) => {
      automationShowLoading(false);
      document.getElementById("automation-env-content").value = content || "";
    })
    .catch((error) => {
      automationShowLoading(false);
      automationShowError(
        "Erro ao carregar .env: " + automationFormatCockpitError(error)
      );
    });
}

function automationSaveEnv() {
  const envContent = document.getElementById("automation-env-content").value;
  console.log("Automation: Salvando variáveis globais");
  automationShowLoading(true);
  automationCloseEnvModal();

  cockpit
    .spawn(["/usr/share/cockpit/scheduling_exec/scripts/save-env.sh"], {
      err: "message",
    })
    .input(envContent)
    .then(() => {
      automationShowLoading(false);
      console.log("Automation: Variáveis globais salvas com sucesso");
      showAlert("success", "✅ Variáveis globais salvas com sucesso!");
    })
    .catch((error) => {
      automationShowLoading(false);
      console.error("Automation: Erro ao salvar .env:", error);
      automationShowError(
        "Erro ao salvar .env: " + automationFormatCockpitError(error)
      );
    });
}

// Modal Importar Scripts
function automationOpenImportModal() {
  console.log("Automation: Abrindo modal de importação");
  document.getElementById("automation-importModal").style.display = "block";
  automationLoadImportCandidates();
}

function automationCloseImportModal() {
  document.getElementById("automation-importModal").style.display = "none";
  automationImportCandidates = [];
}

function automationLoadImportCandidates() {
  document.getElementById("automation-import-loading").style.display = "block";
  document.getElementById("automation-import-empty").style.display = "none";
  document.getElementById("automation-import-table-wrap").style.display =
    "none";

  cockpit
    .spawn(
      ["/usr/share/cockpit/scheduling_exec/scripts/scan-user-scripts.sh"],
      { err: "message" }
    )
    .then((output) => {
      document.getElementById("automation-import-loading").style.display =
        "none";
      const candidates = JSON.parse(output);
      automationImportCandidates = candidates;

      if (!candidates || candidates.length === 0) {
        document.getElementById("automation-import-empty").style.display =
          "block";
        return;
      }

      const tbody = document.getElementById("automation-import-body");
      tbody.innerHTML = "";

      candidates.forEach((c, idx) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td><input type="checkbox" id="automation-import-check-${idx}" /></td>
          <td><strong>${automationEscapeHtml(c.name)}</strong></td>
          <td><code>${automationEscapeHtml(c.path)}</code></td>
        `;
        tbody.appendChild(tr);
      });

      document.getElementById("automation-import-table-wrap").style.display =
        "block";
    })
    .catch((error) => {
      document.getElementById("automation-import-loading").style.display =
        "none";
      automationShowError(
        "Erro ao buscar scripts: " + automationFormatCockpitError(error)
      );
      document.getElementById("automation-import-empty").style.display =
        "block";
    });
}

function automationImportSelectedScripts() {
  const selected = [];
  automationImportCandidates.forEach((c, idx) => {
    const checkbox = document.getElementById(`automation-import-check-${idx}`);
    if (checkbox && checkbox.checked) selected.push(c);
  });

  if (selected.length === 0) {
    automationShowError("Selecione pelo menos um script para importar");
    return;
  }

  console.log("Automation: Importando", selected.length, "scripts");
  document.getElementById("automation-import-loading").style.display = "block";

  let chain = Promise.resolve();
  selected.forEach((c) => {
    chain = chain.then(() =>
      cockpit.spawn(
        [
          "/usr/share/cockpit/scheduling_exec/scripts/import-user-script.sh",
          c.path,
        ],
        { err: "message" }
      )
    );
  });

  chain
    .then(() => {
      document.getElementById("automation-import-loading").style.display =
        "none";
      console.log("Automation: Scripts importados com sucesso");
      showAlert(
        "success",
        `✅ ${selected.length} script(s) importado(s) com sucesso!`
      );
      automationCloseImportModal();
      automationLoadScripts();
    })
    .catch((error) => {
      document.getElementById("automation-import-loading").style.display =
        "none";
      console.error("Automation: Erro ao importar scripts:", error);
      automationShowError(
        "Erro ao importar scripts: " + automationFormatCockpitError(error)
      );
    });
}

// Modal Cron
function automationOpenCronModal(scriptName) {
  console.log("Automation: Abrindo modal de agendamento para:", scriptName);
  automationCronModalMode = "script";
  document.getElementById("automation-cron-script-name").value = scriptName;
  document.getElementById("automation-cron-script-select-group").style.display =
    "none";

  // Defaults
  document.getElementById("automation-cron-minute").value = "*";
  document.getElementById("automation-cron-hour").value = "*";
  document.getElementById("automation-cron-day").value = "*";
  document.getElementById("automation-cron-month").value = "*";
  document.getElementById("automation-cron-weekday").value = "*";

  document.getElementById("automation-cronModal").style.display = "block";
  automationLoadCronSchedules(scriptName);
}

function automationOpenCronManagerModal() {
  console.log("Automation: Abrindo modal de gerenciamento de agendamentos");
  automationCronModalMode = "global";
  document.getElementById("automation-cron-script-name").value = "";
  document.getElementById("automation-cron-script-select-group").style.display =
    "block";

  document.getElementById("automation-cron-minute").value = "*";
  document.getElementById("automation-cron-hour").value = "*";
  document.getElementById("automation-cron-day").value = "*";
  document.getElementById("automation-cron-month").value = "*";
  document.getElementById("automation-cron-weekday").value = "*";

  document.getElementById("automation-cronModal").style.display = "block";
  automationLoadCronScriptsSelect();
  automationLoadCronSchedules(null);
}

function automationCloseCronModal() {
  document.getElementById("automation-cronModal").style.display = "none";
  automationCronModalMode = "script";
}

function automationLoadCronScriptsSelect() {
  const select = document.getElementById("automation-cron-script-select");
  if (!select) return Promise.resolve();

  select.innerHTML = '<option value="">-- Selecione um script --</option>';

  return cockpit
    .spawn(["/usr/share/cockpit/scheduling_exec/scripts/list-scripts.sh"], {
      err: "message",
    })
    .then((output) => {
      let scripts = [];
      try {
        scripts = JSON.parse(output || "[]");
      } catch {
        scripts = [];
      }

      scripts.forEach((s) => {
        const opt = document.createElement("option");
        opt.value = s.name;
        opt.textContent = s.name;
        select.appendChild(opt);
      });
    })
    .catch((error) => {
      automationShowError(
        "Erro ao carregar scripts: " + automationFormatCockpitError(error)
      );
    });
}

function automationOnCronScriptSelectChange() {
  const select = document.getElementById("automation-cron-script-select");
  const hidden = document.getElementById("automation-cron-script-name");
  const scriptName = select ? select.value : "";

  if (hidden) hidden.value = scriptName;
  automationLoadCronSchedules(scriptName || null);
}

function automationLoadCronSchedules(scriptName) {
  document.getElementById("automation-cron-existing-empty").style.display =
    "block";
  document.getElementById("automation-cron-existing-table-wrap").style.display =
    "none";

  const args = ["/usr/share/cockpit/scheduling_exec/scripts/list-cron.sh"];
  if (scriptName) args.push(scriptName);

  return cockpit
    .spawn(args, { err: "message" })
    .then((raw) => {
      let items = [];
      try {
        items = JSON.parse(raw || "[]");
      } catch {
        items = [];
      }

      if (!items || items.length === 0) {
        document.getElementById(
          "automation-cron-existing-empty"
        ).style.display = "block";
        document.getElementById(
          "automation-cron-existing-table-wrap"
        ).style.display = "none";
        return items;
      }

      const tbody = document.getElementById("automation-cron-existing-body");
      tbody.innerHTML = "";

      items.forEach((item) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td><strong>${automationEscapeHtml(item.script || "-")}</strong></td>
          <td><code>${automationEscapeHtml(item.expression || "")}</code></td>
          <td><small><code>${automationEscapeHtml(
            item.command || ""
          )}</code></small></td>
        `;
        tbody.appendChild(tr);
      });

      document.getElementById("automation-cron-existing-empty").style.display =
        "none";
      document.getElementById(
        "automation-cron-existing-table-wrap"
      ).style.display = "block";

      // Preencher campos com o primeiro agendamento, se houver
      if (items.length > 0) {
        const expr = String(items[0].expression || "").trim();
        if (expr) {
          const parts = expr.split(" ");
          if (parts.length >= 5) {
            document.getElementById("automation-cron-minute").value = parts[0];
            document.getElementById("automation-cron-hour").value = parts[1];
            document.getElementById("automation-cron-day").value = parts[2];
            document.getElementById("automation-cron-month").value = parts[3];
            document.getElementById("automation-cron-weekday").value = parts[4];
          }
        }
      }

      return items;
    })
    .catch((error) => {
      automationShowError(
        "Erro ao carregar agendamentos: " + automationFormatCockpitError(error)
      );
      return [];
    });
}

function automationApplyCronPreset() {
  const preset = document.getElementById("automation-cron-preset").value;
  if (preset) {
    const parts = preset.split(" ");
    document.getElementById("automation-cron-minute").value = parts[0];
    document.getElementById("automation-cron-hour").value = parts[1];
    document.getElementById("automation-cron-day").value = parts[2];
    document.getElementById("automation-cron-month").value = parts[3];
    document.getElementById("automation-cron-weekday").value = parts[4];
  }
}

function automationSaveCron() {
  const scriptName = document.getElementById(
    "automation-cron-script-name"
  ).value;
  if (!scriptName) {
    automationShowError("Selecione um script para criar o agendamento");
    return;
  }

  const minute = document.getElementById("automation-cron-minute").value;
  const hour = document.getElementById("automation-cron-hour").value;
  const day = document.getElementById("automation-cron-day").value;
  const month = document.getElementById("automation-cron-month").value;
  const weekday = document.getElementById("automation-cron-weekday").value;

  const cronExpression = `${minute} ${hour} ${day} ${month} ${weekday}`;

  console.log(
    "Automation: Salvando agendamento para:",
    scriptName,
    cronExpression
  );
  automationShowLoading(true);
  automationCloseCronModal();

  cockpit
    .spawn(
      [
        "/usr/share/cockpit/scheduling_exec/scripts/set-cron.sh",
        scriptName,
        cronExpression,
      ],
      { err: "message" }
    )
    .then(() => {
      automationShowLoading(false);
      console.log("Automation: Agendamento salvo com sucesso");
      showAlert("success", `✅ Agendamento configurado para ${scriptName}!`);
      automationLoadScripts();
    })
    .catch((error) => {
      automationShowLoading(false);
      console.error("Automation: Erro ao configurar agendamento:", error);
      automationShowError(
        "Erro ao configurar agendamento: " + automationFormatCockpitError(error)
      );
    });
}

function automationRemoveCron() {
  const scriptName = document.getElementById(
    "automation-cron-script-name"
  ).value;
  if (!scriptName) {
    automationShowError("Selecione um script para remover agendamentos");
    return;
  }

  if (!confirm(`Remover TODOS os agendamentos do script "${scriptName}"?`)) {
    return;
  }

  console.log("Automation: Removendo agendamentos de:", scriptName);
  automationShowLoading(true);
  automationCloseCronModal();

  cockpit
    .spawn(
      ["/usr/share/cockpit/scheduling_exec/scripts/remove-cron.sh", scriptName],
      { err: "message" }
    )
    .then(() => {
      automationShowLoading(false);
      console.log("Automation: Agendamentos removidos com sucesso");
      showAlert(
        "success",
        `✅ Agendamentos do script ${scriptName} removidos!`
      );
      automationLoadScripts();
    })
    .catch((error) => {
      automationShowLoading(false);
      console.error("Automation: Erro ao remover agendamento:", error);
      automationShowError(
        "Erro ao remover agendamento: " + automationFormatCockpitError(error)
      );
    });
}

// Função para adicionar linha ao log de VMs
function addVMLog(message) {
  const logContainer = document.getElementById("vm-log-container");
  const timestamp = new Date().toLocaleTimeString("pt-BR");
  const line = `[${timestamp}] ${message}\n`;

  if (logContainer.textContent === "Aguardando ação...") {
    logContainer.textContent = "";
  }

  logContainer.textContent += line;
  logContainer.scrollTop = logContainer.scrollHeight;

  console.log("VM Backup:", message);
}

// Função para limpar log de VMs
function clearVMLog() {
  const logContainer = document.getElementById("vm-log-container");
  logContainer.textContent = "Aguardando ação...";
}

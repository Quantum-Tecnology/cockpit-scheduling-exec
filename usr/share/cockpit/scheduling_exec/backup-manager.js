// ============================================================================
// INÍCIO DO BACKUP-MANAGER.JS
// ============================================================================
console.log("🚀 BACKUP-MANAGER.JS: Carregando...");

// Inicializar conexÃ£o com Cockpit
const cockpit = window.cockpit;

// ============================================================================
// EXPORTAR switchTab IMEDIATAMENTE para evitar erros de onclick no HTML
// ============================================================================
console.log("🔧 BACKUP-MANAGER.JS: Definindo window.switchTab...");
window.switchTab = function (tab) {
  console.log(`Backup Manager: Mudando para aba ${tab}`);

  // Garantir que as abas estejam visÃ­veis
  const tabsContainer = document.getElementById("backup-tabs");
  if (tabsContainer) {
    tabsContainer.style.display = "block";
    tabsContainer.style.visibility = "visible";
    tabsContainer.style.opacity = "1";
  } else {
    console.error(
      "Backup Manager: Elemento #backup-tabs nÃ£o encontrado em switchTab!"
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
    console.error(`Backup Manager: Elemento #tab-${tab} nÃ£o encontrado!`);
  }

  // Atualizar conteÃºdo
  const backupsTab = document.getElementById("backups-tab-content");
  const configTab = document.getElementById("config-tab-content");
  const vmsTab = document.getElementById("vms-tab-content");
  const automationTab = document.getElementById("automation-tab-content");
  const schedulesTab = document.getElementById("schedules-tab-content");

  console.log("Elementos encontrados:", {
    backupsTab: !!backupsTab,
    configTab: !!configTab,
    vmsTab: !!vmsTab,
    automationTab: !!automationTab,
    schedulesTab: !!schedulesTab,
  });

  if (backupsTab) {
    backupsTab.style.display = tab === "backups" ? "block" : "none";
    console.log(`backups-tab-content display: ${backupsTab.style.display}`);
  } else {
    console.error("Elemento backups-tab-content não encontrado!");
  }
  if (configTab) {
    configTab.style.display = tab === "config" ? "block" : "none";
    console.log(`config-tab-content display: ${configTab.style.display}`);
    if (
      tab === "config" &&
      typeof window.automationRenderScriptDirectoriesList === "function"
    ) {
      window.automationRenderScriptDirectoriesList();
    }
  }
  if (vmsTab) {
    vmsTab.style.display = tab === "vms" ? "block" : "none";
    console.log(`vms-tab-content display: ${vmsTab.style.display}`);
    if (tab === "vms") {
      const permissionsChecked = sessionStorage.getItem(
        "vm-permissions-checked"
      );
      if (
        !permissionsChecked &&
        typeof window.checkAndFixVMScriptPermissions === "function"
      ) {
        setTimeout(() => window.checkAndFixVMScriptPermissions(), 500);
        sessionStorage.setItem("vm-permissions-checked", "true");
      }
      const allVMsLocal = window.allVMs || [];
      if (allVMsLocal.length === 0) {
        const discoveryRan = sessionStorage.getItem("vm-discovery-ran");
        if (!discoveryRan && typeof window.discoverVMs === "function") {
          setTimeout(() => window.discoverVMs(), 1000);
          sessionStorage.setItem("vm-discovery-ran", "true");
        }
      }
    }
  }
  if (automationTab) {
    automationTab.style.display = tab === "automation" ? "block" : "none";
    console.log(
      `automation-tab-content display: ${automationTab.style.display}`
    );
    if (tab === "automation") {
      const allScriptsLocal = window.allScripts || [];
      if (allScriptsLocal.length === 0) {
        const scriptsLoaded = sessionStorage.getItem("scripts-loaded");
        if (
          !scriptsLoaded &&
          typeof window.automationLoadScripts === "function"
        ) {
          console.log("Backup Manager: Carregando scripts automaticamente...");
          setTimeout(() => window.automationLoadScripts(), 500);
          sessionStorage.setItem("scripts-loaded", "true");
        }
      }
    }
  }
  if (schedulesTab) {
    schedulesTab.style.display = tab === "schedules" ? "block" : "none";
    console.log(`schedules-tab-content display: ${schedulesTab.style.display}`);
    if (tab === "schedules" && typeof window.loadSchedules === "function") {
      window.loadSchedules();
    }
  }

  console.log(`Backup Manager: ConteÃºdo da aba ${tab} exibido`);

  // Adicionar log de mudança de aba
  if (window.addGlobalLog) {
    const tabNames = {
      backups: "Lista de Backups",
      vms: "Backup de VMs",
      automation: "Automação & Scripts",
      schedules: "Agendamentos",
      config: "Configurações",
    };
    window.addGlobalLog(`Navegou para: ${tabNames[tab] || tab}`, "info");
  }
};

console.log(
  "✅ BACKUP-MANAGER.JS: window.switchTab definida!",
  typeof window.switchTab
);

// ============================================================================
// NOTA: Não criamos aliases locais (const x = window.x) porque isso causa
// erros de redeclaração quando os módulos já exportaram as propriedades.
// Use window.* diretamente no código ou acesse via optional chaining.
// ============================================================================

// ============================================================================
// ESTADO DA APLICAÇÃO
// ============================================================================
// NOTA: A maioria das variáveis de estado são definidas e exportadas pelos módulos:
// - currentDeleteTarget: definido em js/backups.js
// - emailConfig: definido em js/email.js (acessível via window.emailConfig)
// - allBackups, selectedBackups: definidos em js/backups.js
// - allVMs, selectedVMs, vmBackupConfig: definidos em js/vm-backup.js
// - scriptDirectories, allScripts, selectedScripts: definidos em js/automation.js
// - allSchedules, editingScheduleId: definidos em js/schedules.js

// Variáveis locais do backup-manager.js
let backupDirectories = [];
let userHome = null;
let configFile = null;

// Exportar variÃ¡veis locais para window (apenas as declaradas neste arquivo)
function exportGlobals() {
  window.backupDirectories = backupDirectories;
  // window.currentDeleteTarget - exportado por js/backups.js
  // window.emailConfig - exportado por js/email.js
  window.userHome = userHome;
  window.configFile = configFile;
  // As outras variáveis são gerenciadas pelos respectivos módulos
}

// InicializaÃ§Ã£o
document.addEventListener("DOMContentLoaded", async () => {
  console.log("Backup Manager: Inicializando...");

  // Exportar variÃ¡veis globais imediatamente
  exportGlobals();

  // Obter home do usuÃ¡rio usando getent ou whoami
  try {
    // Tentar obter usuÃ¡rio atual
    const user = await cockpit.spawn(["whoami"], { err: "message" });
    const username = user.trim();

    // Obter home do passwd
    const passwdEntry = await cockpit.spawn(["getent", "passwd", username], {
      err: "message",
    });
    const homePath = passwdEntry.trim().split(":")[5];

    userHome = homePath || `/home/${username}`;
    configFile = `${userHome}/.backup-manager/config.json`;

    console.log("Backup Manager: UsuÃ¡rio:", username);
    console.log("Backup Manager: Home do usuÃ¡rio:", userHome);
    console.log("Backup Manager: Arquivo de configuraÃ§Ã£o:", configFile);
  } catch (error) {
    console.error("Backup Manager: Erro ao obter home:", error);
    // Fallback: usar /tmp para evitar problemas de permissÃ£o
    userHome = "/tmp";
    configFile = "/tmp/.backup-manager-config.json";
    console.log("Backup Manager: Usando /tmp como fallback");
  }

  // Garantir que as abas estejam sempre visÃ­veis
  const tabsContainer = document.getElementById("backup-tabs");
  if (tabsContainer) {
    tabsContainer.style.display = "block";
    tabsContainer.style.visibility = "visible";
    tabsContainer.style.opacity = "1";
    console.log("Backup Manager: Abas configuradas");
  } else {
    console.error("Backup Manager: Elemento #backup-tabs nÃ£o encontrado!");
  }

  // Adicionar log de inicialização
  if (window.addGlobalLog) {
    window.addGlobalLog("Sistema iniciado", "success");
  }

  // Carregar configuraÃ§Ã£o primeiro, depois os backups
  await loadConfiguration();
  await window.loadBackups();
  setupEventListeners();

  // Garantir que a aba de backups esteja visÃ­vel inicialmente
  window.switchTab("backups");

  console.log("Backup Manager: InicializaÃ§Ã£o completa");
  if (window.addGlobalLog) {
    window.addGlobalLog("Inicialização completa", "success");
  }
});

// ============================================================================
// CONFIGURAÃ‡ÃƒO
// ============================================================================

async function loadConfiguration() {
  // Usar caminho do sistema
  const systemConfigFile = "/var/lib/cockpit/backup-manager/config.json";

  console.log("Backup Manager: Carregando configuraÃ§Ã£o de", systemConfigFile);
  try {
    const result = await cockpit.spawn(["cat", systemConfigFile], {
      err: "message",
    });
    const config = JSON.parse(result);
    backupDirectories = config.directories || [];
    window.scriptDirectories = config.scriptDirectories || [];
    window.emailConfig = {
      ...(window.emailConfig || {}),
      ...(config.email || {}),
    };
    window.vmBackupConfig = {
      ...(window.vmBackupConfig || {}),
      ...(config.vmBackupConfig || {}),
    };

    // Atualizar referÃªncia global
    configFile = systemConfigFile;

    // Exportar variÃ¡veis atualizadas para window
    exportGlobals();

    console.log(
      "Backup Manager: ConfiguraÃ§Ã£o carregada com sucesso!",
      backupDirectories.length,
      "diretÃ³rio(s)"
    );

    if (window.addGlobalLog) {
      window.addGlobalLog(
        `Configuração carregada: ${backupDirectories.length} diretório(s)`,
        "info"
      );
    }

    updateUI();
    updateDirectoriesList();
    updateDirectoryFilter();
    updateEmailForm();
    window.updateVMConfigForm();
  } catch (error) {
    console.log(
      "Backup Manager: Arquivo de configuraÃ§Ã£o nÃ£o encontrado, criando novo..."
    );
    // Se o arquivo nÃ£o existir, criar configuraÃ§Ã£o padrÃ£o
    configFile = systemConfigFile;
    backupDirectories = [];
    // Exportar variÃ¡veis para window
    exportGlobals();
    await saveConfiguration();
  }
}

async function saveConfiguration() {
  const config = {
    directories: backupDirectories,
    scriptDirectories: window.scriptDirectories || [],
    email: window.emailConfig || {},
    vmBackupConfig: window.vmBackupConfig || {},
    version: "1.0.0",
    lastUpdated: new Date().toISOString(),
  };

  console.log(
    "Backup Manager: Salvando configuraÃ§Ã£o...",
    backupDirectories.length,
    "diretÃ³rio(s)"
  );

  try {
    // Usar diretÃ³rio do sistema acessÃ­vel
    const configDir = "/var/lib/cockpit/backup-manager";
    const targetFile = `${configDir}/config.json`;

    console.log("Backup Manager: DiretÃ³rio de configuraÃ§Ã£o:", configDir);

    // Criar diretÃ³rio se nÃ£o existir (com sudo)
    try {
      await cockpit.spawn(["test", "-d", configDir], { err: "ignore" });
      console.log("Backup Manager: DiretÃ³rio jÃ¡ existe");
    } catch (e) {
      console.log(
        "Backup Manager: Criando diretÃ³rio (solicitando privilÃ©gios)..."
      );
      await cockpit.spawn(["mkdir", "-p", configDir], {
        err: "message",
        superuser: "require",
      });
      console.log("Backup Manager: DiretÃ³rio criado com sucesso");
    }

    console.log("Backup Manager: Salvando arquivo em:", targetFile);
    const configJson = JSON.stringify(config, null, 2);

    // Salvar com privilÃ©gios de root
    const process = cockpit.spawn(["tee", targetFile], {
      err: "message",
      superuser: "require",
    });
    process.input(configJson);
    await process;

    // Garantir permissÃµes corretas no arquivo
    await cockpit.spawn(["chmod", "644", targetFile], {
      err: "ignore",
      superuser: "require",
    });

    console.log("Backup Manager: âœ“ ConfiguraÃ§Ã£o salva em", targetFile);
    window.showAlert("success", "âœ… ConfiguraÃ§Ã£o salva com sucesso!");

    // Atualizar referÃªncia global
    configFile = targetFile;

    // Verificar se foi salvo corretamente
    console.log("Backup Manager: Verificando arquivo salvo...");
    const verify = await cockpit.spawn(["cat", targetFile], {
      err: "message",
    });
    console.log(
      "Backup Manager: âœ“ Arquivo contÃ©m:",
      verify.substring(0, 100) + "..."
    );
  } catch (error) {
    console.error("Backup Manager: âœ— Erro ao salvar configuraÃ§Ã£o:", error);
    const errorMsg =
      error?.message ||
      error?.toString() ||
      JSON.stringify(error) ||
      "Erro desconhecido";
    window.showAlert("danger", `âŒ Erro ao salvar configuraÃ§Ã£o: ${errorMsg}`);
    throw error; // Re-lanÃ§ar para debug
  }
}

// ============================================================================
// DIRETÃ“RIOS
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

  // Abrir modal de navegaÃ§Ã£o de diretÃ³rios
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
    // Listar diretÃ³rios
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
        '<div style="text-align: center; padding: 2rem; color: #999;">Nenhum subdiretÃ³rio encontrado</div>';
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
              <span style="font-size: 1.5rem; margin-right: 0.75rem;">ðŸ“</span>
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
    container.innerHTML = `<div style="text-align: center; padding: 2rem; color: #c9190b;">Erro ao listar diretÃ³rios: ${escapeHtml(
      error?.message || "Caminho invÃ¡lido"
    )}</div>`;
  }
}

function selectDirectory(path) {
  // Se existir um callback personalizado (para scripts), usar ele
  if (window.scriptDirectoryCallback) {
    window.scriptDirectoryCallback(path);
    window.scriptDirectoryCallback = null; // Limpar o callback
    window.showAlert("success", `âœ… DiretÃ³rio selecionado: ${path}`);
  } else {
    // Comportamento padrÃ£o (para backups)
    document.getElementById("directory-path").value = path;
    closeDirectoryBrowser();
    window.showAlert("success", `âœ… DiretÃ³rio selecionado: ${path}`);
  }
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
    { path: userHome, icon: "ðŸ ", label: "Home" },
    { path: "/var/backups", icon: "ðŸ’¾", label: "Sistema - /var/backups" },
    { path: "/home", icon: "ðŸ‘¥", label: "UsuÃ¡rios - /home" },
    { path: "/tmp", icon: "ðŸ“¦", label: "TemporÃ¡rio - /tmp" },
    { path: "/opt", icon: "ðŸ“", label: "AplicaÃ§Ãµes - /opt" },
    { path: "/srv", icon: "ðŸ–¥ï¸", label: "ServiÃ§os - /srv" },
  ];

  document.getElementById("current-path").textContent = "DiretÃ³rios Comuns";
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
    window.showAlert("warning", "Por favor, informe o caminho do diretÃ³rio.");
    return;
  }

  // Verificar se o diretÃ³rio existe
  try {
    await cockpit.spawn(["test", "-d", path]);
  } catch (error) {
    window.showAlert("danger", `DiretÃ³rio nÃ£o encontrado: ${path}`);
    return;
  }

  // Verificar se jÃ¡ existe
  if (backupDirectories.some((d) => d.path === path)) {
    window.showAlert("warning", "Este diretÃ³rio jÃ¡ estÃ¡ na lista.");
    return;
  }

  // Adicionar diretÃ³rio
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
  await window.loadBackups();
  console.log("Backup Manager: Lista de backups atualizada");
}

async function removeDirectory(id) {
  const directory = backupDirectories.find((d) => d.id === id);
  if (!directory) return;

  currentDeleteTarget = { type: "directory", id: id, name: directory.path };
  document.getElementById(
    "delete-message"
  ).textContent = `VocÃª estÃ¡ prestes a remover o diretÃ³rio "${directory.label}" da lista de monitoramento. Os arquivos nÃ£o serÃ£o deletados.`;
  document.getElementById("delete-confirm-modal").style.display = "block";
}

function updateDirectoriesList() {
  const container = document.getElementById("directories-list");

  if (backupDirectories.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="padding: var(--pf-global--spacer--lg);">
        <p style="color: var(--pf-global--Color--200); text-align: center;">
          Nenhum diretÃ³rio configurado ainda.
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
        <span class="directory-icon">ðŸ“</span>
        <div>
          <div style="font-weight: bold;">${escapeHtml(dir.label)}</div>
          <div class="directory-path">${escapeHtml(dir.path)}</div>
          <small style="color: var(--pf-global--Color--200);">
            PadrÃ£o: ${escapeHtml(dir.pattern)} |
            Profundidade: ${dir.maxDepth || 1} |
            Adicionado em: ${formatDate(dir.addedAt)}
          </small>
        </div>
      </div>
      <button class="pf-c-button pf-m-danger pf-m-small" onclick="removeDirectory('${
        dir.id
      }')">
        ðŸ—‘ï¸ Remover
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
    '<option value="">Todos os diretÃ³rios</option>' +
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
// BACKUPS, SELEÇÃO E AÇÕES DE BACKUP - Funções movidas para js/backups.js
// As funções abaixo estão definidas no módulo e são exportadas via window.*:
// loadBackups, loadBackupsFromDirectory, updateBackupsTable, applyFilters,
// applySort, toggleBackupSelection, toggleSelectAll, updateSelectionButtons,
// downloadBackup, showDeleteModal, confirmDelete, deleteSelectedBackups,
// exportToGoogleDrive, exportToOneDrive, exportToDropbox,
// exportSelectedToGoogleDrive, exportSelectedToOneDrive, exportSelectedToDropbox,
// deleteOldBackups, etc.
// ============================================================================

// ============================================================================
// EMAIL CONFIGURATION
// ============================================================================

function updateEmailForm() {
  const cfg = window.emailConfig || {};
  document.getElementById("email-recipient").value = cfg.recipient || "";
  document.getElementById("email-subject").value =
    cfg.subject || "Backup do Sistema - {{date}}";
  document.getElementById("max-email-size").value = cfg.maxSize || 25;
}

async function testEmailConfiguration() {
  try {
    window.showAlert("info", "ðŸ”§ Testando configuraÃ§Ã£o de email...", 0);

    const script =
      "/usr/share/cockpit/scheduling_exec/scripts/backup/test-email.sh";
    const recipient = document.getElementById("email-recipient").value.trim();

    console.log("Testando configuraÃ§Ã£o de email...");

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
      if (line.includes("âŒ")) {
        hasError = true;
        errorMessage += line + "\n";
      } else if (line.includes("âœ…")) {
        successMessage += line + "\n";
      }
    }

    if (hasError) {
      window.showAlert(
        "warning",
        `âš ï¸ Problemas encontrados:\n${errorMessage}\n${successMessage}`,
        15000
      );
    } else {
      window.showAlert(
        "success",
        `âœ… ConfiguraÃ§Ã£o OK!\n${successMessage}`,
        10000
      );
    }
  } catch (error) {
    console.error("Erro ao testar configuraÃ§Ã£o:", error);
    const errorMsg = error?.message || error?.toString() || "Erro desconhecido";
    window.showAlert(
      "danger",
      `âŒ Erro ao testar configuraÃ§Ã£o: ${errorMsg}`,
      10000
    );
  }
}

function setupEventListeners() {
  document
    .getElementById("email-config-form")
    .addEventListener("submit", async (e) => {
      e.preventDefault();

      if (!window.emailConfig) window.emailConfig = {};
      window.emailConfig.recipient = document
        .getElementById("email-recipient")
        .value.trim();
      window.emailConfig.subject = document
        .getElementById("email-subject")
        .value.trim();
      window.emailConfig.maxSize = parseInt(
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

// switchTab está definida no topo do arquivo e exportada para window.switchTab

// updateStats está definida em js/backups.js e exportada via window.updateStats

function updateUI() {
  // Chamar funções do módulo backups.js via window
  if (typeof window.updateStats === "function") {
    window.updateStats();
  }
  updateDirectoriesList();
  if (typeof window.updateBackupsTable === "function") {
    window.updateBackupsTable();
  }
}

// ============================================================================
// FORMATTERS E HELPERS - Funções movidas para js/utils.js
// As seguintes funções estão definidas no módulo e são exportadas via window.*:
// showAlert, getAlertIcon, formatSize, getSizeClass, formatDate,
// formatRelativeTime, getFileIcon, escapeHtml
// ============================================================================

// ============================================================================
// BACKUP DE VMs - Funções movidas para js/vm-backup.js
// As funções abaixo estão definidas no módulo e são exportadas via window.*:
// checkAndFixVMScriptPermissions, discoverVMs, diagnoseVMs, renderVMTable,
// toggleVMSelection, toggleSelectAllVMs, updateVMStats, backupSelectedVMs,
// cleanOldVMBackups, updateVMBackupConfig, updateVMConfigForm, addVMLog, clearVMLog
// ============================================================================

// ============================================================================
// AUTOMAÇÃO, SCRIPTS E AGENDAMENTOS - Funções movidas para módulos:
// - js/automation.js: automationShowLoading, automationShowError, automationFormatDate, etc.
// - js/automation-scripts.js: automationLoadScripts, automationRenderScripts, etc.
// - js/schedules.js: loadSchedules, renderSchedulesTable, openScheduleModal, etc.
// Todas as funções são exportadas via window.* pelos respectivos módulos.
// ============================================================================

// ============================================================================
// EXPORTAR FUNÃ‡Ã•ES PARA USO GLOBAL (onclick no HTML)
// Nota: loadBackups, updateStats, updateBackupsTable estão em js/backups.js
// ============================================================================

// window.switchTab - já exportado no topo do arquivo como wrapper no HTML
// A função real está em window.switchTabReal
window.loadConfiguration = loadConfiguration;
window.saveConfiguration = saveConfiguration;
// window.loadBackups - exportado por js/backups.js
window.updateUI = updateUI;
// window.updateStats - exportado por js/backups.js
window.updateDirectoriesList = updateDirectoriesList;
window.updateDirectoryFilter = updateDirectoryFilter;
window.addDirectory = addDirectory;
window.removeDirectory = removeDirectory;
window.exportGlobals = exportGlobals;

// ============================================================================
// LOG GLOBAL
// ============================================================================

// Função para adicionar log global
window.addGlobalLog = function (message, type = "info") {
  const logBody = document.getElementById("global-log-body");
  if (!logBody) return;

  const timestamp = new Date().toLocaleTimeString();
  const logEntry = document.createElement("div");
  logEntry.className = `log-entry ${type}`;
  logEntry.textContent = `[${timestamp}] ${message}`;

  logBody.appendChild(logEntry);

  // Auto-scroll para o final
  logBody.scrollTop = logBody.scrollHeight;

  // Limitar número de entradas (manter últimas 500)
  const entries = logBody.querySelectorAll(".log-entry");
  if (entries.length > 500) {
    entries[0].remove();
  }
};

// Limpar log
window.clearGlobalLog = function () {
  const logBody = document.getElementById("global-log-body");
  if (!logBody) return;

  logBody.innerHTML =
    '<div class="log-entry info">[' +
    new Date().toLocaleTimeString() +
    "] Log limpo</div>";
};

// Baixar log
window.downloadGlobalLog = function () {
  const logBody = document.getElementById("global-log-body");
  if (!logBody) return;

  const logText = Array.from(logBody.querySelectorAll(".log-entry"))
    .map((entry) => entry.textContent)
    .join("\n");

  const blob = new Blob([logText], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `backup-manager-log-${
    new Date().toISOString().split("T")[0]
  }.txt`;
  a.click();
  URL.revokeObjectURL(url);
};

// Toggle log
window.toggleGlobalLog = function () {
  const logColumn = document.getElementById("log-column");
  if (!logColumn) return;

  logColumn.classList.toggle("collapsed");

  // Salvar preferência
  const isCollapsed = logColumn.classList.contains("collapsed");
  localStorage.setItem("globalLogCollapsed", isCollapsed);

  // Remover estilo inline de largura quando colapsar para não interferir com CSS
  if (isCollapsed) {
    logColumn.style.width = "";
  } else {
    // Restaurar largura salva ao expandir
    const savedWidth = localStorage.getItem("globalLogWidth");
    if (savedWidth) {
      logColumn.style.width = savedWidth + "px";
    }
  }
};

// Restaurar estado do log ao carregar
document.addEventListener("DOMContentLoaded", () => {
  const isCollapsed = localStorage.getItem("globalLogCollapsed") === "true";
  const logColumn = document.getElementById("log-column");
  if (isCollapsed && logColumn) {
    logColumn.classList.add("collapsed");
  }
});

// ============================================================================
// REDIMENSIONAMENTO DO LOG
// ============================================================================

document.addEventListener("DOMContentLoaded", () => {
  const resizeHandle = document.getElementById("resize-handle");
  const logColumn = document.getElementById("log-column");

  if (!resizeHandle || !logColumn) return;

  let isResizing = false;
  let startX = 0;
  let startWidth = 0;

  resizeHandle.addEventListener("mousedown", (e) => {
    isResizing = true;
    startX = e.clientX;
    startWidth = logColumn.offsetWidth;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    e.preventDefault();
  });

  document.addEventListener("mousemove", (e) => {
    if (!isResizing) return;

    const diff = startX - e.clientX;
    const newWidth = startWidth + diff;

    // Limitar tamanho
    if (newWidth >= 250 && newWidth <= 800) {
      logColumn.style.width = newWidth + "px";
      localStorage.setItem("globalLogWidth", newWidth);
    }
  });

  document.addEventListener("mouseup", () => {
    if (isResizing) {
      isResizing = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }
  });

  // Restaurar largura salva
  const savedWidth = localStorage.getItem("globalLogWidth");
  if (savedWidth) {
    logColumn.style.width = savedWidth + "px";
  }
});

// ============================================================================
// FIM DO BACKUP-MANAGER.JS
// ============================================================================
console.log("✅ BACKUP-MANAGER.JS: Carregado completamente!");
console.log("✅ window.switchTab disponível:", typeof window.switchTab);

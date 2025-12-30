/**
 * Automation Module - Gerenciamento de Scripts
 * Carregamento, execução, edição e agendamento de scripts
 */

// Estado
let scriptDirectories = [];
let allScripts = [];
let selectedScripts = new Set();
let automationCurrentEditingScript = null;
let automationImportCandidates = [];
let automationCurrentSudoScript = null;
let automationCurrentScriptEnv = null;
let automationCronModalMode = "script";
let automationOpenRowActionsMenuId = null;
let automationCurrentLogScript = null;

// Exportar para window imediatamente
window.allScripts = allScripts;
window.scriptDirectories = scriptDirectories;
window.automationCurrentSudoScript = automationCurrentSudoScript;

// ============================================================================
// FUNÇÕES AUXILIARES
// ============================================================================

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

function automationEscapeJs(value) {
  return String(value)
    .replaceAll("\\", "\\\\")
    .replaceAll("'", "\\'")
    .replaceAll('"', '\\"')
    .replaceAll("\n", "\\n")
    .replaceAll("\r", "\\r");
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

// ============================================================================
// ESTATÍSTICAS
// ============================================================================

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
  const running = 0;
  const failures = scripts.filter((s) => {
    const failureRate =
      s.total_executions > 0
        ? (s.total_executions - s.successful_executions) / s.total_executions
        : 0;
    return failureRate > 0.1;
  }).length;

  totalEl.textContent = total;
  scheduledEl.textContent = scheduled;
  runningEl.textContent = running;
  failuresEl.textContent = failures;

  console.log("Automation: Stats -", { total, scheduled, running, failures });
}

// ============================================================================
// FILTROS E ORDENAÇÃO
// ============================================================================

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

  if (searchValue) {
    filtered = filtered.filter((script) =>
      script.name.toLowerCase().includes(searchValue)
    );
  }

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
// GERENCIAMENTO DE DIRETÓRIOS
// ============================================================================

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
              <button class="pf-c-button pf-m-danger pf-m-small" onclick="automationRemoveScriptDirectory(${index})">
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

async function automationAddScriptDirectory() {
  console.log("Automation: Abrindo modal para adicionar diretório");
  const modal = document.getElementById("add-script-directory-modal");
  if (modal) {
    modal.style.display = "block";
    document.getElementById("script-directory-path").value = "";
    document.getElementById("script-directory-label").value = "";
    document.getElementById("script-max-depth").value = "10";
  }
}

function closeAddScriptDirectoryModal() {
  const modal = document.getElementById("add-script-directory-modal");
  if (modal) {
    modal.style.display = "none";
  }
}

function browseScriptDirectory() {
  const pathInput = document.getElementById("script-directory-path");
  const currentPath = pathInput.value || window.userHome || "/home";

  window.scriptDirectoryCallback = (selectedPath) => {
    document.getElementById("script-directory-path").value = selectedPath;
    window.closeDirectoryBrowser();
  };

  document.getElementById("directory-browser-modal").style.display = "block";
  window.loadDirectoryContents(currentPath);
}

async function addScriptDirectory() {
  const pathInput = document.getElementById("script-directory-path");
  const labelInput = document.getElementById("script-directory-label");
  const maxDepthInput = document.getElementById("script-max-depth");

  const path = pathInput.value.trim();
  const label = labelInput.value.trim();
  const maxDepth = parseInt(maxDepthInput.value) || 10;

  if (!path) {
    showAlert("warning", "⚠️ Por favor, informe o caminho do diretório!");
    return;
  }

  const exists = scriptDirectories.some((d) => d.path === path);
  if (exists) {
    showAlert("warning", "⚠️ Este diretório já está configurado!");
    return;
  }

  scriptDirectories.push({
    path: path,
    label:
      label ||
      path
        .split("/")
        .filter((x) => x)
        .pop() ||
      path,
    maxDepth: maxDepth,
  });

  await saveConfiguration();
  automationRenderScriptDirectoriesList();
  closeAddScriptDirectoryModal();

  window.addGlobalLog(`📁 Diretório adicionado: ${path}`);
  showAlert("success", "✅ Diretório adicionado! Recarregando scripts...");
  await automationLoadScripts();
}

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
    return;
  }

  console.log("Automation: Removendo diretório:", dir);
  scriptDirectories.splice(index, 1);

  try {
    await saveConfiguration();
    automationRenderScriptDirectoriesList();
    window.addGlobalLog(`🗑️ Diretório removido: ${dir.path}`);
    showAlert("success", "✅ Diretório removido! Recarregando scripts...");
    await automationLoadScripts();
  } catch (error) {
    console.error("Automation: Erro ao salvar configuração:", error);
    showAlert("danger", "❌ Erro ao salvar: " + (error.message || error));
    scriptDirectories.splice(index, 0, dir);
    automationRenderScriptDirectoriesList();
  }
}

// ============================================================================
// CARREGAMENTO DE SCRIPTS
// ============================================================================

async function automationLoadScripts() {
  console.log("Automation: Carregando scripts dos diretórios configurados...");
  automationShowLoading(true);

  allScripts = [];
  window.allScripts = allScripts;

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

      const findCmd =
        dir.maxDepth === 1
          ? [
              "find",
              dir.path,
              "-maxdepth",
              "1",
              "-type",
              "f",
              "-name",
              "*.sh",
              "!",
              "-name",
              ".*",
            ]
          : [
              "find",
              dir.path,
              "-maxdepth",
              String(dir.maxDepth),
              "-type",
              "f",
              "-name",
              "*.sh",
              "!",
              "-name",
              ".*",
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
          try {
            const stat = await cockpit.spawn(
              ["stat", "-c", "%s %Y %a", filePath],
              { err: "ignore", superuser: "try" }
            );

            const [size, mtime, permissions] = stat.trim().split(" ");
            const fileName = filePath.split("/").pop();

            const exists = allScripts.some((s) => s.path === filePath);
            if (exists) {
              console.log(`Automation: Script duplicado ignorado: ${filePath}`);
              continue;
            }

            allScripts.push({
              name: fileName,
              path: filePath,
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
            window.allScripts = allScripts;
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
      window.addGlobalLog(
        "ℹ️ Nenhum script (.sh) encontrado nos diretórios configurados"
      );
      showAlert(
        "info",
        "ℹ️ Nenhum script (.sh) encontrado nos diretórios configurados.",
        5000
      );
    } else {
      window.addGlobalLog(
        `✅ ${allScripts.length} script(s) carregado(s) com sucesso`
      );
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

// ============================================================================
// RENDERIZAÇÃO
// ============================================================================

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
            <button class="pf-c-dropdown__toggle pf-m-plain js-row-actions-toggle" type="button" onclick="automationToggleRowActionsMenu('${automationEscapeJs(
              menuId
            )}')" style="padding: 0.5rem; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 4px; cursor: pointer;">
              ⋮
            </button>
            <ul class="pf-c-dropdown__menu js-row-actions-menu" id="${automationEscapeHtml(
              menuId
            )}" hidden style="position: fixed; z-index: 9999; background: white; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); min-width: 12rem;">
              <li><button class="pf-c-dropdown__menu-item" onclick="automationCloseAllRowActionsMenus(); automationOpenSudoModal('${automationEscapeJs(
                scriptName
              )}');">▶️ Executar</button></li>
              <li><button class="pf-c-dropdown__menu-item" onclick="automationCloseAllRowActionsMenus(); automationOpenScriptEnvModal('${automationEscapeJs(
                scriptName
              )}');">🔧 Variáveis (script)</button></li>
              <li><button class="pf-c-dropdown__menu-item" onclick="automationCloseAllRowActionsMenus(); automationOpenLogModal('${automationEscapeJs(
                scriptName
              )}');">📋 Logs</button></li>
              <li><button class="pf-c-dropdown__menu-item" onclick="automationCloseAllRowActionsMenus(); automationEditScript('${automationEscapeJs(
                scriptName
              )}');">✏️ Editar</button></li>
              <li><button class="pf-c-dropdown__menu-item" onclick="automationCloseAllRowActionsMenus(); automationOpenCronModal('${automationEscapeJs(
                scriptName
              )}');">⏰ Agendar</button></li>
              <li><button class="pf-c-dropdown__menu-item" onclick="automationCloseAllRowActionsMenus(); automationDeleteScript('${automationEscapeJs(
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

// ============================================================================
// MENU DE AÇÕES
// ============================================================================

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

// ============================================================================
// EXPORTAR PARA USO GLOBAL
// ============================================================================

window.scriptDirectories = scriptDirectories;
window.allScripts = allScripts;
window.selectedScripts = selectedScripts;
window.automationCurrentEditingScript = automationCurrentEditingScript;
window.automationShowLoading = automationShowLoading;
window.automationShowError = automationShowError;
window.automationFormatDate = automationFormatDate;
window.automationGetNextCronExecution = automationGetNextCronExecution;
window.automationEscapeHtml = automationEscapeHtml;
window.automationEscapeJs = automationEscapeJs;
window.automationMakeSafeId = automationMakeSafeId;
window.automationFormatCockpitError = automationFormatCockpitError;
window.automationUpdateStatCards = automationUpdateStatCards;
window.automationApplyFilters = automationApplyFilters;
window.automationRenderScriptDirectoriesList =
  automationRenderScriptDirectoriesList;
window.automationAddScriptDirectory = automationAddScriptDirectory;
window.closeAddScriptDirectoryModal = closeAddScriptDirectoryModal;
window.browseScriptDirectory = browseScriptDirectory;
window.addScriptDirectory = addScriptDirectory;
window.automationRemoveScriptDirectory = automationRemoveScriptDirectory;
window.automationLoadScripts = automationLoadScripts;
window.automationRenderScripts = automationRenderScripts;
window.automationCloseAllRowActionsMenus = automationCloseAllRowActionsMenus;
window.automationToggleRowActionsMenu = automationToggleRowActionsMenu;
// Funções de ações exportadas em automation-actions.js

// Inicializar conexão com Cockpit
const cockpit = window.cockpit;

let currentEditingScript = null;
let importCandidates = [];
let eventHandlersBound = false;
let currentSudoScript = null;
let currentScriptEnv = null;
let cronModalMode = "script";
let openRowActionsMenuId = null;
let scriptModalGlobalEnv = "";
let scriptModalScriptEnv = "";
let scriptModalEnvLoading = false;
let scriptModalEnvLoadedFor = null;
let allScripts = []; // Cache de todos os scripts carregados

// Atualizar cards de estatísticas
function updateStatCards(scripts) {
  const totalEl = document.getElementById("stat-total-scripts");
  const scheduledEl = document.getElementById("stat-scheduled");
  const runningEl = document.getElementById("stat-running");
  const failuresEl = document.getElementById("stat-failures");

  if (!totalEl || !scheduledEl || !runningEl || !failuresEl) return;

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
}

// Aplicar filtros e ordenação
function applyFilters() {
  const searchValue =
    document.getElementById("filter-search")?.value.toLowerCase() || "";
  const sortValue = document.getElementById("filter-sort")?.value || "name-asc";
  const statusValue = document.getElementById("filter-status")?.value || "all";

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
        // TODO: Implementar detecção de scripts em execução
        filtered = [];
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
      // Ordenar por próxima execução (scripts sem agendamento vão para o fim)
      filtered.sort((a, b) => {
        const aHasCron = a.cron_expression && a.cron_expression !== "";
        const bHasCron = b.cron_expression && b.cron_expression !== "";
        if (!aHasCron && !bHasCron) return 0;
        if (!aHasCron) return 1;
        if (!bHasCron) return -1;
        // Ambos têm cron - ordenar alfabeticamente por enquanto
        return a.cron_expression.localeCompare(b.cron_expression);
      });
      break;
  }

  renderScripts(filtered);
}

function parseEnvKeys(envContent) {
  const keys = new Set();
  if (!envContent) return keys;

  String(envContent)
    .split(/\r?\n/)
    .forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return;
      const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=/);
      if (match && match[1]) keys.add(match[1]);
    });

  return keys;
}

function extractReferencedVars(scriptContent) {
  const vars = new Set();
  if (!scriptContent) return vars;

  const text = String(scriptContent);
  const regex = /\$\{?([A-Za-z_][A-Za-z0-9_]*)\}?/g;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const name = match[1];
    if (!name) continue;
    vars.add(name);
  }

  // Remove variáveis especiais mais comuns que não são "env vars"
  ["IFS", "PWD", "OLDPWD", "SHLVL", "RANDOM", "SECONDS", "LINENO"].forEach(
    (v) => vars.delete(v)
  );

  return vars;
}

function setScriptModalPath(scriptName) {
  const pathInput = document.getElementById("script-path");
  if (!pathInput) return;
  if (!scriptName) {
    pathInput.value = "~/scripts/<script>.sh";
    return;
  }
  pathInput.value = `~/scripts/${scriptName}`;
}

function setScriptModalEnvTextareas() {
  const globalTa = document.getElementById("script-modal-global-env");
  if (globalTa) globalTa.value = scriptModalGlobalEnv || "";
  const scriptTa = document.getElementById("script-modal-script-env");
  if (scriptTa) scriptTa.value = scriptModalScriptEnv || "";
}

function refreshScriptModalVarsSummary() {
  const summary = document.getElementById("script-vars-summary");
  if (!summary) return;

  const contentEl = document.getElementById("script-content");
  const content = contentEl ? contentEl.value : "";
  const referenced = Array.from(extractReferencedVars(content)).sort();

  if (referenced.length === 0) {
    summary.innerHTML = `Variáveis referenciadas detectadas: <code>-</code>`;
    return;
  }

  const envKeys = new Set([
    ...parseEnvKeys(scriptModalGlobalEnv),
    ...parseEnvKeys(scriptModalScriptEnv),
  ]);

  const defined = [];
  const missing = [];
  referenced.forEach((v) => {
    if (envKeys.has(v)) defined.push(v);
    else missing.push(v);
  });

  const fmt = (arr) =>
    arr.length
      ? `<code>${escapeHtml(arr.join(", "))}</code>`
      : "<code>-</code>";

  summary.innerHTML =
    `Variáveis referenciadas detectadas: ` +
    `definidas ${fmt(defined)}; não definidas ${fmt(missing)}`;
}

function loadScriptModalEnvs(scriptName) {
  if (scriptModalEnvLoading) return Promise.resolve();

  // Evita recarregar desnecessariamente no mesmo script
  if (scriptName && scriptModalEnvLoadedFor === scriptName) {
    setScriptModalEnvTextareas();
    refreshScriptModalVarsSummary();
    return Promise.resolve();
  }

  scriptModalEnvLoading = true;

  const globalTa = document.getElementById("script-modal-global-env");
  if (globalTa) globalTa.value = "Carregando...";
  const scriptTa = document.getElementById("script-modal-script-env");
  if (scriptTa) scriptTa.value = scriptName ? "Carregando..." : "";

  const pGlobal = cockpit
    .spawn(["/usr/share/cockpit/scheduling_exec/scripts/get-env.sh"], {
      err: "message",
    })
    .then((content) => {
      scriptModalGlobalEnv = content || "";
    })
    .catch(() => {
      scriptModalGlobalEnv = "";
    });

  const pScript = scriptName
    ? cockpit
        .spawn(
          [
            "/usr/share/cockpit/scheduling_exec/scripts/get-script-env.sh",
            scriptName,
          ],
          { err: "message" }
        )
        .then((content) => {
          scriptModalScriptEnv = content || "";
        })
        .catch(() => {
          scriptModalScriptEnv = "";
        })
    : Promise.resolve().then(() => {
        scriptModalScriptEnv = "";
      });

  return Promise.all([pGlobal, pScript])
    .then(() => {
      scriptModalEnvLoadedFor = scriptName || null;
      setScriptModalEnvTextareas();
      refreshScriptModalVarsSummary();
    })
    .finally(() => {
      scriptModalEnvLoading = false;
    });
}

function resetScriptModalEnvState() {
  scriptModalGlobalEnv = "";
  scriptModalScriptEnv = "";
  scriptModalEnvLoadedFor = null;
  scriptModalEnvLoading = false;

  const globalTa = document.getElementById("script-modal-global-env");
  if (globalTa) globalTa.value = "";
  const scriptTa = document.getElementById("script-modal-script-env");
  if (scriptTa) scriptTa.value = "";

  refreshScriptModalVarsSummary();
}

async function copyTextToClipboard(text) {
  if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const tmp = document.createElement("textarea");
  tmp.value = text;
  tmp.setAttribute("readonly", "true");
  tmp.style.position = "fixed";
  tmp.style.top = "-1000px";
  tmp.style.left = "-1000px";
  document.body.appendChild(tmp);
  tmp.focus();
  tmp.select();
  document.execCommand("copy");
  document.body.removeChild(tmp);
}

async function copyScriptWithVariables() {
  const nameEl = document.getElementById("script-name");
  const contentEl = document.getElementById("script-content");
  const scriptName = nameEl ? nameEl.value.trim() : "";
  const scriptContent = contentEl ? contentEl.value : "";

  try {
    // Garante que os .env foram carregados antes de copiar
    await loadScriptModalEnvs(scriptName || null);

    const text =
      `# Script: ${scriptName || "(sem nome)"}\n` +
      `# Path: ~/scripts/${scriptName || "<script>.sh"}\n` +
      `# Global env: ~/scripts/.env\n` +
      `# Script env: ~/scripts/.env.${scriptName || "<script>"}\n\n` +
      `### Global env (.env)\n${scriptModalGlobalEnv || "(vazio)"}\n\n` +
      `### Script env (.env.<script>)\n${
        scriptModalScriptEnv || "(vazio)"
      }\n\n` +
      `### Script content\n${scriptContent || "(vazio)"}\n`;

    await copyTextToClipboard(text);
    alert("Copiado para a área de transferência (script + variáveis).");
  } catch (e) {
    showError("Não foi possível copiar: " + formatCockpitError(e));
  }
}

function makeSafeId(value) {
  return String(value || "")
    .replaceAll(/[^a-zA-Z0-9_-]/g, "_")
    .replaceAll(/_+/g, "_")
    .replaceAll(/^_+|_+$/g, "");
}

function closeAllRowActionsMenus() {
  const menus = document.querySelectorAll(".js-row-actions-menu");
  menus.forEach((menu) => {
    menu.hidden = true;
  });

  const toggles = document.querySelectorAll(".js-row-actions-toggle");
  toggles.forEach((toggle) => {
    toggle.setAttribute("aria-expanded", "false");
  });

  const containers = document.querySelectorAll(".js-row-actions.is-open");
  containers.forEach((container) => {
    container.classList.remove('is-open');
  });

  openRowActionsMenuId = null;
}

  openRowActionsMenuId = null;
}

function toggleRowActionsMenu(menuId) {
  const menu = document.getElementById(menuId);
  if (!menu) return;

  const toggle = document.querySelector(
    `.js-row-actions-toggle[data-menu-id="${menuId}"]`
  );
  const container = toggle?.closest('.js-row-actions');

  // Fecha o que estiver aberto (inclusive o próprio)
  if (openRowActionsMenuId && openRowActionsMenuId !== menuId) {
    closeAllRowActionsMenus();
  }

  const willOpen = menu.hidden === true;
  closeAllRowActionsMenus();

  if (willOpen) {
    // Calcular posição do menu
    if (toggle) {
      const rect = toggle.getBoundingClientRect();
      menu.style.top = `${rect.bottom + 8}px`;
      menu.style.left = `${rect.right - 192}px`; // 192px = 12rem (min-width do menu)
      menu.hidden = false;
      toggle.setAttribute("aria-expanded", "true");
      if (container) container.classList.add('is-open');
      openRowActionsMenuId = menuId;
    }
  }
}

function updatePluginFooter() {
  const footer = document.getElementById("plugin-footer");
  if (!footer) return;

  const fallbackVersion = "1.3.3";
  const fallbackAuthor = "Luis Gustavo Santarosa Pinto";

  const format = (version, author) => `v${version} — ${author}`;
  footer.textContent = format(fallbackVersion, fallbackAuthor);

  if (!cockpit || typeof cockpit.file !== "function") return;

  cockpit
    .file("/usr/share/cockpit/scheduling_exec/manifest.json")
    .read()
    .then((content) => {
      const manifest = JSON.parse(content);
      const version = manifest["x-plugin-version"] || fallbackVersion;
      const author = manifest["x-author"] || fallbackAuthor;
      footer.textContent = format(version, author);
    })
    .catch(() => {
      // Mantém fallback
    });
}

function initEventHandlers() {
  if (eventHandlersBound) return;
  eventHandlersBound = true;

  const scriptForm = document.getElementById("script-form");
  if (scriptForm) {
    scriptForm.addEventListener("submit", function (e) {
      e.preventDefault();

      const scriptName = document.getElementById("script-name").value;
      const scriptContent = document.getElementById("script-content").value;

      if (!scriptName.endsWith(".sh")) {
        showError("O nome do script deve terminar com .sh");
        return;
      }

      showLoading(true);

      const action = currentEditingScript ? "update" : "create";

      cockpit
        .spawn(
          [
            "/usr/share/cockpit/scheduling_exec/scripts/save-script.sh",
            action,
            scriptName,
          ],
          { err: "message" }
        )
        .input(scriptContent)
        .then(() => {
          showLoading(false);
          closeScriptModal();
          loadScripts();
        })
        .catch((error) => {
          showLoading(false);
          showError("Erro ao salvar script: " + error.message);
        });
    });
  }

  const cronForm = document.getElementById("cron-form");
  if (cronForm) {
    cronForm.addEventListener("submit", function (e) {
      e.preventDefault();

      const scriptName = document.getElementById("cron-script-name").value;
      if (!scriptName) {
        showError("Selecione um script para criar o agendamento");
        return;
      }

      const minute = document.getElementById("cron-minute").value;
      const hour = document.getElementById("cron-hour").value;
      const day = document.getElementById("cron-day").value;
      const month = document.getElementById("cron-month").value;
      const weekday = document.getElementById("cron-weekday").value;

      const cronExpression = `${minute} ${hour} ${day} ${month} ${weekday}`;

      showLoading(true);

      cockpit
        .spawn([
          "/usr/share/cockpit/scheduling_exec/scripts/set-cron.sh",
          scriptName,
          cronExpression,
        ])
        .then(() => {
          showLoading(false);
          loadScripts();
          loadCronSchedules(scriptName);
        })
        .catch((error) => {
          showLoading(false);
          showError("Erro ao configurar agendamento: " + error.message);
        });
    });
  }

  const envForm = document.getElementById("env-form");
  if (envForm) {
    envForm.addEventListener("submit", function (e) {
      e.preventDefault();

      const envContent = document.getElementById("env-content").value;
      showLoading(true);

      cockpit
        .spawn(["/usr/share/cockpit/scheduling_exec/scripts/save-env.sh"], {
          err: "message",
        })
        .input(envContent)
        .then(() => {
          showLoading(false);
          closeEnvModal();
        })
        .catch((error) => {
          showLoading(false);
          showError("Erro ao salvar .env: " + formatCockpitError(error));
        });
    });
  }

  const scriptEnvForm = document.getElementById("script-env-form");
  if (scriptEnvForm) {
    scriptEnvForm.addEventListener("submit", function (e) {
      e.preventDefault();

      const scriptName = currentScriptEnv;
      const envContent = document.getElementById("script-env-content").value;

      if (!scriptName) {
        showError("Nenhum script selecionado para variáveis");
        return;
      }

      showLoading(true);

      cockpit
        .spawn(
          [
            "/usr/share/cockpit/scheduling_exec/scripts/save-script-env.sh",
            scriptName,
          ],
          {
            err: "message",
          }
        )
        .input(envContent)
        .then(() => {
          showLoading(false);
          closeScriptEnvModal();
        })
        .catch((error) => {
          showLoading(false);
          showError(
            "Erro ao salvar variáveis do script: " + formatCockpitError(error)
          );
        });
    });
  }

  const sudoForm = document.getElementById("sudo-form");
  if (sudoForm) {
    sudoForm.addEventListener("submit", function (e) {
      e.preventDefault();

      const scriptName = currentSudoScript;
      const passwordInput = document.getElementById("sudo-password");
      const password = passwordInput ? passwordInput.value : "";

      if (!scriptName) {
        showError("Nenhum script selecionado para executar como admin");
        return;
      }

      if (!password) {
        showError("Informe a senha do sudo");
        return;
      }

      closeSudoModal();
      executeScript(scriptName, { sudoPassword: password });
    });
  }

  // Fechar modais ao clicar fora deles
  window.addEventListener("click", function (event) {
    const scriptModal = document.getElementById("scriptModal");
    const cronModal = document.getElementById("cronModal");
    const importModal = document.getElementById("importModal");
    const envModal = document.getElementById("envModal");
    const logModal = document.getElementById("logModal");
    const sudoModal = document.getElementById("sudoModal");
    const scriptEnvModal = document.getElementById("scriptEnvModal");

    if (event.target === scriptModal) closeScriptModal();
    if (event.target === cronModal) closeCronModal();
    if (event.target === importModal) closeImportModal();
    if (event.target === envModal) closeEnvModal();
    if (event.target === logModal) closeLogModal();
    if (event.target === sudoModal) closeSudoModal();
    if (event.target === scriptEnvModal) closeScriptEnvModal();

    // Fecha dropdown de ações ao clicar fora
    const insideRowActions =
      event.target &&
      typeof event.target.closest === "function" &&
      event.target.closest(".js-row-actions");
    if (!insideRowActions) closeAllRowActionsMenus();
  });

  // Atualiza preview de variáveis no modal de script
  const scriptNameInput = document.getElementById("script-name");
  if (scriptNameInput) {
    let t = null;
    scriptNameInput.addEventListener("input", function () {
      setScriptModalPath(scriptNameInput.value.trim());
      if (t) clearTimeout(t);
      t = setTimeout(() => {
        const name = scriptNameInput.value.trim();
        if (name && name.endsWith(".sh")) loadScriptModalEnvs(name);
        else loadScriptModalEnvs(null);
      }, 250);
    });
  }

  const scriptContentInput = document.getElementById("script-content");
  if (scriptContentInput) {
    scriptContentInput.addEventListener("input", function () {
      refreshScriptModalVarsSummary();
    });
  }
}

function setCronScriptSelectVisible(visible) {
  const group = document.getElementById("cron-script-select-group");
  if (group) group.style.display = visible ? "block" : "none";
}

function clearCronExistingList() {
  const tbody = document.getElementById("cron-existing-body");
  if (tbody) tbody.innerHTML = "";
  const empty = document.getElementById("cron-existing-empty");
  if (empty) empty.style.display = "block";
  const wrap = document.getElementById("cron-existing-table-wrap");
  if (wrap) wrap.style.display = "none";
}

function renderCronExistingList(items) {
  const tbody = document.getElementById("cron-existing-body");
  const empty = document.getElementById("cron-existing-empty");
  const wrap = document.getElementById("cron-existing-table-wrap");
  if (!tbody || !empty || !wrap) return;

  tbody.innerHTML = "";

  if (!items || items.length === 0) {
    empty.style.display = "block";
    wrap.style.display = "none";
    return;
  }

  empty.style.display = "none";
  wrap.style.display = "block";

  items.forEach((item) => {
    const tr = document.createElement("tr");
    tr.setAttribute("role", "row");
    tr.innerHTML = `
      <td role="cell" data-label="Script"><strong>${escapeHtml(
        item.script || "-"
      )}</strong></td>
      <td role="cell" data-label="Expressão"><code>${escapeHtml(
        item.expression || ""
      )}</code></td>
      <td role="cell" data-label="Comando"><small><code>${escapeHtml(
        item.command || ""
      )}</code></small></td>
    `;
    tbody.appendChild(tr);
  });
}

function loadCronSchedules(scriptName) {
  clearCronExistingList();

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
      renderCronExistingList(items);
      return items;
    })
    .catch((error) => {
      showError("Erro ao carregar agendamentos: " + formatCockpitError(error));
      renderCronExistingList([]);
      return [];
    });
}

function loadCronScriptsSelect() {
  const select = document.getElementById("cron-script-select");
  if (!select) return Promise.resolve();

  // Mantém a primeira option (placeholder)
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
      showError("Erro ao carregar scripts: " + formatCockpitError(error));
    });
}

function onCronScriptSelectChange() {
  const select = document.getElementById("cron-script-select");
  const hidden = document.getElementById("cron-script-name");
  const scriptName = select ? select.value : "";

  if (hidden) hidden.value = scriptName;

  if (!scriptName) {
    loadCronSchedules(null);
    return;
  }

  loadCronSchedules(scriptName);
}

function openCronManagerModal() {
  cronModalMode = "global";

  const hidden = document.getElementById("cron-script-name");
  if (hidden) hidden.value = "";

  setCronScriptSelectVisible(true);

  document.getElementById("cron-minute").value = "*";
  document.getElementById("cron-hour").value = "*";
  document.getElementById("cron-day").value = "*";
  document.getElementById("cron-month").value = "*";
  document.getElementById("cron-weekday").value = "*";

  const select = document.getElementById("cron-script-select");
  if (select) select.value = "";

  document.getElementById("cronModal").style.display = "block";

  loadCronScriptsSelect().then(() => {
    const select2 = document.getElementById("cron-script-select");
    if (select2) select2.value = "";
  });

  loadCronSchedules(null);
}

// Função para mostrar mensagens de erro
function showError(message) {
  const errorDiv = document.getElementById("error-message");
  const errorText = document.getElementById("error-text");
  errorText.textContent = message;
  errorDiv.style.display = "block";
  setTimeout(() => {
    errorDiv.style.display = "none";
  }, 15000);
}

function formatCockpitError(error) {
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
  if (typeof error.signal !== "undefined") {
    parts.push(`signal=${String(error.signal)}`);
  }

  if (parts.length > 0) return parts.join(" | ");
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function prettyScriptPath(scriptPath, scriptName) {
  const raw = (scriptPath && String(scriptPath)) || "";
  const safeName = scriptName ? String(scriptName) : "";

  if (!raw) return `~/scripts/${safeName}`;

  // Caso padrão: .../scripts/<nome>
  const scriptsMatch = raw.match(/\/scripts\/([^/]+)$/);
  if (scriptsMatch) return `~/scripts/${scriptsMatch[1]}`;

  // Abrevia /home/<user>/... para ~/...
  const homeMatch = raw.match(/^\/home\/[^/]+\/(.+)$/);
  if (homeMatch) return `~/${homeMatch[1]}`;

  // Abrevia /root/... para ~/...
  if (raw.startsWith("/root/")) return `~/${raw.slice("/root/".length)}`;

  return raw;
}

// Função para mostrar loading
function showLoading(show) {
  document.getElementById("loading").style.display = show ? "block" : "none";
}

function showImportLoading(show) {
  document.getElementById("import-loading").style.display = show
    ? "block"
    : "none";
}

function showImportEmpty(show) {
  document.getElementById("import-empty").style.display = show
    ? "block"
    : "none";
}

function showImportTable(show) {
  document.getElementById("import-table-wrap").style.display = show
    ? "block"
    : "none";
}

// Função para formatar datas
function formatDate(timestamp) {
  if (!timestamp || timestamp === "-") return "-";
  const date = new Date(timestamp * 1000);
  return date.toLocaleString("pt-BR");
}

// Função para calcular próxima execução do cron
function getNextCronExecution(cronExpression) {
  if (!cronExpression || cronExpression === "-") return "-";
  // Simplificação - em produção usar biblioteca como cron-parser
  return "Agendado: " + cronExpression;
}

// Carregar lista de scripts
function loadScripts() {
  showLoading(true);

  cockpit
    .spawn(["/usr/share/cockpit/scheduling_exec/scripts/list-scripts.sh"])
    .then((output) => {
      showLoading(false);
      const scripts = JSON.parse(output);
      allScripts = scripts; // Atualizar cache global
      updateStatCards(scripts); // Atualizar cards de estatísticas
      applyFilters(); // Aplicar filtros e renderizar
    })
    .catch((error) => {
      showLoading(false);
      showError("Erro ao carregar scripts: " + error.message);
    });
}

// Renderizar tabela de scripts
function renderScripts(scripts) {
  const tbody = document.getElementById("scripts-body");
  tbody.innerHTML = "";

  if (scripts.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8">
          <div class="pf-c-empty-state pf-m-sm">
            <div class="pf-c-empty-state__content">
              <h2 class="pf-c-title pf-m-lg">Nenhum script encontrado</h2>
              <div class="pf-c-empty-state__body">
                Crie seu primeiro script personalizado para começar!
              </div>
            </div>
          </div>
        </td>
      </tr>`;
    return;
  }

  scripts.forEach((script) => {
    const row = document.createElement("tr");
    row.setAttribute("role", "row");

    const scriptName = script.name;
    const safeId = makeSafeId(scriptName) || "script";
    const menuId = `row-actions-${safeId}`;
    const scriptPath = script.path || `~/scripts/${scriptName}`;
    const prettyPath = prettyScriptPath(scriptPath, scriptName);

    const successRate =
      script.total_executions > 0
        ? (
            (script.successful_executions / script.total_executions) *
            100
          ).toFixed(1)
        : "-";

    row.innerHTML = `
      <td role="cell" data-label="Nome do Script">
        <strong>${escapeHtml(scriptName)}</strong>
        <div><small><code title="${escapeHtml(scriptPath)}">${escapeHtml(
      prettyPath
    )}</code></small></div>
      </td>
      <td role="cell" data-label="Próxima Execução">
        ${getNextCronExecution(script.cron_expression)}
      </td>
      <td role="cell" data-label="Última Execução">
        ${formatDate(script.last_execution)}
      </td>
      <td role="cell" data-label="Criado Em">
        ${formatDate(script.created_at)}
      </td>
      <td role="cell" data-label="Atualizado Em">
        ${formatDate(script.updated_at)}
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
            <button
              class="pf-c-dropdown__toggle pf-m-plain js-row-actions-toggle"
              type="button"
              aria-label="Ações"
              aria-expanded="false"
              data-menu-id="${escapeHtml(menuId)}"
              onclick="toggleRowActionsMenu('${escapeHtml(menuId)}')"
              title="Ações"
            >
              &#8942;
            </button>
            <ul
              class="pf-c-dropdown__menu js-row-actions-menu"
              id="${escapeHtml(menuId)}"
              hidden
            >
              <li>
                <button class="pf-c-dropdown__menu-item" type="button" onclick="closeAllRowActionsMenus(); executeScript('${escapeHtml(
                  scriptName
                )}');">Executar</button>
              </li>
              <li>
                <button class="pf-c-dropdown__menu-item" type="button" onclick="closeAllRowActionsMenus(); openSudoModal('${escapeHtml(
                  scriptName
                )}');">Executar (admin)</button>
              </li>
              <li>
                <button class="pf-c-dropdown__menu-item" type="button" onclick="closeAllRowActionsMenus(); openScriptEnvModal('${escapeHtml(
                  scriptName
                )}');">Variáveis (script)</button>
              </li>
              <li>
                <button class="pf-c-dropdown__menu-item" type="button" onclick="closeAllRowActionsMenus(); openLogModal('${escapeHtml(
                  scriptName
                )}');">Logs</button>
              </li>
              <li>
                <button class="pf-c-dropdown__menu-item" type="button" onclick="closeAllRowActionsMenus(); editScript('${escapeHtml(
                  scriptName
                )}');">Editar</button>
              </li>
              <li>
                <button class="pf-c-dropdown__menu-item" type="button" onclick="closeAllRowActionsMenus(); openCronModal('${escapeHtml(
                  scriptName
                )}');">Agendar</button>
              </li>
              <li>
                <button class="pf-c-dropdown__menu-item" type="button" onclick="closeAllRowActionsMenus(); deleteScript('${escapeHtml(
                  scriptName
                )}');">Excluir</button>
              </li>
            </ul>
          </div>
        </div>
      </td>
    `;

    tbody.appendChild(row);
  });
}

function openScriptEnvModal(scriptName) {
  currentScriptEnv = scriptName;

  const title = document.getElementById("script-env-title");
  if (title) title.textContent = `Variáveis do script: ${scriptName}`;

  const textarea = document.getElementById("script-env-content");
  if (textarea) textarea.value = "";

  const modal = document.getElementById("scriptEnvModal");
  if (modal) modal.style.display = "block";

  loadScriptEnvFile(scriptName);
}

function closeScriptEnvModal() {
  const modal = document.getElementById("scriptEnvModal");
  if (modal) modal.style.display = "none";
  currentScriptEnv = null;

  const textarea = document.getElementById("script-env-content");
  if (textarea) textarea.value = "";
}

function loadScriptEnvFile(scriptName) {
  const textarea = document.getElementById("script-env-content");
  if (!textarea) return;

  showLoading(true);
  cockpit
    .spawn(
      [
        "/usr/share/cockpit/scheduling_exec/scripts/get-script-env.sh",
        scriptName,
      ],
      {
        err: "message",
      }
    )
    .then((content) => {
      showLoading(false);
      textarea.value = content || "";
    })
    .catch((error) => {
      showLoading(false);
      showError(
        "Erro ao carregar variáveis do script: " + formatCockpitError(error)
      );
      textarea.value = "";
    });
}

function openSudoModal(scriptName) {
  currentSudoScript = scriptName;

  const title = document.getElementById("sudo-title");
  if (title) title.textContent = `Executar como admin: ${scriptName}`;

  const password = document.getElementById("sudo-password");
  if (password) password.value = "";

  const modal = document.getElementById("sudoModal");
  if (modal) modal.style.display = "block";

  if (password && typeof password.focus === "function") {
    setTimeout(() => password.focus(), 0);
  }
}

function closeSudoModal() {
  const modal = document.getElementById("sudoModal");
  if (modal) modal.style.display = "none";
  currentSudoScript = null;

  const password = document.getElementById("sudo-password");
  if (password) password.value = "";
}

// ===== Importação de scripts =====
function openImportModal() {
  document.getElementById("importModal").style.display = "block";
  loadImportCandidates();
}

function closeImportModal() {
  document.getElementById("importModal").style.display = "none";
  importCandidates = [];
  const tbody = document.getElementById("import-body");
  if (tbody) tbody.innerHTML = "";
}

function renderImportCandidates(candidates) {
  const tbody = document.getElementById("import-body");
  tbody.innerHTML = "";

  candidates.forEach((c, idx) => {
    const tr = document.createElement("tr");
    tr.setAttribute("role", "row");
    tr.innerHTML = `
      <td role="cell" class="pf-m-fit-content" data-label="Selecionar">
        <input type="checkbox" id="import-check-${idx}" />
      </td>
      <td role="cell" data-label="Nome"><strong>${c.name}</strong></td>
      <td role="cell" data-label="Caminho"><code>${c.path}</code></td>
    `;
    tbody.appendChild(tr);
  });
}

function loadImportCandidates() {
  showImportLoading(true);
  showImportEmpty(false);
  showImportTable(false);

  cockpit
    .spawn(["/usr/share/cockpit/scheduling_exec/scripts/scan-user-scripts.sh"])
    .then((output) => {
      showImportLoading(false);
      const candidates = JSON.parse(output);
      importCandidates = candidates;

      if (!candidates || candidates.length === 0) {
        showImportEmpty(true);
        return;
      }

      renderImportCandidates(candidates);
      showImportTable(true);
    })
    .catch((error) => {
      showImportLoading(false);
      showError("Erro ao buscar scripts: " + error.message);
      showImportEmpty(true);
    });
}

// ===== Variáveis de ambiente (.env) =====
function openEnvModal() {
  const modal = document.getElementById("envModal");
  if (modal) modal.style.display = "block";
  loadEnvFile();
}

function showLogLoading(show) {
  const el = document.getElementById("log-loading");
  if (el) el.style.display = show ? "block" : "none";
}
let currentLogScript = null;

function openLogModal(scriptName) {
  currentLogScript = scriptName;

  const title = document.getElementById("log-title");
  if (title) title.textContent = `Logs: ${scriptName}`;

  const textarea = document.getElementById("log-content");
  if (textarea) textarea.value = "";

  const modal = document.getElementById("logModal");
  if (modal) modal.style.display = "block";

  loadScriptLog(scriptName);
}

function closeLogModal() {
  const modal = document.getElementById("logModal");
  if (modal) modal.style.display = "none";
  currentLogScript = null;

  const textarea = document.getElementById("log-content");
  if (textarea) textarea.value = "";
}

function loadScriptLog(scriptName) {
  const textarea = document.getElementById("log-content");
  if (!textarea) return;

  showLogLoading(true);
  cockpit
    .spawn([
      "/usr/share/cockpit/scheduling_exec/scripts/get-script-log.sh",
      scriptName,
      "400",
    ])
    .then((content) => {
      showLogLoading(false);
      textarea.value = content || "";
    })
    .catch((error) => {
      showLogLoading(false);
      showError("Erro ao carregar logs: " + formatCockpitError(error));
      textarea.value = "";
    });
}

function closeEnvModal() {
  const modal = document.getElementById("envModal");
  if (modal) modal.style.display = "none";

  const textarea = document.getElementById("env-content");
  if (textarea) textarea.value = "";
}

function loadEnvFile() {
  const textarea = document.getElementById("env-content");
  if (!textarea) return;

  showLoading(true);
  cockpit
    .spawn(["/usr/share/cockpit/scheduling_exec/scripts/get-env.sh"], {
      err: "message",
    })
    .then((content) => {
      showLoading(false);
      textarea.value = content || "";
    })
    .catch((error) => {
      showLoading(false);
      showError("Erro ao carregar .env: " + formatCockpitError(error));
      textarea.value = "";
    });
}

function importSelectedScripts() {
  const selected = [];
  importCandidates.forEach((c, idx) => {
    const checkbox = document.getElementById(`import-check-${idx}`);
    if (checkbox && checkbox.checked) selected.push(c);
  });

  if (selected.length === 0) {
    showError("Selecione pelo menos um script para importar");
    return;
  }

  showImportLoading(true);

  // Importa em série para manter simples
  let chain = Promise.resolve();
  selected.forEach((c) => {
    chain = chain.then(() =>
      cockpit.spawn([
        "/usr/share/cockpit/scheduling_exec/scripts/import-user-script.sh",
        c.path,
      ])
    );
  });

  chain
    .then(() => {
      showImportLoading(false);
      closeImportModal();
      loadScripts();
    })
    .catch((error) => {
      showImportLoading(false);
      showError("Erro ao importar scripts: " + error.message);
    });
}

// Abrir modal de criação
function openCreateModal() {
  currentEditingScript = null;
  document.getElementById("modal-title").textContent = "Novo Script";
  document.getElementById("script-name").value = "";
  document.getElementById("script-name").disabled = false;
  document.getElementById("script-content").value =
    '#!/bin/bash\n\n# Seu script aqui\necho "Executando script..."\n';
  resetScriptModalEnvState();
  setScriptModalPath(null);
  document.getElementById("scriptModal").style.display = "block";

  // Carrega o .env global para referência mesmo no modo criação
  loadScriptModalEnvs(null);
}

// Fechar modal de script
function closeScriptModal() {
  document.getElementById("scriptModal").style.display = "none";
  currentEditingScript = null;
  resetScriptModalEnvState();
}

// Editar script
function editScript(scriptName) {
  showLoading(true);
  currentEditingScript = scriptName;

  cockpit
    .spawn([
      "/usr/share/cockpit/scheduling_exec/scripts/get-script.sh",
      scriptName,
    ])
    .then((content) => {
      showLoading(false);
      document.getElementById("modal-title").textContent =
        "Editar Script: " + scriptName;
      document.getElementById("script-name").value = scriptName;
      document.getElementById("script-name").disabled = true;
      document.getElementById("script-content").value = content;
      resetScriptModalEnvState();
      setScriptModalPath(scriptName);
      document.getElementById("scriptModal").style.display = "block";

      loadScriptModalEnvs(scriptName);
    })
    .catch((error) => {
      showLoading(false);
      showError("Erro ao carregar script: " + error.message);
    });
}

// Excluir script
function deleteScript(scriptName) {
  if (
    !confirm(
      `Tem certeza que deseja excluir o script "${scriptName}"?\nEsta ação não pode ser desfeita.`
    )
  ) {
    return;
  }

  showLoading(true);

  cockpit
    .spawn([
      "/usr/share/cockpit/scheduling_exec/scripts/delete-script.sh",
      scriptName,
    ])
    .then(() => {
      showLoading(false);
      loadScripts();
    })
    .catch((error) => {
      showLoading(false);
      showError("Erro ao excluir script: " + error.message);
    });
}

// Executar script
function executeScript(scriptName, options) {
  const sudoPassword =
    options && typeof options.sudoPassword === "string"
      ? options.sudoPassword
      : "";

  if (!sudoPassword) {
    if (!confirm(`Executar o script "${scriptName}" agora?`)) {
      return;
    }
  }

  showLoading(true);

  const args = ["/usr/share/cockpit/scheduling_exec/scripts/execute-script.sh"];
  if (sudoPassword) args.push("--sudo");
  args.push(scriptName);

  let proc = cockpit.spawn(args);
  if (sudoPassword) {
    // Envia a senha via stdin (uma vez para a execução).
    proc = proc.input(sudoPassword + "\n");
  }

  proc
    .then((raw) => {
      showLoading(false);

      let result = null;
      try {
        result = JSON.parse(raw);
      } catch {
        // Fallback: caso algo fora do esperado chegue aqui
        alert("Saída:\n" + raw);
        loadScripts();
        return;
      }

      const exitCode = Number(result.exit_code ?? 0);
      const output = typeof result.output === "string" ? result.output : "";

      if (exitCode === 0) {
        alert(
          (sudoPassword
            ? "Script executado como admin com sucesso!"
            : "Script executado com sucesso!") +
            "\n\nSaída:\n" +
            output
        );
      } else {
        alert(
          `${
            sudoPassword
              ? "Script como admin finalizou com erro"
              : "Script finalizou com erro"
          } (exit ${exitCode}).\n\nSaída:\n${output}`
        );
      }
      loadScripts(); // Recarregar para atualizar estatísticas
    })
    .catch((error) => {
      showLoading(false);
      showError("Erro ao executar script: " + formatCockpitError(error));
    });
}

// Abrir modal de configuração de cron
function openCronModal(scriptName) {
  cronModalMode = "script";

  document.getElementById("cron-script-name").value = scriptName;

  setCronScriptSelectVisible(false);

  // Defaults
  document.getElementById("cron-minute").value = "*";
  document.getElementById("cron-hour").value = "*";
  document.getElementById("cron-day").value = "*";
  document.getElementById("cron-month").value = "*";
  document.getElementById("cron-weekday").value = "*";

  document.getElementById("cronModal").style.display = "block";

  // Lista agendamentos existentes e preenche com o primeiro, se houver
  loadCronSchedules(scriptName).then((items) => {
    if (!items || items.length === 0) return;

    const expr = String(items[0].expression || "").trim();
    if (!expr) return;

    const parts = expr.split(" ");
    if (parts.length >= 5) {
      document.getElementById("cron-minute").value = parts[0];
      document.getElementById("cron-hour").value = parts[1];
      document.getElementById("cron-day").value = parts[2];
      document.getElementById("cron-month").value = parts[3];
      document.getElementById("cron-weekday").value = parts[4];
    }
  });
}

// Fechar modal de cron
function closeCronModal() {
  document.getElementById("cronModal").style.display = "none";
  cronModalMode = "script";

  const hidden = document.getElementById("cron-script-name");
  if (hidden) hidden.value = "";

  const select = document.getElementById("cron-script-select");
  if (select) select.value = "";

  setCronScriptSelectVisible(false);
  clearCronExistingList();
}

// Aplicar preset de cron
function applyCronPreset() {
  const preset = document.getElementById("cron-preset").value;
  if (preset) {
    const parts = preset.split(" ");
    document.getElementById("cron-minute").value = parts[0];
    document.getElementById("cron-hour").value = parts[1];
    document.getElementById("cron-day").value = parts[2];
    document.getElementById("cron-month").value = parts[3];
    document.getElementById("cron-weekday").value = parts[4];
  }
}

// Remover agendamento
function removeCron() {
  const scriptName = document.getElementById("cron-script-name").value;

  if (!scriptName) {
    showError("Selecione um script para remover agendamentos");
    return;
  }

  if (!confirm(`Remover TODOS os agendamentos do script "${scriptName}"?`)) {
    return;
  }

  showLoading(true);

  cockpit
    .spawn([
      "/usr/share/cockpit/scheduling_exec/scripts/remove-cron.sh",
      scriptName,
    ])
    .then(() => {
      showLoading(false);
      loadScripts();
      loadCronSchedules(scriptName);
    })
    .catch((error) => {
      showLoading(false);
      showError("Erro ao remover agendamento: " + error.message);
    });
}

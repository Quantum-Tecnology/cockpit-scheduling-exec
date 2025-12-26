// Inicializar conexão com Cockpit
const cockpit = window.cockpit;

let currentEditingScript = null;
let importCandidates = [];
let eventHandlersBound = false;
let currentSudoScript = null;
let currentScriptEnv = null;

function updatePluginFooter() {
  const footer = document.getElementById("plugin-footer");
  if (!footer) return;

  const fallbackVersion = "1.2.2";
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
          closeCronModal();
          loadScripts();
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
  });
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
      renderScripts(scripts);
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
        <div style="display: flex; gap: 4px; justify-content: center;">
          <button class="pf-c-button pf-m-primary pf-m-small" type="button" onclick="executeScript('${
            script.name
          }')">Executar</button>
          <button class="pf-c-button pf-m-secondary pf-m-small" type="button" onclick="openSudoModal('${
            script.name
          }')">Executar (admin)</button>
          <button class="pf-c-button pf-m-tertiary pf-m-small" type="button" onclick="openScriptEnvModal('${
            script.name
          }')">Variáveis (script)</button>
          <button class="pf-c-button pf-m-secondary pf-m-small" type="button" onclick="openLogModal('${
            script.name
          }')">Logs</button>
          <button class="pf-c-button pf-m-secondary pf-m-small" type="button" onclick="editScript('${
            script.name
          }')">Editar</button>
          <button class="pf-c-button pf-m-tertiary pf-m-small" type="button" onclick="openCronModal('${
            script.name
          }')">Agendar</button>
          <button class="pf-c-button pf-m-danger pf-m-small" type="button" onclick="deleteScript('${
            script.name
          }')">Excluir</button>
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
  document.getElementById("scriptModal").style.display = "block";
}

// Fechar modal de script
function closeScriptModal() {
  document.getElementById("scriptModal").style.display = "none";
  currentEditingScript = null;
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
      document.getElementById("scriptModal").style.display = "block";
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
  document.getElementById("cron-script-name").value = scriptName;

  // Buscar configuração atual do cron
  cockpit
    .spawn([
      "/usr/share/cockpit/scheduling_exec/scripts/get-cron.sh",
      scriptName,
    ])
    .then((cronExpression) => {
      if (cronExpression.trim()) {
        const parts = cronExpression.trim().split(" ");
        if (parts.length >= 5) {
          document.getElementById("cron-minute").value = parts[0];
          document.getElementById("cron-hour").value = parts[1];
          document.getElementById("cron-day").value = parts[2];
          document.getElementById("cron-month").value = parts[3];
          document.getElementById("cron-weekday").value = parts[4];
        }
      } else {
        // Valores padrão
        document.getElementById("cron-minute").value = "*";
        document.getElementById("cron-hour").value = "*";
        document.getElementById("cron-day").value = "*";
        document.getElementById("cron-month").value = "*";
        document.getElementById("cron-weekday").value = "*";
      }
      document.getElementById("cronModal").style.display = "block";
    })
    .catch(() => {
      // Se não encontrar, usar valores padrão
      document.getElementById("cron-minute").value = "*";
      document.getElementById("cron-hour").value = "*";
      document.getElementById("cron-day").value = "*";
      document.getElementById("cron-month").value = "*";
      document.getElementById("cron-weekday").value = "*";
      document.getElementById("cronModal").style.display = "block";
    });
}

// Fechar modal de cron
function closeCronModal() {
  document.getElementById("cronModal").style.display = "none";
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

  if (!confirm(`Remover agendamento do script "${scriptName}"?`)) {
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
      closeCronModal();
      loadScripts();
    })
    .catch((error) => {
      showLoading(false);
      showError("Erro ao remover agendamento: " + error.message);
    });
}

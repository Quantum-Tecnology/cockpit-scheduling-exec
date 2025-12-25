// Inicializar conexão com Cockpit
const cockpit = window.cockpit;

let currentEditingScript = null;
let importCandidates = [];
let eventHandlersBound = false;

function updatePluginFooter() {
  const footer = document.getElementById("plugin-footer");
  if (!footer) return;

  const fallbackVersion = "1.0.14";
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

  // Fechar modais ao clicar fora deles
  window.addEventListener("click", function (event) {
    const scriptModal = document.getElementById("scriptModal");
    const cronModal = document.getElementById("cronModal");
    const importModal = document.getElementById("importModal");

    if (event.target === scriptModal) closeScriptModal();
    if (event.target === cronModal) closeCronModal();
    if (event.target === importModal) closeImportModal();
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
  }, 5000);
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

    const successRate =
      script.total_executions > 0
        ? (
            (script.successful_executions / script.total_executions) *
            100
          ).toFixed(1)
        : "-";

    row.innerHTML = `
      <td role="cell" data-label="Nome do Script">
        <strong>${script.name}</strong>
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
function executeScript(scriptName) {
  if (!confirm(`Executar o script "${scriptName}" agora?`)) {
    return;
  }

  showLoading(true);

  cockpit
    .spawn([
      "/usr/share/cockpit/scheduling_exec/scripts/execute-script.sh",
      scriptName,
    ])
    .then((output) => {
      showLoading(false);
      alert("Script executado com sucesso!\n\nSaída:\n" + output);
      loadScripts(); // Recarregar para atualizar estatísticas
    })
    .catch((error) => {
      showLoading(false);
      showError("Erro ao executar script: " + error.message);
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

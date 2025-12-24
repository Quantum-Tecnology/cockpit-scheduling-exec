// Inicializar conexão com Cockpit
const cockpit = window.cockpit;

let currentEditingScript = null;

// Função para mostrar mensagens de erro
function showError(message) {
  const errorDiv = document.getElementById("error-message");
  errorDiv.textContent = message;
  errorDiv.style.display = "block";
  setTimeout(() => {
    errorDiv.style.display = "none";
  }, 5000);
}

// Função para mostrar loading
function showLoading(show) {
  document.getElementById("loading").style.display = show ? "block" : "none";
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
    .spawn(["/usr/share/cockpit/scheduling-exec/scripts/list-scripts.sh"])
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
    tbody.innerHTML =
      '<tr><td colspan="8" style="text-align: center; padding: 40px;">Nenhum script encontrado. Crie seu primeiro script!</td></tr>';
    return;
  }

  scripts.forEach((script) => {
    const row = document.createElement("tr");

    const successRate =
      script.total_executions > 0
        ? (
            (script.successful_executions / script.total_executions) *
            100
          ).toFixed(1)
        : "-";

    row.innerHTML = `
            <td><strong>${script.name}</strong></td>
            <td>${getNextCronExecution(script.cron_expression)}</td>
            <td>${formatDate(script.last_execution)}</td>
            <td>${formatDate(script.created_at)}</td>
            <td>${formatDate(script.updated_at)}</td>
            <td>${script.total_executions}</td>
            <td>
                ${script.successful_executions}
                ${
                  script.total_executions > 0
                    ? `<span class="badge badge-success">${successRate}%</span>`
                    : ""
                }
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-primary" onclick="executeScript('${
                      script.name
                    }')" title="Executar agora">▶</button>
                    <button class="btn btn-secondary" onclick="editScript('${
                      script.name
                    }')" title="Editar">✏</button>
                    <button class="btn btn-warning" onclick="openCronModal('${
                      script.name
                    }')" title="Agendar">⏰</button>
                    <button class="btn btn-danger" onclick="deleteScript('${
                      script.name
                    }')" title="Excluir">🗑</button>
                </div>
            </td>
        `;

    tbody.appendChild(row);
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
      "/usr/share/cockpit/scheduling-exec/scripts/get-script.sh",
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

// Salvar script (criar ou editar)
document.getElementById("script-form").addEventListener("submit", function (e) {
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
        "/usr/share/cockpit/scheduling-exec/scripts/save-script.sh",
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
      "/usr/share/cockpit/scheduling-exec/scripts/delete-script.sh",
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
      "/usr/share/cockpit/scheduling-exec/scripts/execute-script.sh",
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
      "/usr/share/cockpit/scheduling-exec/scripts/get-cron.sh",
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

// Salvar configuração de cron
document.getElementById("cron-form").addEventListener("submit", function (e) {
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
      "/usr/share/cockpit/scheduling-exec/scripts/set-cron.sh",
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

// Remover agendamento
function removeCron() {
  const scriptName = document.getElementById("cron-script-name").value;

  if (!confirm(`Remover agendamento do script "${scriptName}"?`)) {
    return;
  }

  showLoading(true);

  cockpit
    .spawn([
      "/usr/share/cockpit/scheduling-exec/scripts/remove-cron.sh",
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

// Fechar modais ao clicar fora deles
window.onclick = function (event) {
  const scriptModal = document.getElementById("scriptModal");
  const cronModal = document.getElementById("cronModal");

  if (event.target === scriptModal) {
    closeScriptModal();
  }
  if (event.target === cronModal) {
    closeCronModal();
  }
};

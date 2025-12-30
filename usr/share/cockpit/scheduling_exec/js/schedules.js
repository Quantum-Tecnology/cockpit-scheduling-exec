/**
 * Schedules Module - Gerenciamento de Agendamentos
 * Funções para cron e agendamentos de tarefas
 */

// Estado
let allSchedules = [];
let editingScheduleId = null;

// Helpers para obter dados de forma segura
function getBackupDirs() {
  return window.backupDirectories || [];
}

function getVMs() {
  return window.allVMs || [];
}

function getScripts() {
  return window.allScripts || [];
}

// ============================================================================
// CARREGAR AGENDAMENTOS
// ============================================================================

async function loadSchedules() {
  console.log("Schedules: Carregando agendamentos do crontab...");

  try {
    // Ler crontab atual
    const result = await cockpit.spawn(["crontab", "-l"], {
      err: "ignore",
      superuser: "try",
    });

    allSchedules = [];
    const lines = result.trim().split("\n");

    for (const line of lines) {
      // Ignorar comentários e linhas vazias
      if (!line || line.startsWith("#")) continue;

      // Parse da linha cron
      const match = line.match(/^(\S+\s+\S+\s+\S+\s+\S+\s+\S+)\s+(.+)$/);
      if (!match) continue;

      const cronExpression = match[1];
      const command = match[2];

      // Identificar tipo baseado no comando
      let type = "custom";
      let target = "";
      let description = "";

      if (command.includes("backup-all-vms.sh")) {
        type = "vm-backup";
        description = "Backup de VMs";
      } else if (command.includes(".sh")) {
        type = "script";
        const scriptMatch = command.match(/([^\/]+\.sh)/);
        target = scriptMatch ? scriptMatch[1] : "";
        description = `Script: ${target}`;
      } else if (command.includes("tar") || command.includes("backup")) {
        type = "backup";
        description = "Backup de arquivos";
      }

      allSchedules.push({
        id: Date.now() + Math.random(),
        type: type,
        target: target,
        description: description || command,
        cronExpression: cronExpression,
        command: command,
        enabled: true,
        lastRun: null,
        nextRun: calculateNextRun(cronExpression),
      });
    }

    console.log(`Schedules: ${allSchedules.length} agendamento(s) carregados`);
    renderSchedulesTable();
    updateSchedulesStats();
  } catch (error) {
    console.error("Schedules: Erro ao carregar agendamentos:", error);
    if (error.toString().includes("no crontab")) {
      console.log("Schedules: Nenhum crontab configurado");
      allSchedules = [];
      renderSchedulesTable();
      updateSchedulesStats();
    } else {
      showAlert("danger", "Erro ao carregar agendamentos: " + error);
    }
  }
}

// ============================================================================
// RENDERIZAR TABELA
// ============================================================================

function renderSchedulesTable() {
  const container = document.getElementById("schedules-table-container");

  if (!container) {
    console.warn("Schedules: Container da tabela não encontrado");
    return;
  }

  if (allSchedules.length === 0) {
    container.innerHTML = `
      <div class="pf-c-empty-state pf-m-sm">
        <div class="pf-c-empty-state__content">
          <i class="fas fa-calendar-alt pf-c-empty-state__icon"></i>
          <h2 class="pf-c-title pf-m-lg">Nenhum agendamento configurado</h2>
          <div class="pf-c-empty-state__body">
            Crie seu primeiro agendamento para automatizar backups, scripts ou VMs.
          </div>
          <button class="pf-c-button pf-m-primary" onclick="openScheduleModal()">
            ➕ Criar Agendamento
          </button>
        </div>
      </div>
    `;
    return;
  }

  const html = `
    <table class="pf-c-table pf-m-grid-md" role="grid">
      <thead>
        <tr role="row">
          <th role="columnheader">Tipo</th>
          <th role="columnheader">Descrição</th>
          <th role="columnheader">Expressão Cron</th>
          <th role="columnheader">Próxima Execução</th>
          <th role="columnheader">Status</th>
          <th role="columnheader" style="width: 150px;">Ações</th>
        </tr>
      </thead>
      <tbody role="rowgroup">
        ${allSchedules
          .map(
            (schedule) => `
          <tr role="row">
            <td role="cell">
              ${
                schedule.type === "backup"
                  ? "📦 Backup"
                  : schedule.type === "vm-backup"
                  ? "💿 VM"
                  : schedule.type === "script"
                  ? "⚡ Script"
                  : "⚙️ Personalizado"
              }
            </td>
            <td role="cell">
              <strong>${escapeHtml(schedule.description)}</strong>
              ${
                schedule.target
                  ? `<br><code style="font-size: 0.85em;">${escapeHtml(
                      schedule.target
                    )}</code>`
                  : ""
              }
            </td>
            <td role="cell"><code>${escapeHtml(
              schedule.cronExpression
            )}</code></td>
            <td role="cell">${schedule.nextRun || "--"}</td>
            <td role="cell">
              <span class="pf-c-badge ${schedule.enabled ? "pf-m-read" : ""}">
                ${schedule.enabled ? "✅ Ativo" : "❌ Inativo"}
              </span>
            </td>
            <td role="cell">
              <div style="display: flex; gap: 0.5rem;">
                <button class="pf-c-button pf-m-secondary pf-m-small"
                        onclick="editSchedule('${schedule.id}')"
                        title="Editar">
                  ✏️
                </button>
                <button class="pf-c-button pf-m-danger pf-m-small"
                        onclick="deleteSchedule('${schedule.id}')"
                        title="Excluir">
                  🗑️
                </button>
              </div>
            </td>
          </tr>
        `
          )
          .join("")}
      </tbody>
    </table>
  `;

  container.innerHTML = html;
}

// ============================================================================
// ESTATÍSTICAS
// ============================================================================

function updateSchedulesStats() {
  const total = allSchedules.length;
  const active = allSchedules.filter((s) => s.enabled).length;
  const inactive = allSchedules.filter((s) => !s.enabled).length;

  // Próxima execução
  const nextRuns = allSchedules
    .filter((s) => s.enabled && s.nextRun)
    .map((s) => s.nextRun)
    .sort();
  const nextRun = nextRuns[0] || "--";

  const totalEl = document.getElementById("schedules-stat-total");
  const activeEl = document.getElementById("schedules-stat-active");
  const inactiveEl = document.getElementById("schedules-stat-inactive");
  const nextEl = document.getElementById("schedules-stat-next");

  if (totalEl) totalEl.textContent = total;
  if (activeEl) activeEl.textContent = active;
  if (inactiveEl) inactiveEl.textContent = inactive;
  if (nextEl) nextEl.textContent = nextRun;
}

// ============================================================================
// CALCULAR PRÓXIMA EXECUÇÃO
// ============================================================================

function calculateNextRun(cronExpression) {
  // Esta é uma implementação básica - idealmente usar biblioteca de parsing de cron
  const parts = cronExpression.split(" ");
  if (parts.length !== 5) return "Formato inválido";

  const [minute, hour, day, month, weekday] = parts;

  // Exemplos simples
  if (cronExpression === "0 2 * * *") return "Diariamente às 02:00";
  if (cronExpression === "0 0 * * 0") return "Domingos à meia-noite";
  if (cronExpression.includes("*/")) {
    const intervalMatch = cronExpression.match(/\*\/(\d+)/);
    if (intervalMatch) {
      const interval = intervalMatch[1];
      if (cronExpression.startsWith("*/")) return `A cada ${interval} minutos`;
      if (cronExpression.includes(" */")) return `A cada ${interval} horas`;
    }
  }

  return `${hour}:${String(minute).padStart(2, "0")}`;
}

// ============================================================================
// MODAL DE AGENDAMENTO
// ============================================================================

function openScheduleModal(scheduleId = null) {
  editingScheduleId = scheduleId;

  const modal = document.getElementById("schedule-modal");
  const backdrop = document.getElementById("schedule-modal-backdrop");
  const title = document.getElementById("schedule-modal-title");

  if (!modal || !backdrop) {
    console.error("Schedules: Modal não encontrado");
    return;
  }

  if (scheduleId) {
    const schedule = allSchedules.find((s) => s.id == scheduleId);
    if (schedule) {
      title.textContent = "✏️ Editar Agendamento";
      document.getElementById("schedule-type").value = schedule.type;
      document.getElementById("schedule-description").value =
        schedule.description;
      document.getElementById("schedule-cron").value = schedule.cronExpression;
      document.getElementById("schedule-enabled").checked = schedule.enabled;
      updateScheduleOptions();
      document.getElementById("schedule-target").value = schedule.target;
    }
  } else {
    title.textContent = "➕ Novo Agendamento";
    const form = document.getElementById("schedule-form");
    if (form) form.reset();
    document.getElementById("schedule-target-group").style.display = "none";
  }

  modal.style.display = "block";
  backdrop.style.display = "block";
}

function closeScheduleModal() {
  document.getElementById("schedule-modal").style.display = "none";
  document.getElementById("schedule-modal-backdrop").style.display = "none";
  editingScheduleId = null;
}

// ============================================================================
// OPÇÕES DE DESTINO
// ============================================================================

function updateScheduleOptions() {
  const type = document.getElementById("schedule-type").value;
  const targetGroup = document.getElementById("schedule-target-group");
  const targetLabel = document.getElementById("schedule-target-label");
  const targetSelect = document.getElementById("schedule-target");

  if (!type) {
    targetGroup.style.display = "none";
    return;
  }

  targetGroup.style.display = "block";
  targetSelect.innerHTML = '<option value="">Selecione...</option>';

  if (type === "backup") {
    targetLabel.textContent = "Diretório de Backup";
    getBackupDirs().forEach((dir) => {
      targetSelect.innerHTML += `<option value="${escapeHtml(
        dir.path
      )}">${escapeHtml(dir.label || dir.path)}</option>`;
    });
  } else if (type === "vm-backup") {
    targetLabel.textContent = "Máquina Virtual";
    targetSelect.innerHTML += '<option value="all">Todas as VMs</option>';
    getVMs().forEach((vm) => {
      targetSelect.innerHTML += `<option value="${escapeHtml(
        vm.name
      )}">${escapeHtml(vm.name)}</option>`;
    });
  } else if (type === "script") {
    targetLabel.textContent = "Script";
    getScripts().forEach((script) => {
      targetSelect.innerHTML += `<option value="${escapeHtml(
        script.path
      )}">${escapeHtml(script.name)}</option>`;
    });
  }
}

// ============================================================================
// SALVAR AGENDAMENTO
// ============================================================================

async function saveSchedule() {
  const type = document.getElementById("schedule-type").value;
  const target = document.getElementById("schedule-target").value;
  const description = document.getElementById("schedule-description").value;
  const cronExpression = document.getElementById("schedule-cron").value;
  const enabled = document.getElementById("schedule-enabled").checked;

  if (!type || !cronExpression) {
    showAlert("warning", "⚠️ Preencha todos os campos obrigatórios");
    return;
  }

  // Construir comando baseado no tipo
  let command = "";
  if (type === "backup") {
    command = `tar -czf /backup/backup-$(date +\\%Y\\%m\\%d-\\%H\\%M\\%S).tar.gz ${target}`;
  } else if (type === "vm-backup") {
    const vmScript = "/usr/local/bin/backup-all-vms.sh";
    command = target === "all" ? vmScript : `${vmScript} ${target}`;
  } else if (type === "script") {
    command = `bash ${target}`;
  }

  try {
    // Ler crontab atual
    let currentCrontab = "";
    try {
      currentCrontab = await cockpit.spawn(["crontab", "-l"], {
        err: "ignore",
        superuser: "try",
      });
    } catch (e) {
      console.log("Schedules: Crontab vazio ou inexistente");
    }

    // Se editando, remover linha antiga
    if (editingScheduleId) {
      const oldSchedule = allSchedules.find((s) => s.id == editingScheduleId);
      if (oldSchedule) {
        const lines = currentCrontab
          .split("\n")
          .filter(
            (line) =>
              line !== `${oldSchedule.cronExpression} ${oldSchedule.command}`
          );
        currentCrontab = lines.join("\n");
      }
    }

    // Adicionar novo agendamento
    const newLine = `${cronExpression} ${command}`;
    const newCrontab = currentCrontab
      ? `${currentCrontab}\n${newLine}`
      : newLine;

    // Salvar crontab
    await cockpit
      .spawn(["crontab", "-"], { superuser: "require" })
      .input(newCrontab);

    showAlert("success", "✅ Agendamento salvo com sucesso!");
    closeScheduleModal();
    await loadSchedules();
  } catch (error) {
    console.error("Schedules: Erro ao salvar agendamento:", error);
    showAlert("danger", "Erro ao salvar agendamento: " + error);
  }
}

// ============================================================================
// EDITAR E EXCLUIR
// ============================================================================

function editSchedule(scheduleId) {
  openScheduleModal(scheduleId);
}

async function deleteSchedule(scheduleId) {
  const schedule = allSchedules.find((s) => s.id == scheduleId);
  if (!schedule) return;

  if (
    !confirm(
      `Deseja realmente excluir o agendamento "${schedule.description}"?`
    )
  ) {
    return;
  }

  try {
    // Ler crontab atual
    const currentCrontab = await cockpit.spawn(["crontab", "-l"], {
      err: "ignore",
      superuser: "try",
    });

    // Remover linha
    const lines = currentCrontab.split("\n").filter((line) => {
      return line !== `${schedule.cronExpression} ${schedule.command}`;
    });

    const newCrontab = lines.join("\n");

    // Salvar crontab
    await cockpit
      .spawn(["crontab", "-"], { superuser: "require" })
      .input(newCrontab);

    showAlert("success", "✅ Agendamento excluído com sucesso!");
    await loadSchedules();
  } catch (error) {
    console.error("Schedules: Erro ao excluir agendamento:", error);
    showAlert("danger", "Erro ao excluir agendamento: " + error);
  }
}

// ============================================================================
// EXPORTAR PARA USO GLOBAL
// ============================================================================

window.allSchedules = allSchedules;
window.loadSchedules = loadSchedules;
window.renderSchedulesTable = renderSchedulesTable;
window.updateSchedulesStats = updateSchedulesStats;
window.calculateNextRun = calculateNextRun;
window.openScheduleModal = openScheduleModal;
window.closeScheduleModal = closeScheduleModal;
window.updateScheduleOptions = updateScheduleOptions;
window.saveSchedule = saveSchedule;
window.editSchedule = editSchedule;
window.deleteSchedule = deleteSchedule;

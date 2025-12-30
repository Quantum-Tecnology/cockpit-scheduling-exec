/**
 * VM Backup Module - Gerenciamento de Backups de VMs
 * Descoberta, backup e gerenciamento de máquinas virtuais
 */

// Constantes
const VM_SCRIPTS_DIR = "/usr/share/cockpit/scheduling_exec/scripts/vm";

// Estado
let allVMs = [];
let selectedVMs = new Set();
let vmBackupConfig = {
  destDir: "/mnt/storage/backups/vm_backups",
  retentionDays: 7,
  verifyChecksum: false,
};

// ============================================================================
// VERIFICAÇÃO DE PERMISSÕES
// ============================================================================

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

    for (const script of scripts) {
      const scriptPath = `${VM_SCRIPTS_DIR}/${script}`;

      try {
        const stat = await cockpit.spawn(["stat", "-c", "%a", scriptPath], {
          err: "ignore",
          superuser: "try",
        });

        const permissions = stat.trim();
        console.log(`VM Backup: ${script} permissões: ${permissions}`);

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

    if (needsFix) {
      console.log("VM Backup: Aplicando permissões automaticamente...");

      try {
        await cockpit.spawn(["bash", "-c", `chmod +x ${VM_SCRIPTS_DIR}/*.sh`], {
          err: "message",
          superuser: "require",
        });

        console.log("VM Backup: ✅ Permissões aplicadas com sucesso!");
        showAlert("success", "✅ Scripts configurados automaticamente!");
      } catch (error) {
        console.error("VM Backup: Erro ao aplicar permissões:", error);
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
  }
}

// ============================================================================
// DESCOBERTA DE VMs
// ============================================================================

async function discoverVMs() {
  console.log("VM Backup: Iniciando descoberta de VMs...");

  const loadingDiv = document.getElementById("vm-discovery-loading");
  const tableContainer = document.getElementById("vm-table-container");
  const emptyState = document.getElementById("vm-empty-state");
  const discoverBtn = document.getElementById("discover-vms-btn");

  try {
    loadingDiv.style.display = "block";
    tableContainer.style.display = "none";
    emptyState.style.display = "none";
    discoverBtn.disabled = true;

    window.addGlobalLog("🔍 Procurando VMs no sistema...");

    try {
      await cockpit.spawn(["which", "virsh"], { err: "ignore" });
    } catch (error) {
      throw new Error(
        "virsh não encontrado. Instale o pacote libvirt-clients."
      );
    }

    const scriptPath = `${VM_SCRIPTS_DIR}/discover-vms.sh`;
    const result = await cockpit.spawn(["bash", scriptPath], {
      err: "message",
      superuser: "try",
      environ: ["DEBUG=true"],
    });

    console.log("VM Backup: Resultado bruto:", result);
    allVMs = JSON.parse(result);

    console.log("VM Backup: VMs descobertas:", allVMs.length);
    window.addGlobalLog(`✅ ${allVMs.length} VM(s) encontrada(s)`);

    renderVMTable();

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
    window.addGlobalLog(`❌ Erro: ${errorMsg}`);

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

// ============================================================================
// DIAGNÓSTICO
// ============================================================================

async function diagnoseVMs() {
  console.log("VM Backup: Iniciando diagnóstico...");

  const diagnoseBtn = document.getElementById("diagnose-vms-btn");

  try {
    diagnoseBtn.disabled = true;
    showAlert("info", "🩺 Executando diagnóstico...", 0);
    window.addGlobalLog("========================================");
    window.addGlobalLog("🩺 INICIANDO DIAGNÓSTICO");
    window.addGlobalLog("========================================");

    const scriptPath = `${VM_SCRIPTS_DIR}/diagnose-vms.sh`;

    const result = await cockpit.spawn(["bash", scriptPath], {
      err: "out",
      superuser: "try",
    });

    const lines = result.split("\n");
    lines.forEach((line) => {
      if (line.trim()) {
        window.addGlobalLog(line);
      }
    });

    window.addGlobalLog("========================================");
    window.addGlobalLog("✅ DIAGNÓSTICO CONCLUÍDO");
    window.addGlobalLog("========================================");

    showAlert("success", "✅ Diagnóstico concluído! Veja o log abaixo.");
  } catch (error) {
    console.error("VM Backup: Erro no diagnóstico:", error);
    const errorMsg = error?.message || error?.toString() || "Erro desconhecido";
    showAlert("danger", `❌ Erro no diagnóstico: ${errorMsg}`);
    window.addGlobalLog(`❌ ERRO: ${errorMsg}`);
  } finally {
    diagnoseBtn.disabled = false;
  }
}

// ============================================================================
// RENDERIZAÇÃO
// ============================================================================

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

// ============================================================================
// SELEÇÃO
// ============================================================================

function toggleVMSelection(vmName, selected) {
  if (selected) {
    selectedVMs.add(vmName);
  } else {
    selectedVMs.delete(vmName);
  }

  updateVMStats();

  const backupBtn = document.getElementById("backup-selected-vms-btn");
  backupBtn.disabled = selectedVMs.size === 0;
}

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

function updateVMStats() {
  const totalVMs = allVMs.length;
  const selectedCount = selectedVMs.size;

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

// ============================================================================
// BACKUP
// ============================================================================

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
    window.clearGlobalLog();
    window.addGlobalLog("========================================");
    window.addGlobalLog("🚀 INICIANDO BACKUP DE VMs");
    window.addGlobalLog("========================================");
    window.addGlobalLog(`VMs selecionadas: ${selectedVMs.size}`);
    window.addGlobalLog(`Destino: ${vmBackupConfig.destDir}`);
    window.addGlobalLog(`Retenção: ${vmBackupConfig.retentionDays} dias`);
    window.addGlobalLog(
      `Verificar checksum: ${vmBackupConfig.verifyChecksum ? "Sim" : "Não"}`
    );
    window.addGlobalLog("========================================");
    window.addGlobalLog("");

    const selectedVMsList = Array.from(selectedVMs).join(",");
    const scriptPath = `${VM_SCRIPTS_DIR}/backup-all-vms.sh`;

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

    proc.stream((data) => {
      const lines = data.split("\n");
      lines.forEach((line) => {
        if (line.trim()) {
          window.addGlobalLog(line);
        }
      });
    });

    const result = await proc;

    console.log("VM Backup: Resultado:", result);

    const lines = result.trim().split("\n");
    const jsonLine = lines[lines.length - 1];

    try {
      const summary = JSON.parse(jsonLine);

      window.addGlobalLog("");
      window.addGlobalLog("========================================");
      window.addGlobalLog("✅ BACKUP CONCLUÍDO");
      window.addGlobalLog("========================================");
      window.addGlobalLog(`Total de VMs: ${summary.summary.total_vms}`);
      window.addGlobalLog(`Sucesso: ${summary.summary.success_count}`);
      window.addGlobalLog(`Falhas: ${summary.summary.failed_count}`);
      window.addGlobalLog(
        `Tamanho total: ${formatSize(summary.summary.total_size)}`
      );
      window.addGlobalLog(`Tempo total: ${summary.summary.total_duration}s`);
      window.addGlobalLog(
        `Arquivos antigos removidos: ${summary.summary.deleted_count}`
      );
      window.addGlobalLog("========================================");

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
      window.addGlobalLog("");
      window.addGlobalLog("✅ Backup concluído");
      showAlert("success", "✅ Backup de VMs concluído!");
    }
  } catch (error) {
    console.error("VM Backup: Erro durante backup:", error);
    const errorMsg = error?.message || error?.toString() || "Erro desconhecido";
    window.addGlobalLog("");
    window.addGlobalLog("========================================");
    window.addGlobalLog("❌ ERRO NO BACKUP");
    window.addGlobalLog("========================================");
    window.addGlobalLog(errorMsg);
    showAlert("danger", `Erro ao fazer backup: ${errorMsg}`);
  } finally {
    backupBtn.disabled = false;
    backupBtn.innerHTML = "📦 Fazer Backup das VMs Selecionadas";
  }
}

// ============================================================================
// LIMPEZA
// ============================================================================

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
    window.addGlobalLog("🗑️ Procurando backups antigos...");

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
      window.addGlobalLog(
        `ℹ️ Nenhum backup encontrado com mais de ${days} dias`
      );
      showAlert("info", `Não há backups de VMs com mais de ${days} dias.`);
      return;
    }

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

    window.addGlobalLog(
      `✅ ${deletedCount} arquivo(s) removido(s) (${formatSize(deletedSize)})`
    );
    showAlert("success", `✅ ${deletedCount} backup(s) antigo(s) removido(s)`);
  } catch (error) {
    const errorMsg = error?.message || error?.toString() || "Erro desconhecido";
    window.addGlobalLog(`❌ Erro: ${errorMsg}`);
    showAlert("danger", `Erro ao limpar backups: ${errorMsg}`);
  }
}

// ============================================================================
// CONFIGURAÇÃO
// ============================================================================

function updateVMBackupConfig() {
  vmBackupConfig.destDir = document.getElementById("vm-dest-dir").value.trim();
  vmBackupConfig.retentionDays = parseInt(
    document.getElementById("vm-retention-days").value
  );
  vmBackupConfig.verifyChecksum =
    document.getElementById("vm-verify-checksum").checked;

  console.log("VM Backup: Configuração atualizada:", vmBackupConfig);
  saveConfiguration();
}

function updateVMConfigForm() {
  const destDirInput = document.getElementById("vm-dest-dir");
  const retentionInput = document.getElementById("vm-retention-days");
  const checksumInput = document.getElementById("vm-verify-checksum");

  if (destDirInput) destDirInput.value = vmBackupConfig.destDir;
  if (retentionInput) retentionInput.value = vmBackupConfig.retentionDays;
  if (checksumInput) checksumInput.checked = vmBackupConfig.verifyChecksum;
}

// ============================================================================
// LOG - Usando o log global do sistema
// ============================================================================
// NOTA: Todas as chamadas addVMLog foram substituídas por window.addGlobalLog
// para usar o sistema de log global unificado

// ============================================================================
// EXPORTAR PARA USO GLOBAL
// ============================================================================

window.allVMs = allVMs;
window.selectedVMs = selectedVMs;
window.vmBackupConfig = vmBackupConfig;
window.checkAndFixVMScriptPermissions = checkAndFixVMScriptPermissions;
window.discoverVMs = discoverVMs;
window.diagnoseVMs = diagnoseVMs;
window.renderVMTable = renderVMTable;
window.toggleVMSelection = toggleVMSelection;
window.toggleSelectAllVMs = toggleSelectAllVMs;
window.updateVMStats = updateVMStats;
window.backupSelectedVMs = backupSelectedVMs;
window.cleanOldVMBackups = cleanOldVMBackups;
window.updateVMBackupConfig = updateVMBackupConfig;
window.updateVMConfigForm = updateVMConfigForm;
// addVMLog e clearVMLog removidos - usando window.addGlobalLog

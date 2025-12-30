/**
 * Backups Module - Gerenciamento de Backups
 * Carregamento, listagem, download, exclusão e exportação de backups
 */

// Estado local do módulo
let allBackups = [];
let selectedBackups = new Set();
let currentDeleteTarget = null;

// Helper para obter backupDirectories de forma segura
function getBackupDirectories() {
  return window.backupDirectories || [];
}

// ============================================================================
// CARREGAR BACKUPS
// ============================================================================

async function loadBackups() {
  console.log("Backup Manager: loadBackups() chamado");

  const directories = getBackupDirectories();
  console.log(
    "Backup Manager: Número de diretórios configurados:",
    directories.length
  );

  allBackups = [];
  window.allBackups = allBackups;

  if (directories.length === 0) {
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
    directories.length,
    "diretório(s)"
  );

  for (const dir of directories) {
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

  // Atualizar window.allBackups
  window.allBackups = allBackups;

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

// ============================================================================
// RENDERIZAR TABELA
// ============================================================================

function updateBackupsTable() {
  const tbody = document.getElementById("backups-table-body");
  const emptyState = document.getElementById("empty-state");
  const tableWrapper = document.querySelector(".backup-table-wrapper");

  if (allBackups.length === 0) {
    if (tbody) tbody.innerHTML = "";
    if (emptyState) emptyState.style.display = "block";
    if (tableWrapper) tableWrapper.style.display = "none";
    return;
  }

  if (emptyState) emptyState.style.display = "none";
  if (tableWrapper) tableWrapper.style.display = "block";

  const filteredBackups = getFilteredBackups();

  if (tbody) {
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
                  ? `
                <small style="color: var(--pf-global--Color--200); font-family: monospace;">
                  📂 ${escapeHtml(backup.subPath)}
                </small>
              `
                  : ""
              }
            </div>
          </div>
        </td>
        <td>
          <div>${formatDate(backup.createdAt)}</div>
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
            <button class="pf-c-button pf-m-secondary btn-icon" onclick="downloadBackup('${
              backup.id
            }')" data-tooltip="Download">
              ⬇️
            </button>
            <button class="pf-c-button pf-m-secondary btn-icon" onclick="openEmailModalForBackup('${
              backup.id
            }')" data-tooltip="Enviar por email">
              📧
            </button>
            <button class="pf-c-button pf-m-danger btn-icon" onclick="deleteBackup('${
              backup.id
            }')" data-tooltip="Deletar">
              🗑️
            </button>
          </div>
        </td>
      </tr>
    `
      )
      .join("");
  }

  updateSelectionButtons();
}

// ============================================================================
// FILTROS
// ============================================================================

function getFilteredBackups() {
  let filtered = [...allBackups];

  // Filtro de busca
  const searchInput = document.getElementById("search-input");
  const searchTerm = searchInput ? searchInput.value.toLowerCase() : "";
  if (searchTerm) {
    filtered = filtered.filter(
      (b) =>
        b.name.toLowerCase().includes(searchTerm) ||
        (b.relativePath && b.relativePath.toLowerCase().includes(searchTerm))
    );
  }

  // Filtro de diretório
  const directoryFilter = document.getElementById("directory-filter");
  const directoryValue = directoryFilter ? directoryFilter.value : "";
  if (directoryValue) {
    filtered = filtered.filter((b) => b.directoryPath === directoryValue);
  }

  // Ordenação
  const sortBy = document.getElementById("sort-by");
  const sortValue = sortBy ? sortBy.value : "date-desc";
  filtered.sort((a, b) => {
    switch (sortValue) {
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
  if (!checkbox) return;

  const filteredBackups = getFilteredBackups();
  const allSelected =
    filteredBackups.length > 0 &&
    filteredBackups.every((b) => selectedBackups.has(b.id));
  checkbox.checked = allSelected;
}

function updateSelectionButtons() {
  const hasSelection = selectedBackups.size > 0;
  const exportBtn = document.getElementById("export-selected-btn");
  const deleteBtn = document.getElementById("delete-selected-btn");

  if (exportBtn) exportBtn.disabled = !hasSelection;
  if (deleteBtn) deleteBtn.disabled = !hasSelection;
}

// ============================================================================
// AÇÕES DE BACKUP
// ============================================================================

async function downloadBackup(id) {
  const backup = allBackups.find((b) => b.id === id);
  if (!backup) return;

  try {
    const file = cockpit.file(backup.fullPath, { binary: true });
    const content = await file.read();

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
      const dirs = getBackupDirectories().filter(
        (d) => d.id !== currentDeleteTarget.id
      );
      window.backupDirectories = dirs;
      await saveConfiguration();
      updateDirectoriesList();
      updateDirectoryFilter();
      await loadBackups();
    } else if (currentDeleteTarget.type === "backup") {
      await cockpit.spawn(["rm", "-f", currentDeleteTarget.path]);
      await loadBackups();
      showAlert(
        "success",
        `Backup "${currentDeleteTarget.name}" deletado com sucesso!`
      );
    } else if (currentDeleteTarget.type === "multiple") {
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

// ============================================================================
// EXPORTAÇÃO
// ============================================================================

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

    const files = backups.map((b) => b.fullPath);
    await cockpit.spawn(["tar", "-czf", outputFile, ...files], {
      superuser: "try",
    });

    console.log("Backup Manager: Arquivo criado:", outputFile);
    showAlert("info", "📥 Iniciando download...", 0);

    const file = cockpit.file(outputFile, { binary: true, superuser: "try" });
    const content = await file.read();

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
// ESTATÍSTICAS
// ============================================================================

function updateStats() {
  const totalBackups = allBackups.length;
  const totalDirectories = getBackupDirectories().length;
  const totalSize = allBackups.reduce((sum, b) => sum + b.size, 0);
  const lastBackup =
    allBackups.length > 0
      ? allBackups.sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        )[0]
      : null;

  const totalBackupsEl = document.getElementById("total-backups");
  const totalDirsEl = document.getElementById("total-directories");
  const totalSizeEl = document.getElementById("total-size");
  const lastBackupEl = document.getElementById("last-backup");

  if (totalBackupsEl) totalBackupsEl.textContent = totalBackups;
  if (totalDirsEl) totalDirsEl.textContent = totalDirectories;
  if (totalSizeEl) totalSizeEl.textContent = formatSize(totalSize);
  if (lastBackupEl)
    lastBackupEl.textContent = lastBackup
      ? formatRelativeTime(lastBackup.createdAt)
      : "Nunca";
}

// ============================================================================
// EXPORTAR PARA USO GLOBAL
// ============================================================================

window.allBackups = allBackups;
window.selectedBackups = selectedBackups;
window.loadBackups = loadBackups;
window.loadBackupsFromDirectory = loadBackupsFromDirectory;
window.updateBackupsTable = updateBackupsTable;
window.getFilteredBackups = getFilteredBackups;
window.filterBackups = filterBackups;
window.toggleBackupSelection = toggleBackupSelection;
window.toggleSelectAll = toggleSelectAll;
window.selectAllBackups = selectAllBackups;
window.deselectAllBackups = deselectAllBackups;
window.updateSelectAllCheckbox = updateSelectAllCheckbox;
window.updateSelectionButtons = updateSelectionButtons;
window.downloadBackup = downloadBackup;
window.deleteBackup = deleteBackup;
window.deleteSelectedBackups = deleteSelectedBackups;
window.closeDeleteModal = closeDeleteModal;
window.confirmDelete = confirmDelete;
window.exportSelectedBackups = exportSelectedBackups;
window.exportAllBackups = exportAllBackups;
window.refreshBackupList = refreshBackupList;
window.cleanOldBackups = cleanOldBackups;
window.updateStats = updateStats;

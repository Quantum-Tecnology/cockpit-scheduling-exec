/**
 * Directory Browser - Navegação de diretórios
 * Modal para selecionar diretórios do sistema de arquivos
 */

// ============================================================================
// MODAL DE ADIÇÃO DE DIRETÓRIO
// ============================================================================

function openAddDirectoryModal() {
  document.getElementById("add-directory-modal").style.display = "block";
  document.getElementById("directory-path").focus();
}

function closeAddDirectoryModal() {
  document.getElementById("add-directory-modal").style.display = "none";
  document.getElementById("add-directory-form").reset();
}

// ============================================================================
// NAVEGADOR DE DIRETÓRIOS
// ============================================================================

async function browseDirectory() {
  const pathInput = document.getElementById("directory-path");
  const currentPath = pathInput.value || window.userHome || "/home";

  document.getElementById("directory-browser-modal").style.display = "block";
  await loadDirectoryContents(currentPath);
}

function closeDirectoryBrowser() {
  document.getElementById("directory-browser-modal").style.display = "none";
}

async function loadDirectoryContents(path) {
  const container = document.getElementById("directory-list");
  const currentPathSpan = document.getElementById("current-path");

  currentPathSpan.textContent = path;
  container.innerHTML =
    '<div style="text-align: center; padding: 2rem;">Carregando...</div>';

  try {
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
            <div style="display: flex; align-items: center; flex: 1;" onclick="loadDirectoryContents('${window.escapeHtml(
              dir
            )}')">
              <span style="font-size: 1.5rem; margin-right: 0.75rem;">📁</span>
              <span style="font-family: monospace;">${window.escapeHtml(name)}</span>
            </div>
            <button class="pf-c-button pf-m-primary pf-m-small" onclick="selectDirectory('${window.escapeHtml(
              dir
            )}')">Selecionar</button>
          </div>
        `;
      })
      .join("");
  } catch (error) {
    container.innerHTML = `<div style="text-align: center; padding: 2rem; color: #c9190b;">Erro ao listar diretórios: ${window.escapeHtml(
      error?.message || "Caminho inválido"
    )}</div>`;
  }
}

function selectDirectory(path) {
  // Se existir um callback personalizado (para scripts), usar ele
  if (window.scriptDirectoryCallback) {
    window.scriptDirectoryCallback(path);
    window.scriptDirectoryCallback = null;
    window.showAlert("success", `✅ Diretório selecionado: ${path}`);
  } else {
    document.getElementById("directory-path").value = path;
    closeDirectoryBrowser();
    window.showAlert("success", `✅ Diretório selecionado: ${path}`);
  }
}

function navigateToParent() {
  const currentPath = document.getElementById("current-path").textContent;
  if (currentPath === "/") return;

  const parentPath = currentPath.split("/").slice(0, -1).join("/") || "/";
  loadDirectoryContents(parentPath);
}

function navigateToHome() {
  loadDirectoryContents(window.userHome || "/home");
}

function navigateToRoot() {
  loadDirectoryContents("/");
}

function showCommonDirectories() {
  const container = document.getElementById("directory-list");
  const userHome = window.userHome || "/home";

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
        <div style="display: flex; align-items: center; flex: 1;" onclick="loadDirectoryContents('${window.escapeHtml(
          dir.path
        )}')">
          <span style="font-size: 1.5rem; margin-right: 0.75rem;">${
            dir.icon
          }</span>
          <span>${window.escapeHtml(dir.label)}</span>
        </div>
        <button class="pf-c-button pf-m-primary pf-m-small" onclick="selectDirectory('${window.escapeHtml(
          dir.path
        )}')">Selecionar</button>
      </div>
    `
    )
    .join("");
}

// Exportar funções para uso global
window.openAddDirectoryModal = openAddDirectoryModal;
window.closeAddDirectoryModal = closeAddDirectoryModal;
window.browseDirectory = browseDirectory;
window.closeDirectoryBrowser = closeDirectoryBrowser;
window.loadDirectoryContents = loadDirectoryContents;
window.selectDirectory = selectDirectory;
window.navigateToParent = navigateToParent;
window.navigateToHome = navigateToHome;
window.navigateToRoot = navigateToRoot;
window.showCommonDirectories = showCommonDirectories;

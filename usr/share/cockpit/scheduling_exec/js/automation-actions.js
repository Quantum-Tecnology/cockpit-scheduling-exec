/**
 * Automation Actions Module - Ações dos Scripts
 * Funções de execução, edição e gerenciamento
 */

// ============================================================================
// CRIAR NOVO SCRIPT
// ============================================================================

function automationOpenCreateModal() {
  console.log("Automation: Abrindo modal de criar script");
  const modal = document.getElementById("script-modal");
  if (modal) {
    automationCurrentEditingScript = null;
    document.getElementById("script-modal-title").textContent =
      "Criar Novo Script";
    document.getElementById("script-name").value = "";
    document.getElementById("script-name").disabled = false;
    document.getElementById("script-content").value =
      "#!/bin/bash\n\n# Seu script aqui\n";
    modal.style.display = "block";
  }
}

// ============================================================================
// EXECUTAR SCRIPT
// ============================================================================

async function automationExecuteScript(scriptName) {
  console.log(`Automation: Executando script ${scriptName}`);

  const script = window.allScripts.find((s) => s.name === scriptName);
  if (!script) {
    showAlert("danger", `❌ Script "${scriptName}" não encontrado!`);
    return;
  }

  try {
    showAlert("info", `⏳ Executando script "${scriptName}"...`);

    const result = await cockpit.spawn(["bash", script.path], {
      err: "message",
      superuser: "try",
    });

    console.log(`Automation: Script executado com sucesso:`, result);
    showAlert("success", `✅ Script "${scriptName}" executado com sucesso!`);

    // Atualizar estatísticas
    script.total_executions = (script.total_executions || 0) + 1;
    script.successful_executions = (script.successful_executions || 0) + 1;
    script.last_execution = Math.floor(Date.now() / 1000);

    automationRenderScripts(allScripts);
    automationUpdateStatCards(allScripts);
  } catch (error) {
    console.error(`Automation: Erro ao executar script:`, error);
    showAlert(
      "danger",
      `❌ Erro ao executar "${scriptName}": ${automationFormatCockpitError(
        error
      )}`
    );

    script.total_executions = (script.total_executions || 0) + 1;
    script.last_execution = Math.floor(Date.now() / 1000);

    automationRenderScripts(allScripts);
    automationUpdateStatCards(allScripts);
  }
}

// ============================================================================
// MODAL SUDO
// ============================================================================

function automationOpenSudoModal(scriptName) {
  console.log(`Automation: Abrindo modal sudo para ${scriptName}`);
  automationCurrentSudoScript = scriptName;

  const modal = document.getElementById("sudo-modal");
  if (modal) {
    document.getElementById("sudo-password").value = "";
    modal.style.display = "block";
  }
}

function automationCloseSudoModal() {
  const modal = document.getElementById("sudo-modal");
  if (modal) {
    modal.style.display = "none";
    document.getElementById("sudo-password").value = "";
  }
  automationCurrentSudoScript = null;
}

async function automationExecuteWithSudo() {
  const password = document.getElementById("sudo-password").value;

  if (!password) {
    showAlert("warning", "⚠️ Por favor, informe a senha!");
    return;
  }

  if (!automationCurrentSudoScript) {
    showAlert("danger", "❌ Script não especificado!");
    automationCloseSudoModal();
    return;
  }

  const script = window.allScripts.find(
    (s) => s.name === automationCurrentSudoScript
  );
  if (!script) {
    showAlert(
      "danger",
      `❌ Script "${automationCurrentSudoScript}" não encontrado!`
    );
    automationCloseSudoModal();
    return;
  }

  try {
    showAlert(
      "info",
      `⏳ Executando "${automationCurrentSudoScript}" com privilégios...`
    );
    automationCloseSudoModal();

    // Executar com sudo usando password via stdin
    const result = await cockpit
      .spawn(["sudo", "-S", "bash", script.path], {
        err: "message",
      })
      .input(password + "\n");

    console.log(`Automation: Script executado com sudo:`, result);
    showAlert(
      "success",
      `✅ Script "${automationCurrentSudoScript}" executado com sucesso!`
    );

    script.total_executions = (script.total_executions || 0) + 1;
    script.successful_executions = (script.successful_executions || 0) + 1;
    script.last_execution = Math.floor(Date.now() / 1000);

    automationRenderScripts(allScripts);
    automationUpdateStatCards(allScripts);
  } catch (error) {
    console.error(`Automation: Erro ao executar com sudo:`, error);
    showAlert("danger", `❌ Erro: ${automationFormatCockpitError(error)}`);

    script.total_executions = (script.total_executions || 0) + 1;
    script.last_execution = Math.floor(Date.now() / 1000);

    automationRenderScripts(allScripts);
    automationUpdateStatCards(allScripts);
  }
}

// ============================================================================
// VARIÁVEIS DE AMBIENTE (SCRIPT)
// ============================================================================

function automationOpenScriptEnvModal(scriptName) {
  console.log(`Automation: Abrindo modal de variáveis para ${scriptName}`);
  automationCurrentScriptEnv = scriptName;

  const modal = document.getElementById("script-env-modal");
  if (modal) {
    modal.style.display = "block";
    // TODO: Carregar variáveis salvas
  }
}

function automationCloseScriptEnvModal() {
  const modal = document.getElementById("script-env-modal");
  if (modal) {
    modal.style.display = "none";
  }
  automationCurrentScriptEnv = null;
}

function automationSaveScriptEnv() {
  // TODO: Implementar salvamento de variáveis de ambiente
  showAlert("info", "ℹ️ Recurso em desenvolvimento");
  automationCloseScriptEnvModal();
}

// ============================================================================
// LOGS
// ============================================================================

function automationOpenLogModal(scriptName) {
  console.log(`Automation: Abrindo logs para ${scriptName}`);
  automationCurrentLogScript = scriptName;

  const modal = document.getElementById("log-modal");
  if (modal) {
    document.getElementById("log-content").textContent = "Carregando logs...";
    modal.style.display = "block";
    automationLoadScriptLogs(scriptName);
  }
}

function automationCloseLogModal() {
  const modal = document.getElementById("log-modal");
  if (modal) {
    modal.style.display = "none";
  }
  automationCurrentLogScript = null;
}

async function automationLoadScriptLogs(scriptName) {
  const script = window.allScripts.find((s) => s.name === scriptName);
  if (!script) {
    document.getElementById("log-content").textContent =
      "Script não encontrado!";
    return;
  }

  // TODO: Implementar carregamento de logs
  document.getElementById("log-content").textContent =
    `Logs do script: ${scriptName}\n\n` +
    `Caminho: ${script.path}\n` +
    `Execuções: ${script.total_executions || 0}\n` +
    `Sucessos: ${script.successful_executions || 0}\n\n` +
    `Logs detalhados em desenvolvimento...`;
}

// ============================================================================
// EDITAR SCRIPT
// ============================================================================

async function automationEditScript(scriptName) {
  console.log(`Automation: Editando script ${scriptName}`);

  const script = window.allScripts.find((s) => s.name === scriptName);
  if (!script) {
    showAlert("danger", `❌ Script "${scriptName}" não encontrado!`);
    return;
  }

  try {
    const content = await cockpit.file(script.path).read();

    automationCurrentEditingScript = script;
    const modal = document.getElementById("script-modal");
    if (modal) {
      document.getElementById("script-modal-title").textContent =
        "Editar Script";
      document.getElementById("script-name").value = scriptName;
      document.getElementById("script-name").disabled = true;
      document.getElementById("script-content").value = content;
      modal.style.display = "block";
    }
  } catch (error) {
    console.error(`Automation: Erro ao carregar script:`, error);
    showAlert(
      "danger",
      `❌ Erro ao carregar script: ${automationFormatCockpitError(error)}`
    );
  }
}

// ============================================================================
// AGENDAR (CRON)
// ============================================================================

function automationOpenCronModal(scriptName, mode = "script") {
  console.log(`Automation: Abrindo modal cron para ${scriptName}`);
  automationCronModalMode = mode;

  const script = window.allScripts.find((s) => s.name === scriptName);
  if (!script) {
    showAlert("danger", `❌ Script "${scriptName}" não encontrado!`);
    return;
  }

  const modal = document.getElementById("cron-modal");
  if (modal) {
    document.getElementById("cron-script-name").textContent = scriptName;
    document.getElementById("cron-expression").value =
      script.cron_expression || "";
    modal.style.display = "block";
  }
}

function automationCloseCronModal() {
  const modal = document.getElementById("cron-modal");
  if (modal) {
    modal.style.display = "none";
  }
}

async function automationSaveCron() {
  const scriptName = document.getElementById("cron-script-name").textContent;
  const cronExpression = document
    .getElementById("cron-expression")
    .value.trim();

  const script = window.allScripts.find((s) => s.name === scriptName);
  if (!script) {
    showAlert("danger", `❌ Script "${scriptName}" não encontrado!`);
    return;
  }

  script.cron_expression = cronExpression;
  script.scheduled = cronExpression !== "";

  // TODO: Adicionar ao crontab real

  automationCloseCronModal();
  automationRenderScripts(allScripts);
  automationUpdateStatCards(allScripts);

  if (cronExpression) {
    showAlert("success", `✅ Agendamento salvo para "${scriptName}"!`);
  } else {
    showAlert("info", `ℹ️ Agendamento removido de "${scriptName}"`);
  }
}

// ============================================================================
// SALVAR SCRIPT
// ============================================================================

function automationCloseScriptModal() {
  const modal = document.getElementById("script-modal");
  if (modal) {
    modal.style.display = "none";
  }
  automationCurrentEditingScript = null;
}

async function automationSaveScript() {
  const scriptName = document.getElementById("script-name").value.trim();
  const scriptContent = document.getElementById("script-content").value;

  if (!scriptName) {
    showAlert("warning", "⚠️ Por favor, informe o nome do script!");
    return;
  }

  if (!scriptName.endsWith(".sh")) {
    showAlert("warning", "⚠️ O nome do script deve terminar com .sh!");
    return;
  }

  if (!scriptContent.trim()) {
    showAlert("warning", "⚠️ O script não pode estar vazio!");
    return;
  }

  try {
    let scriptPath;

    if (automationCurrentEditingScript) {
      // Editar existente
      scriptPath = automationCurrentEditingScript.path;
    } else {
      // Criar novo
      if (scriptDirectories.length === 0) {
        showAlert(
          "danger",
          "❌ Configure pelo menos um diretório de scripts primeiro!"
        );
        return;
      }

      const firstDir = scriptDirectories[0];
      scriptPath = `${firstDir.path}/${scriptName}`;

      // Verificar se já existe
      const exists = allScripts.some((s) => s.path === scriptPath);
      if (exists) {
        showAlert(
          "warning",
          `⚠️ Já existe um script com o nome "${scriptName}"!`
        );
        return;
      }
    }

    // Salvar arquivo
    await cockpit.file(scriptPath).replace(scriptContent);

    // Tornar executável
    await cockpit.spawn(["chmod", "+x", scriptPath], { superuser: "try" });

    automationCloseScriptModal();
    showAlert("success", `✅ Script "${scriptName}" salvo com sucesso!`);

    // Recarregar scripts
    await automationLoadScripts();
  } catch (error) {
    console.error(`Automation: Erro ao salvar script:`, error);
    showAlert(
      "danger",
      `❌ Erro ao salvar: ${automationFormatCockpitError(error)}`
    );
  }
}

// ============================================================================
// EXCLUIR SCRIPT
// ============================================================================

async function automationDeleteScript(scriptName) {
  const script = window.allScripts.find((s) => s.name === scriptName);
  if (!script) {
    showAlert("danger", `❌ Script "${scriptName}" não encontrado!`);
    return;
  }

  if (
    !confirm(
      `Deseja realmente excluir o script "${scriptName}"?\n\nCaminho: ${script.path}`
    )
  ) {
    return;
  }

  try {
    await cockpit.spawn(["rm", "-f", script.path], { superuser: "try" });

    showAlert("success", `✅ Script "${scriptName}" excluído com sucesso!`);

    // Recarregar scripts
    await automationLoadScripts();
  } catch (error) {
    console.error(`Automation: Erro ao excluir script:`, error);
    showAlert(
      "danger",
      `❌ Erro ao excluir: ${automationFormatCockpitError(error)}`
    );
  }
}

// ============================================================================
// EXPORTAR FUNÇÕES
// ============================================================================

window.automationOpenCreateModal = automationOpenCreateModal;
window.automationExecuteScript = automationExecuteScript;
window.automationOpenSudoModal = automationOpenSudoModal;
window.automationCloseSudoModal = automationCloseSudoModal;
window.automationExecuteWithSudo = automationExecuteWithSudo;
window.automationOpenScriptEnvModal = automationOpenScriptEnvModal;
window.automationCloseScriptEnvModal = automationCloseScriptEnvModal;
window.automationSaveScriptEnv = automationSaveScriptEnv;
window.automationOpenLogModal = automationOpenLogModal;
window.automationCloseLogModal = automationCloseLogModal;
window.automationLoadScriptLogs = automationLoadScriptLogs;
window.automationEditScript = automationEditScript;
window.automationOpenCronModal = automationOpenCronModal;
window.automationCloseCronModal = automationCloseCronModal;
window.automationSaveCron = automationSaveCron;
window.automationCloseScriptModal = automationCloseScriptModal;
window.automationSaveScript = automationSaveScript;
window.automationDeleteScript = automationDeleteScript;

/**
 * Automation Scripts Module - Criação, Edição, Execução e Agendamento
 * Funções de manipulação de scripts e cron
 */

// ============================================================================
// MODAIS - CRIAR/EDITAR SCRIPT
// ============================================================================

function automationOpenCreateModal() {
  console.log("Automation: Abrindo modal de criação");
  window.automationCurrentEditingScript = null;
  document.getElementById("automation-modal-title").textContent = "Novo Script";
  document.getElementById("automation-script-name").value = "";
  document.getElementById("automation-script-name").disabled = false;
  document.getElementById("automation-script-content").value =
    '#!/bin/bash\n\n# Seu script aqui\necho "Executando script..."\n';
  document.getElementById("automation-script-path").value =
    "~/scripts/<script>.sh";
  document.getElementById("automation-scriptModal").style.display = "block";
}

function automationCloseScriptModal() {
  document.getElementById("automation-scriptModal").style.display = "none";
  window.automationCurrentEditingScript = null;
}

function automationSaveScript() {
  console.log("Automation: Salvando script");
  const scriptName = document
    .getElementById("automation-script-name")
    .value.trim();
  const scriptContent = document.getElementById(
    "automation-script-content"
  ).value;

  if (!scriptName.endsWith(".sh")) {
    automationShowError("O nome do script deve terminar com .sh");
    return;
  }

  automationShowLoading(true);
  automationCloseScriptModal();

  let scriptPath;

  // Se estiver editando, usar o caminho existente
  if (window.automationCurrentEditingScript) {
    const script = window.allScripts.find(
      (s) => s.name === window.automationCurrentEditingScript
    );
    if (script) {
      scriptPath = script.path;
      console.log("Automation: Atualizando script existente:", scriptPath);
    } else {
      automationShowLoading(false);
      automationShowError("Script não encontrado para edição.");
      return;
    }
  } else {
    // Se for novo, perguntar onde salvar
    const defaultDir =
      window.scriptDirectories.length > 0
        ? window.scriptDirectories[0].path
        : "~/scripts";
    const dir = prompt(
      "Digite o diretório onde deseja salvar o script:",
      defaultDir
    );

    if (!dir || dir.trim() === "") {
      automationShowLoading(false);
      showAlert("warning", "⚠️ Operação cancelada");
      return;
    }

    scriptPath = `${dir.trim()}/${scriptName}`;
    console.log("Automation: Criando novo script:", scriptPath);
  }

  // Salvar o script usando tee
  const proc = cockpit.spawn(["tee", scriptPath], {
    err: "message",
    superuser: "try",
  });

  proc.input(scriptContent);

  proc
    .then(() => {
      console.log("Automation: Conteúdo salvo, ajustando permissões...");
      return cockpit.spawn(["chmod", "+x", scriptPath], {
        err: "message",
        superuser: "try",
      });
    })
    .then(() => {
      automationShowLoading(false);
      console.log("Automation: Script salvo com sucesso");
      showAlert(
        "success",
        `✅ Script ${scriptName} salvo com sucesso em ${scriptPath}!`
      );
      automationLoadScripts();
    })
    .catch((error) => {
      automationShowLoading(false);
      console.error("Automation: Erro ao salvar script:", error);
      automationShowError(
        "Erro ao salvar script: " + automationFormatCockpitError(error)
      );
    });
}

// ============================================================================
// EDITAR SCRIPT
// ============================================================================

function automationEditScript(scriptName) {
  console.log("Automation: Editando script:", scriptName);

  const script = window.allScripts.find((s) => s.name === scriptName);
  if (!script) {
    console.error("Automation: Script não encontrado:", scriptName);
    automationShowError(
      `Script "${scriptName}" não encontrado na lista de scripts carregados.`
    );
    return;
  }

  const scriptPath = script.path;
  console.log("Automation: Caminho do script:", scriptPath);

  automationShowLoading(true);
  window.automationCurrentEditingScript = scriptName;

  cockpit
    .spawn(["cat", scriptPath], {
      err: "message",
      superuser: "try",
    })
    .then((content) => {
      automationShowLoading(false);
      document.getElementById("automation-modal-title").textContent =
        "Editar Script: " + scriptName;
      document.getElementById("automation-script-name").value = scriptName;
      document.getElementById("automation-script-name").disabled = true;
      document.getElementById("automation-script-content").value = content;
      document.getElementById("automation-script-path").value = scriptPath;
      document.getElementById("automation-scriptModal").style.display = "block";
    })
    .catch((error) => {
      automationShowLoading(false);
      console.error("Automation: Erro ao carregar script:", error);
      automationShowError(
        "Erro ao carregar script: " + automationFormatCockpitError(error)
      );
    });
}

// ============================================================================
// EXCLUIR SCRIPT
// ============================================================================

function automationDeleteScript(scriptName) {
  const script = window.allScripts.find((s) => s.name === scriptName);
  if (!script) {
    console.error("Automation: Script não encontrado:", scriptName);
    automationShowError(
      `Script "${scriptName}" não encontrado na lista de scripts carregados.`
    );
    return;
  }

  const scriptPath = script.path;

  if (
    !confirm(
      `Tem certeza que deseja excluir o script "${scriptName}"?\n\nCaminho: ${scriptPath}\n\nEsta ação não pode ser desfeita.`
    )
  ) {
    return;
  }

  console.log("Automation: Excluindo script:", scriptPath);
  automationShowLoading(true);

  cockpit
    .spawn(["rm", "-f", scriptPath], {
      err: "message",
      superuser: "try",
    })
    .then(() => {
      automationShowLoading(false);
      console.log("Automation: Script excluído com sucesso");
      showAlert("success", `✅ Script ${scriptName} excluído com sucesso!`);
      automationLoadScripts();
    })
    .catch((error) => {
      automationShowLoading(false);
      console.error("Automation: Erro ao excluir script:", error);
      automationShowError(
        "Erro ao excluir script: " + automationFormatCockpitError(error)
      );
    });
}

// ============================================================================
// EXECUTAR SCRIPT
// ============================================================================

function automationExecuteScript(scriptName, sudoPassword = null) {
  console.log(
    "Automation: Executando script:",
    scriptName,
    sudoPassword ? "(com sudo)" : ""
  );

  const script = window.allScripts.find((s) => s.name === scriptName);
  if (!script) {
    console.error("Automation: Script não encontrado:", scriptName);
    automationShowError(
      `Script "${scriptName}" não encontrado na lista de scripts carregados.`
    );
    return;
  }

  const scriptPath = script.path;
  console.log("Automation: Caminho do script:", scriptPath);

  if (
    !sudoPassword &&
    !confirm(`Executar o script "${scriptName}"?\n\nCaminho: ${scriptPath}`)
  ) {
    return;
  }

  automationShowLoading(true);

  const args = ["bash", scriptPath];

  let proc = cockpit.spawn(args, {
    err: "message",
    superuser: sudoPassword ? "require" : "try",
  });

  if (sudoPassword) {
    proc = proc.input(sudoPassword + "\n");
  }

  proc
    .then((output) => {
      automationShowLoading(false);
      console.log("Automation: Script executado com sucesso");

      showAlert("success", `✅ Script ${scriptName} executado com sucesso!`);

      if (output && output.trim()) {
        const title = sudoPassword
          ? `Script executado como admin com sucesso!\n\nCaminho: ${scriptPath}\n\nSaída:`
          : `Script executado com sucesso!\n\nCaminho: ${scriptPath}\n\nSaída:`;
        alert(title + "\n" + output);
      } else {
        alert(
          `${
            sudoPassword ? "Script executado como admin" : "Script executado"
          } com sucesso!\n\nCaminho: ${scriptPath}\n\n(sem saída)`
        );
      }

      automationLoadScripts();
    })
    .catch((error) => {
      automationShowLoading(false);
      console.error("Automation: Erro ao executar script:", error);

      const errorMsg = automationFormatCockpitError(error);
      showAlert("danger", `❌ Script ${scriptName} finalizou com erro`);
      alert(
        `${
          sudoPassword
            ? "Script como admin finalizou com erro"
            : "Script finalizou com erro"
        }.\n\nCaminho: ${scriptPath}\n\nErro:\n${errorMsg}`
      );
    });
}

// ============================================================================
// MODAL SUDO
// ============================================================================

let automationCurrentSudoScript = null;

function automationOpenSudoModal(scriptName) {
  automationCurrentSudoScript = scriptName;
  document.getElementById(
    "automation-sudo-title"
  ).textContent = `Executar como Admin: ${scriptName}`;
  document.getElementById("automation-sudo-password").value = "";
  document.getElementById("automation-sudoModal").style.display = "block";
  setTimeout(
    () => document.getElementById("automation-sudo-password")?.focus(),
    0
  );
}

function automationCloseSudoModal() {
  document.getElementById("automation-sudoModal").style.display = "none";
  automationCurrentSudoScript = null;
  document.getElementById("automation-sudo-password").value = "";
}

function automationExecuteSudo() {
  const password = document.getElementById("automation-sudo-password").value;
  if (!password) {
    automationShowError("Informe a senha do sudo");
    return;
  }
  automationCloseSudoModal();
  automationExecuteScript(automationCurrentSudoScript, password);
}

// ============================================================================
// MODAL VARIÁVEIS DO SCRIPT
// ============================================================================

let automationCurrentScriptEnv = null;

function automationOpenScriptEnvModal(scriptName) {
  console.log("Automation: Abrindo modal de variáveis do script:", scriptName);
  automationCurrentScriptEnv = scriptName;
  document.getElementById(
    "automation-script-env-title"
  ).textContent = `Variáveis do script: ${scriptName}`;
  document.getElementById("automation-script-env-content").value = "";
  document.getElementById("automation-scriptEnvModal").style.display = "block";
  automationLoadScriptEnvFile(scriptName);
}

function automationCloseScriptEnvModal() {
  document.getElementById("automation-scriptEnvModal").style.display = "none";
  automationCurrentScriptEnv = null;
}

function automationLoadScriptEnvFile(scriptName) {
  automationShowLoading(true);
  cockpit
    .spawn(
      [
        "/usr/share/cockpit/scheduling_exec/scripts/get-script-env.sh",
        scriptName,
      ],
      { err: "message" }
    )
    .then((content) => {
      automationShowLoading(false);
      document.getElementById("automation-script-env-content").value =
        content || "";
    })
    .catch((error) => {
      automationShowLoading(false);
      automationShowError(
        "Erro ao carregar variáveis do script: " +
          automationFormatCockpitError(error)
      );
    });
}

function automationSaveScriptEnv() {
  const scriptName = automationCurrentScriptEnv;
  const envContent = document.getElementById(
    "automation-script-env-content"
  ).value;

  if (!scriptName) {
    automationShowError("Nenhum script selecionado para variáveis");
    return;
  }

  console.log("Automation: Salvando variáveis do script:", scriptName);
  automationShowLoading(true);
  automationCloseScriptEnvModal();

  cockpit
    .spawn(
      [
        "/usr/share/cockpit/scheduling_exec/scripts/save-script-env.sh",
        scriptName,
      ],
      { err: "message" }
    )
    .input(envContent)
    .then(() => {
      automationShowLoading(false);
      console.log("Automation: Variáveis do script salvas com sucesso");
      showAlert(
        "success",
        `✅ Variáveis do script ${scriptName} salvas com sucesso!`
      );
    })
    .catch((error) => {
      automationShowLoading(false);
      console.error("Automation: Erro ao salvar variáveis:", error);
      automationShowError(
        "Erro ao salvar variáveis do script: " +
          automationFormatCockpitError(error)
      );
    });
}

// ============================================================================
// MODAL LOGS
// ============================================================================

let automationCurrentLogScript = null;

function automationOpenLogModal(scriptName) {
  console.log("Automation: Abrindo modal de logs:", scriptName);
  automationCurrentLogScript = scriptName;
  document.getElementById(
    "automation-log-title"
  ).textContent = `Logs: ${scriptName}`;
  document.getElementById("automation-log-content").value = "";
  document.getElementById("automation-logModal").style.display = "block";
  automationLoadScriptLog(scriptName);
}

function automationCloseLogModal() {
  document.getElementById("automation-logModal").style.display = "none";
  automationCurrentLogScript = null;
}

function automationLoadScriptLog(scriptName) {
  document.getElementById("automation-log-loading").style.display = "block";
  cockpit
    .spawn(
      [
        "/usr/share/cockpit/scheduling_exec/scripts/get-script-log.sh",
        scriptName,
        "400",
      ],
      { err: "message" }
    )
    .then((content) => {
      document.getElementById("automation-log-loading").style.display = "none";
      document.getElementById("automation-log-content").value = content || "";
    })
    .catch((error) => {
      document.getElementById("automation-log-loading").style.display = "none";
      automationShowError(
        "Erro ao carregar logs: " + automationFormatCockpitError(error)
      );
    });
}

// ============================================================================
// MODAL VARIÁVEIS GLOBAIS
// ============================================================================

function automationOpenEnvModal() {
  console.log("Automation: Abrindo modal de variáveis globais");
  document.getElementById("automation-envModal").style.display = "block";
  automationLoadEnvFile();
}

function automationCloseEnvModal() {
  document.getElementById("automation-envModal").style.display = "none";
}

function automationLoadEnvFile() {
  automationShowLoading(true);
  cockpit
    .spawn(["/usr/share/cockpit/scheduling_exec/scripts/get-env.sh"], {
      err: "message",
    })
    .then((content) => {
      automationShowLoading(false);
      document.getElementById("automation-env-content").value = content || "";
    })
    .catch((error) => {
      automationShowLoading(false);
      automationShowError(
        "Erro ao carregar .env: " + automationFormatCockpitError(error)
      );
    });
}

function automationSaveEnv() {
  const envContent = document.getElementById("automation-env-content").value;
  console.log("Automation: Salvando variáveis globais");
  automationShowLoading(true);
  automationCloseEnvModal();

  cockpit
    .spawn(["/usr/share/cockpit/scheduling_exec/scripts/save-env.sh"], {
      err: "message",
    })
    .input(envContent)
    .then(() => {
      automationShowLoading(false);
      console.log("Automation: Variáveis globais salvas com sucesso");
      showAlert("success", "✅ Variáveis globais salvas com sucesso!");
    })
    .catch((error) => {
      automationShowLoading(false);
      console.error("Automation: Erro ao salvar .env:", error);
      automationShowError(
        "Erro ao salvar .env: " + automationFormatCockpitError(error)
      );
    });
}

// ============================================================================
// MODAL IMPORTAR SCRIPTS
// ============================================================================

let automationImportCandidates = [];

function automationOpenImportModal() {
  console.log("Automation: Abrindo modal de importação");
  document.getElementById("automation-importModal").style.display = "block";
  automationLoadImportCandidates();
}

function automationCloseImportModal() {
  document.getElementById("automation-importModal").style.display = "none";
  automationImportCandidates = [];
}

function automationLoadImportCandidates() {
  document.getElementById("automation-import-loading").style.display = "block";
  document.getElementById("automation-import-empty").style.display = "none";
  document.getElementById("automation-import-table-wrap").style.display =
    "none";

  cockpit
    .spawn(
      ["/usr/share/cockpit/scheduling_exec/scripts/scan-user-scripts.sh"],
      { err: "message" }
    )
    .then((output) => {
      document.getElementById("automation-import-loading").style.display =
        "none";
      const candidates = JSON.parse(output);
      automationImportCandidates = candidates;

      if (!candidates || candidates.length === 0) {
        document.getElementById("automation-import-empty").style.display =
          "block";
        return;
      }

      const tbody = document.getElementById("automation-import-body");
      tbody.innerHTML = "";

      candidates.forEach((c, idx) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td><input type="checkbox" id="automation-import-check-${idx}" /></td>
          <td><strong>${automationEscapeHtml(c.name)}</strong></td>
          <td><code>${automationEscapeHtml(c.path)}</code></td>
        `;
        tbody.appendChild(tr);
      });

      document.getElementById("automation-import-table-wrap").style.display =
        "block";
    })
    .catch((error) => {
      document.getElementById("automation-import-loading").style.display =
        "none";
      automationShowError(
        "Erro ao buscar scripts: " + automationFormatCockpitError(error)
      );
      document.getElementById("automation-import-empty").style.display =
        "block";
    });
}

function automationImportSelectedScripts() {
  const selected = [];
  automationImportCandidates.forEach((c, idx) => {
    const checkbox = document.getElementById(`automation-import-check-${idx}`);
    if (checkbox && checkbox.checked) selected.push(c);
  });

  if (selected.length === 0) {
    automationShowError("Selecione pelo menos um script para importar");
    return;
  }

  console.log("Automation: Importando", selected.length, "scripts");
  document.getElementById("automation-import-loading").style.display = "block";

  let chain = Promise.resolve();
  selected.forEach((c) => {
    chain = chain.then(() =>
      cockpit.spawn(
        [
          "/usr/share/cockpit/scheduling_exec/scripts/import-user-script.sh",
          c.path,
        ],
        { err: "message" }
      )
    );
  });

  chain
    .then(() => {
      document.getElementById("automation-import-loading").style.display =
        "none";
      console.log("Automation: Scripts importados com sucesso");
      showAlert(
        "success",
        `✅ ${selected.length} script(s) importado(s) com sucesso!`
      );
      automationCloseImportModal();
      automationLoadScripts();
    })
    .catch((error) => {
      document.getElementById("automation-import-loading").style.display =
        "none";
      console.error("Automation: Erro ao importar scripts:", error);
      automationShowError(
        "Erro ao importar scripts: " + automationFormatCockpitError(error)
      );
    });
}

// ============================================================================
// MODAL CRON
// ============================================================================

let automationCronModalMode = "script";

function automationOpenCronModal(scriptName) {
  console.log("Automation: Abrindo modal de agendamento para:", scriptName);
  automationCronModalMode = "script";
  document.getElementById("automation-cron-script-name").value = scriptName;
  document.getElementById("automation-cron-script-select-group").style.display =
    "none";

  // Defaults
  document.getElementById("automation-cron-minute").value = "*";
  document.getElementById("automation-cron-hour").value = "*";
  document.getElementById("automation-cron-day").value = "*";
  document.getElementById("automation-cron-month").value = "*";
  document.getElementById("automation-cron-weekday").value = "*";

  document.getElementById("automation-cronModal").style.display = "block";
  automationLoadCronSchedules(scriptName);
}

function automationOpenCronManagerModal() {
  console.log("Automation: Abrindo modal de gerenciamento de agendamentos");
  automationCronModalMode = "global";
  document.getElementById("automation-cron-script-name").value = "";
  document.getElementById("automation-cron-script-select-group").style.display =
    "block";

  document.getElementById("automation-cron-minute").value = "*";
  document.getElementById("automation-cron-hour").value = "*";
  document.getElementById("automation-cron-day").value = "*";
  document.getElementById("automation-cron-month").value = "*";
  document.getElementById("automation-cron-weekday").value = "*";

  document.getElementById("automation-cronModal").style.display = "block";
  automationLoadCronScriptsSelect();
  automationLoadCronSchedules(null);
}

function automationCloseCronModal() {
  document.getElementById("automation-cronModal").style.display = "none";
  automationCronModalMode = "script";
}

function automationLoadCronScriptsSelect() {
  const select = document.getElementById("automation-cron-script-select");
  if (!select) return Promise.resolve();

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
      automationShowError(
        "Erro ao carregar scripts: " + automationFormatCockpitError(error)
      );
    });
}

function automationOnCronScriptSelectChange() {
  const select = document.getElementById("automation-cron-script-select");
  const hidden = document.getElementById("automation-cron-script-name");
  const scriptName = select ? select.value : "";

  if (hidden) hidden.value = scriptName;
  automationLoadCronSchedules(scriptName || null);
}

function automationLoadCronSchedules(scriptName) {
  document.getElementById("automation-cron-existing-empty").style.display =
    "block";
  document.getElementById("automation-cron-existing-table-wrap").style.display =
    "none";

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

      if (!items || items.length === 0) {
        document.getElementById(
          "automation-cron-existing-empty"
        ).style.display = "block";
        document.getElementById(
          "automation-cron-existing-table-wrap"
        ).style.display = "none";
        return items;
      }

      const tbody = document.getElementById("automation-cron-existing-body");
      tbody.innerHTML = "";

      items.forEach((item) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td><strong>${automationEscapeHtml(item.script || "-")}</strong></td>
          <td><code>${automationEscapeHtml(item.expression || "")}</code></td>
          <td><small><code>${automationEscapeHtml(
            item.command || ""
          )}</code></small></td>
        `;
        tbody.appendChild(tr);
      });

      document.getElementById("automation-cron-existing-empty").style.display =
        "none";
      document.getElementById(
        "automation-cron-existing-table-wrap"
      ).style.display = "block";

      // Preencher campos com o primeiro agendamento, se houver
      if (items.length > 0) {
        const expr = String(items[0].expression || "").trim();
        if (expr) {
          const parts = expr.split(" ");
          if (parts.length >= 5) {
            document.getElementById("automation-cron-minute").value = parts[0];
            document.getElementById("automation-cron-hour").value = parts[1];
            document.getElementById("automation-cron-day").value = parts[2];
            document.getElementById("automation-cron-month").value = parts[3];
            document.getElementById("automation-cron-weekday").value = parts[4];
          }
        }
      }

      return items;
    })
    .catch((error) => {
      automationShowError(
        "Erro ao carregar agendamentos: " + automationFormatCockpitError(error)
      );
      return [];
    });
}

function automationApplyCronPreset() {
  const preset = document.getElementById("automation-cron-preset").value;
  if (preset) {
    const parts = preset.split(" ");
    document.getElementById("automation-cron-minute").value = parts[0];
    document.getElementById("automation-cron-hour").value = parts[1];
    document.getElementById("automation-cron-day").value = parts[2];
    document.getElementById("automation-cron-month").value = parts[3];
    document.getElementById("automation-cron-weekday").value = parts[4];
  }
}

function automationSaveCron() {
  const scriptName = document.getElementById(
    "automation-cron-script-name"
  ).value;
  if (!scriptName) {
    automationShowError("Selecione um script para criar o agendamento");
    return;
  }

  const minute = document.getElementById("automation-cron-minute").value;
  const hour = document.getElementById("automation-cron-hour").value;
  const day = document.getElementById("automation-cron-day").value;
  const month = document.getElementById("automation-cron-month").value;
  const weekday = document.getElementById("automation-cron-weekday").value;

  const cronExpression = `${minute} ${hour} ${day} ${month} ${weekday}`;

  // Buscar caminho completo do script
  const script = window.allScripts.find((s) => s.name === scriptName);
  const scriptPath = script ? script.path : scriptName;

  console.log(
    "Automation: Salvando agendamento para:",
    scriptName,
    cronExpression
  );
  automationShowLoading(true);
  automationCloseCronModal();

  cockpit
    .spawn(
      [
        "/usr/share/cockpit/scheduling_exec/scripts/set-cron.sh",
        scriptPath,
        cronExpression,
      ],
      { err: "message" }
    )
    .then(() => {
      automationShowLoading(false);
      console.log("Automation: Agendamento salvo com sucesso");
      showAlert("success", `✅ Agendamento configurado para ${scriptName}!`);
      automationLoadScripts();
    })
    .catch((error) => {
      automationShowLoading(false);
      console.error("Automation: Erro ao configurar agendamento:", error);
      automationShowError(
        "Erro ao configurar agendamento: " + automationFormatCockpitError(error)
      );
    });
}

function automationRemoveCron() {
  const scriptName = document.getElementById(
    "automation-cron-script-name"
  ).value;
  if (!scriptName) {
    automationShowError("Selecione um script para remover agendamentos");
    return;
  }

  if (!confirm(`Remover TODOS os agendamentos do script "${scriptName}"?`)) {
    return;
  }

  // Buscar caminho completo do script
  const script = window.allScripts.find((s) => s.name === scriptName);
  const scriptPath = script ? script.path : scriptName;

  console.log("Automation: Removendo agendamentos de:", scriptName);
  automationShowLoading(true);
  automationCloseCronModal();

  cockpit
    .spawn(
      ["/usr/share/cockpit/scheduling_exec/scripts/remove-cron.sh", scriptPath],
      { err: "message" }
    )
    .then(() => {
      automationShowLoading(false);
      console.log("Automation: Agendamentos removidos com sucesso");
      showAlert(
        "success",
        `✅ Agendamentos do script ${scriptName} removidos!`
      );
      automationLoadScripts();
    })
    .catch((error) => {
      automationShowLoading(false);
      console.error("Automation: Erro ao remover agendamento:", error);
      automationShowError(
        "Erro ao remover agendamento: " + automationFormatCockpitError(error)
      );
    });
}

// ============================================================================
// EXPORTAR PARA USO GLOBAL
// ============================================================================

window.automationOpenCreateModal = automationOpenCreateModal;
window.automationCloseScriptModal = automationCloseScriptModal;
window.automationSaveScript = automationSaveScript;
window.automationEditScript = automationEditScript;
window.automationDeleteScript = automationDeleteScript;
window.automationExecuteScript = automationExecuteScript;
window.automationOpenSudoModal = automationOpenSudoModal;
window.automationCloseSudoModal = automationCloseSudoModal;
window.automationExecuteSudo = automationExecuteSudo;
window.automationOpenScriptEnvModal = automationOpenScriptEnvModal;
window.automationCloseScriptEnvModal = automationCloseScriptEnvModal;
window.automationLoadScriptEnvFile = automationLoadScriptEnvFile;
window.automationSaveScriptEnv = automationSaveScriptEnv;
window.automationOpenLogModal = automationOpenLogModal;
window.automationCloseLogModal = automationCloseLogModal;
window.automationLoadScriptLog = automationLoadScriptLog;
window.automationOpenEnvModal = automationOpenEnvModal;
window.automationCloseEnvModal = automationCloseEnvModal;
window.automationLoadEnvFile = automationLoadEnvFile;
window.automationSaveEnv = automationSaveEnv;
window.automationOpenImportModal = automationOpenImportModal;
window.automationCloseImportModal = automationCloseImportModal;
window.automationLoadImportCandidates = automationLoadImportCandidates;
window.automationImportSelectedScripts = automationImportSelectedScripts;
window.automationOpenCronModal = automationOpenCronModal;
window.automationOpenCronManagerModal = automationOpenCronManagerModal;
window.automationCloseCronModal = automationCloseCronModal;
window.automationLoadCronScriptsSelect = automationLoadCronScriptsSelect;
window.automationOnCronScriptSelectChange = automationOnCronScriptSelectChange;
window.automationLoadCronSchedules = automationLoadCronSchedules;
window.automationApplyCronPreset = automationApplyCronPreset;
window.automationSaveCron = automationSaveCron;
window.automationRemoveCron = automationRemoveCron;

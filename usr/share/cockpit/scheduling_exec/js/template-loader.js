/**
 * Template Loader - Carregador de templates modulares
 * v1.5.0 - Luis Gustavo Santarosa Pinto
 *
 * Este módulo permite carregar templates HTML de forma assíncrona,
 * tornando o código mais modular e organizado.
 */

const TemplateLoader = {
  cache: {},
  basePath: "templates/",

  /**
   * Carrega um template HTML
   * @param {string} templateName - Nome do template (sem extensão)
   * @returns {Promise<string>} - Conteúdo HTML do template
   */
  async load(templateName) {
    if (this.cache[templateName]) {
      return this.cache[templateName];
    }

    try {
      const response = await fetch(`${this.basePath}${templateName}.html`);
      if (!response.ok) {
        throw new Error(`Template não encontrado: ${templateName}`);
      }
      const html = await response.text();
      this.cache[templateName] = html;
      return html;
    } catch (error) {
      console.error(`Erro ao carregar template ${templateName}:`, error);
      return "";
    }
  },

  /**
   * Carrega e insere um template em um elemento
   * @param {string} templateName - Nome do template
   * @param {string|HTMLElement} target - Seletor ou elemento alvo
   * @param {string} position - Posição de inserção: 'replace', 'append', 'prepend'
   */
  async loadInto(templateName, target, position = "replace") {
    const html = await this.load(templateName);
    const element =
      typeof target === "string" ? document.querySelector(target) : target;

    if (!element) {
      console.error(`Elemento alvo não encontrado: ${target}`);
      return;
    }

    switch (position) {
      case "append":
        element.insertAdjacentHTML("beforeend", html);
        break;
      case "prepend":
        element.insertAdjacentHTML("afterbegin", html);
        break;
      case "replace":
      default:
        element.innerHTML = html;
        break;
    }
  },

  /**
   * Carrega múltiplos templates em paralelo
   * @param {Array<{name: string, target: string, position?: string}>} templates
   */
  async loadMultiple(templates) {
    const promises = templates.map((t) =>
      this.loadInto(t.name, t.target, t.position || "replace")
    );
    await Promise.all(promises);
  },

  /**
   * Carrega um template de modal
   * @param {string} modalName - Nome do modal (sem prefixo 'modal-')
   */
  async loadModal(modalName) {
    return this.load(`modals/modal-${modalName}`);
  },

  /**
   * Limpa o cache de templates
   */
  clearCache() {
    this.cache = {};
  },
};

// Exportar para uso global
window.TemplateLoader = TemplateLoader;

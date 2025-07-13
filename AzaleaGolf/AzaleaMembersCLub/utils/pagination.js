/**
 * SISTEMA DE PAGINACIÓN
 *
 * Este módulo proporciona un sistema de paginación completo para manejar
 * grandes cantidades de datos de forma eficiente.
 *
 * Características:
 * - Paginación de datos
 * - Navegación entre páginas
 * - Configuración de elementos por página
 * - Filtrado y ordenamiento
 * - Lazy loading
 * - Indicadores de carga
 */

import { appConfig } from "../config.js";
import { showNotification } from "./errorHandler.js";

/**
 * CLASE PRINCIPAL DE PAGINACIÓN
 * Gestiona la paginación de cualquier conjunto de datos
 */
class PaginationManager {
  constructor(container, options = {}) {
    // Contenedor donde se mostrarán los datos
    this.container = container;

    // Configuración por defecto
    this.config = {
      itemsPerPage:
        options.itemsPerPage || appConfig.pagination.sessionsPerPage,
      maxPages: options.maxPages || 10,
      showPageNumbers: options.showPageNumbers !== false,
      showNavigation: options.showNavigation !== false,
      showInfo: options.showInfo !== false,
      enableLazyLoading: options.enableLazyLoading || false,
      ...options,
    };

    // Estado de la paginación
    this.state = {
      currentPage: 1,
      totalItems: 0,
      totalPages: 0,
      items: [],
      filteredItems: [],
      sortColumn: null,
      sortDirection: "asc",
      filter: null,
      isLoading: false,
    };

    // Elementos del DOM
    this.elements = {
      content: null,
      pagination: null,
      info: null,
      loading: null,
    };

    // Callbacks
    this.callbacks = {
      onPageChange: options.onPageChange || null,
      onDataLoad: options.onDataLoad || null,
      onSort: options.onSort || null,
      onFilter: options.onFilter || null,
    };

    // Inicializar
    this.init();
  }

  /**
   * INICIALIZAR EL SISTEMA DE PAGINACIÓN
   * Configura los elementos del DOM y los event listeners
   */
  init() {
    this.createElements();
    this.setupEventListeners();
    this.render();
  }

  /**
   * CREAR ELEMENTOS DEL DOM
   * Crea los elementos necesarios para la paginación
   */
  createElements() {
    // Crear contenedor de contenido
    this.elements.content = document.createElement("div");
    this.elements.content.className = "pagination-content";
    this.container.appendChild(this.elements.content);

    // Crear contenedor de información
    if (this.config.showInfo) {
      this.elements.info = document.createElement("div");
      this.elements.info.className = "pagination-info";
      this.container.appendChild(this.elements.info);
    }

    // Crear contenedor de paginación
    if (this.config.showNavigation) {
      this.elements.pagination = document.createElement("div");
      this.elements.pagination.className = "pagination-navigation";
      this.container.appendChild(this.elements.pagination);
    }

    // Crear indicador de carga
    this.elements.loading = document.createElement("div");
    this.elements.loading.className = "pagination-loading";
    this.elements.loading.innerHTML = `
      <div class="loading-spinner">
        <div class="spinner"></div>
        <span>Cargando...</span>
      </div>
    `;
    this.elements.loading.style.display = "none";
    this.container.appendChild(this.elements.loading);
  }

  /**
   * CONFIGURAR EVENT LISTENERS
   * Configura los eventos para la navegación
   */
  setupEventListeners() {
    if (this.elements.pagination) {
      this.elements.pagination.addEventListener("click", (e) => {
        if (e.target.classList.contains("page-btn")) {
          e.preventDefault();
          const page = parseInt(e.target.dataset.page);
          this.goToPage(page);
        } else if (e.target.classList.contains("prev-btn")) {
          e.preventDefault();
          this.previousPage();
        } else if (e.target.classList.contains("next-btn")) {
          e.preventDefault();
          this.nextPage();
        }
      });
    }
  }

  /**
   * CARGAR DATOS
   * Carga los datos y aplica la paginación
   *
   * @param {Array} items - Array de datos a paginar
   * @param {boolean} resetPage - Si resetear a la primera página
   */
  loadData(items, resetPage = true) {
    try {
      this.state.items = items || [];
      this.state.totalItems = this.state.items.length;
      this.state.filteredItems = [...this.state.items];

      if (resetPage) {
        this.state.currentPage = 1;
      }

      this.calculateTotalPages();
      this.render();

      if (this.callbacks.onDataLoad) {
        this.callbacks.onDataLoad(this.getCurrentPageData());
      }
    } catch (error) {
      console.error("Error al cargar datos:", error);
      showNotification("Error al cargar los datos", "error");
    }
  }

  /**
   * CALCULAR TOTAL DE PÁGINAS
   * Calcula el número total de páginas basado en los elementos por página
   */
  calculateTotalPages() {
    this.state.totalPages = Math.ceil(
      this.state.filteredItems.length / this.config.itemsPerPage
    );

    // Asegurar que la página actual sea válida
    if (this.state.currentPage > this.state.totalPages) {
      this.state.currentPage = Math.max(1, this.state.totalPages);
    }
  }

  /**
   * OBTENER DATOS DE LA PÁGINA ACTUAL
   * Retorna los elementos de la página actual
   *
   * @returns {Array} Elementos de la página actual
   */
  getCurrentPageData() {
    const startIndex = (this.state.currentPage - 1) * this.config.itemsPerPage;
    const endIndex = startIndex + this.config.itemsPerPage;
    return this.state.filteredItems.slice(startIndex, endIndex);
  }

  /**
   * IR A UNA PÁGINA ESPECÍFICA
   * Navega a la página especificada
   *
   * @param {number} page - Número de página
   */
  goToPage(page) {
    if (
      page < 1 ||
      page > this.state.totalPages ||
      page === this.state.currentPage
    ) {
      return;
    }

    this.state.currentPage = page;
    this.render();

    if (this.callbacks.onPageChange) {
      this.callbacks.onPageChange(this.getCurrentPageData(), page);
    }
  }

  /**
   * PÁGINA ANTERIOR
   * Navega a la página anterior
   */
  previousPage() {
    this.goToPage(this.state.currentPage - 1);
  }

  /**
   * PÁGINA SIGUIENTE
   * Navega a la página siguiente
   */
  nextPage() {
    this.goToPage(this.state.currentPage + 1);
  }

  /**
   * ORDENAR DATOS
   * Ordena los datos por una columna específica
   *
   * @param {string} column - Columna por la cual ordenar
   * @param {string} direction - Dirección del ordenamiento (asc/desc)
   */
  sort(column, direction = "asc") {
    try {
      this.state.sortColumn = column;
      this.state.sortDirection = direction;

      this.state.filteredItems.sort((a, b) => {
        let aVal = a[column];
        let bVal = b[column];

        // Manejar valores nulos o undefined
        if (aVal === null || aVal === undefined) aVal = "";
        if (bVal === null || bVal === undefined) bVal = "";

        // Convertir a números si es posible
        if (!isNaN(aVal) && !isNaN(bVal)) {
          aVal = parseFloat(aVal);
          bVal = parseFloat(bVal);
        } else {
          aVal = String(aVal).toLowerCase();
          bVal = String(bVal).toLowerCase();
        }

        if (direction === "asc") {
          return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
        } else {
          return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
        }
      });

      this.state.currentPage = 1; // Resetear a la primera página
      this.calculateTotalPages();
      this.render();

      if (this.callbacks.onSort) {
        this.callbacks.onSort(column, direction);
      }
    } catch (error) {
      console.error("Error al ordenar datos:", error);
      showNotification("Error al ordenar los datos", "error");
    }
  }

  /**
   * FILTRAR DATOS
   * Filtra los datos según un criterio
   *
   * @param {Function|string} filter - Función de filtrado o texto de búsqueda
   */
  filter(filter) {
    try {
      this.state.filter = filter;

      if (typeof filter === "function") {
        this.state.filteredItems = this.state.items.filter(filter);
      } else if (typeof filter === "string" && filter.trim()) {
        const searchTerm = filter.toLowerCase();
        this.state.filteredItems = this.state.items.filter((item) => {
          return Object.values(item).some((value) =>
            String(value).toLowerCase().includes(searchTerm)
          );
        });
      } else {
        this.state.filteredItems = [...this.state.items];
      }

      this.state.currentPage = 1; // Resetear a la primera página
      this.calculateTotalPages();
      this.render();

      if (this.callbacks.onFilter) {
        this.callbacks.onFilter(filter);
      }
    } catch (error) {
      console.error("Error al filtrar datos:", error);
      showNotification("Error al filtrar los datos", "error");
    }
  }

  /**
   * MOSTRAR INDICADOR DE CARGA
   * Muestra u oculta el indicador de carga
   *
   * @param {boolean} show - Si mostrar el indicador
   */
  showLoading(show = true) {
    this.state.isLoading = show;
    if (this.elements.loading) {
      this.elements.loading.style.display = show ? "block" : "none";
    }
  }

  /**
   * RENDERIZAR LA PAGINACIÓN
   * Actualiza la interfaz de usuario
   */
  render() {
    this.renderInfo();
    this.renderNavigation();
    this.renderContent();
  }

  /**
   * RENDERIZAR INFORMACIÓN
   * Muestra información sobre la paginación actual
   */
  renderInfo() {
    if (!this.elements.info) return;

    const startItem =
      (this.state.currentPage - 1) * this.config.itemsPerPage + 1;
    const endItem = Math.min(
      this.state.currentPage * this.config.itemsPerPage,
      this.state.filteredItems.length
    );

    this.elements.info.innerHTML = `
      <span>Mostrando ${startItem}-${endItem} de ${
      this.state.filteredItems.length
    } elementos</span>
      ${this.state.filter ? `<span class="filter-info">(filtrado)</span>` : ""}
    `;
  }

  /**
   * RENDERIZAR NAVEGACIÓN
   * Crea los controles de navegación
   */
  renderNavigation() {
    if (!this.elements.pagination) return;

    const pages = this.generatePageNumbers();

    this.elements.pagination.innerHTML = `
      <div class="pagination-controls">
        <button class="prev-btn" ${
          this.state.currentPage === 1 ? "disabled" : ""
        }>
          <i class="fas fa-chevron-left"></i> Anterior
        </button>
        
        ${
          this.config.showPageNumbers
            ? `
          <div class="page-numbers">
            ${pages
              .map(
                (page) => `
              <button class="page-btn ${
                page === this.state.currentPage ? "active" : ""
              }" 
                      data-page="${page}" ${page === "..." ? "disabled" : ""}>
                ${page}
              </button>
            `
              )
              .join("")}
          </div>
        `
            : ""
        }
        
        <button class="next-btn" ${
          this.state.currentPage === this.state.totalPages ? "disabled" : ""
        }>
          Siguiente <i class="fas fa-chevron-right"></i>
        </button>
      </div>
    `;
  }

  /**
   * GENERAR NÚMEROS DE PÁGINA
   * Genera los números de página a mostrar
   *
   * @returns {Array} Array de números de página
   */
  generatePageNumbers() {
    const pages = [];
    const current = this.state.currentPage;
    const total = this.state.totalPages;
    const maxPages = this.config.maxPages;

    if (total <= maxPages) {
      // Mostrar todas las páginas si hay pocas
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
    } else {
      // Mostrar páginas con elipsis
      if (current <= Math.ceil(maxPages / 2)) {
        // Al inicio
        for (let i = 1; i <= maxPages - 1; i++) {
          pages.push(i);
        }
        pages.push("...");
        pages.push(total);
      } else if (current >= total - Math.floor(maxPages / 2)) {
        // Al final
        pages.push(1);
        pages.push("...");
        for (let i = total - maxPages + 2; i <= total; i++) {
          pages.push(i);
        }
      } else {
        // En el medio
        pages.push(1);
        pages.push("...");
        const start = current - Math.floor(maxPages / 2) + 1;
        const end = current + Math.floor(maxPages / 2) - 1;
        for (let i = start; i <= end; i++) {
          pages.push(i);
        }
        pages.push("...");
        pages.push(total);
      }
    }

    return pages;
  }

  /**
   * RENDERIZAR CONTENIDO
   * Renderiza el contenido de la página actual
   */
  renderContent() {
    // Esta función debe ser sobrescrita por las clases que hereden
    // o configurada a través de callbacks
    if (this.callbacks.onPageChange) {
      this.callbacks.onPageChange(
        this.getCurrentPageData(),
        this.state.currentPage
      );
    }
  }

  /**
   * ACTUALIZAR CONFIGURACIÓN
   * Permite cambiar la configuración en tiempo de ejecución
   *
   * @param {Object} newConfig - Nueva configuración
   */
  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    this.calculateTotalPages();
    this.render();
  }

  /**
   * OBTENER ESTADO ACTUAL
   * Retorna el estado actual de la paginación
   *
   * @returns {Object} Estado de la paginación
   */
  getState() {
    return { ...this.state };
  }

  /**
   * DESTRUIR
   * Limpia los recursos y elementos del DOM
   */
  destroy() {
    if (this.elements.content) {
      this.elements.content.remove();
    }
    if (this.elements.pagination) {
      this.elements.pagination.remove();
    }
    if (this.elements.info) {
      this.elements.info.remove();
    }
    if (this.elements.loading) {
      this.elements.loading.remove();
    }
  }
}

/**
 * PAGINACIÓN PARA TABLAS
 * Extensión específica para paginar tablas de datos
 */
class TablePagination extends PaginationManager {
  constructor(container, options = {}) {
    super(container, options);

    this.tableConfig = {
      columns: options.columns || [],
      rowRenderer: options.rowRenderer || null,
      emptyMessage: options.emptyMessage || "No hay datos para mostrar",
      ...options,
    };
  }

  /**
   * RENDERIZAR CONTENIDO DE TABLA
   * Renderiza la tabla con los datos de la página actual
   */
  renderContent() {
    const data = this.getCurrentPageData();

    if (data.length === 0) {
      this.elements.content.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-inbox"></i>
          <p>${this.tableConfig.emptyMessage}</p>
        </div>
      `;
      return;
    }

    // Crear tabla
    const table = document.createElement("table");
    table.className = "pagination-table";

    // Crear encabezado
    if (this.tableConfig.columns.length > 0) {
      const thead = document.createElement("thead");
      const headerRow = document.createElement("tr");

      this.tableConfig.columns.forEach((column) => {
        const th = document.createElement("th");
        th.textContent = column.title || column.key;

        if (column.sortable !== false) {
          th.classList.add("sortable");
          th.addEventListener("click", () => {
            const direction =
              this.state.sortColumn === column.key &&
              this.state.sortDirection === "asc"
                ? "desc"
                : "asc";
            this.sort(column.key, direction);
          });
        }

        headerRow.appendChild(th);
      });

      thead.appendChild(headerRow);
      table.appendChild(thead);
    }

    // Crear cuerpo
    const tbody = document.createElement("tbody");

    data.forEach((item, index) => {
      const row = document.createElement("tr");

      if (this.tableConfig.rowRenderer) {
        // Usar renderizador personalizado
        row.innerHTML = this.tableConfig.rowRenderer(item, index);
      } else {
        // Renderizado por defecto
        this.tableConfig.columns.forEach((column) => {
          const td = document.createElement("td");
          td.textContent = item[column.key] || "";
          row.appendChild(td);
        });
      }

      tbody.appendChild(row);
    });

    table.appendChild(tbody);

    // Limpiar contenido anterior y agregar tabla
    this.elements.content.innerHTML = "";
    this.elements.content.appendChild(table);
  }
}

/**
 * PAGINACIÓN PARA LISTAS
 * Extensión específica para paginar listas de elementos
 */
class ListPagination extends PaginationManager {
  constructor(container, options = {}) {
    super(container, options);

    this.listConfig = {
      itemRenderer: options.itemRenderer || null,
      emptyMessage: options.emptyMessage || "No hay elementos para mostrar",
      itemClass: options.itemClass || "pagination-item",
      ...options,
    };
  }

  /**
   * RENDERIZAR CONTENIDO DE LISTA
   * Renderiza la lista con los elementos de la página actual
   */
  renderContent() {
    const data = this.getCurrentPageData();

    if (data.length === 0) {
      this.elements.content.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-list"></i>
          <p>${this.listConfig.emptyMessage}</p>
        </div>
      `;
      return;
    }

    // Crear lista
    const list = document.createElement("div");
    list.className = "pagination-list";

    data.forEach((item, index) => {
      const listItem = document.createElement("div");
      listItem.className = this.listConfig.itemClass;

      if (this.listConfig.itemRenderer) {
        // Usar renderizador personalizado
        listItem.innerHTML = this.listConfig.itemRenderer(item, index);
      } else {
        // Renderizado por defecto
        listItem.textContent = JSON.stringify(item);
      }

      list.appendChild(listItem);
    });

    // Limpiar contenido anterior y agregar lista
    this.elements.content.innerHTML = "";
    this.elements.content.appendChild(list);
  }
}

// Exportar clases y funciones
export { PaginationManager, TablePagination, ListPagination };

// Exportar instancia por defecto (para compatibilidad)
export default PaginationManager;

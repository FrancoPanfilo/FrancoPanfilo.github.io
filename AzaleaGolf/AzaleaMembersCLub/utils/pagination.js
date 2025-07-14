import { appConfig } from "../config.js";
import { showNotification } from "./errorHandler.js";

class PaginationManager {
  constructor(container, options = {}) {
    this.container = container;

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

    this.elements = {
      content: null,
      pagination: null,
      info: null,
      loading: null,
    };

    this.callbacks = {
      onPageChange: options.onPageChange || null,
      onDataLoad: options.onDataLoad || null,
      onSort: options.onSort || null,
      onFilter: options.onFilter || null,
    };

    this.init();
  }

  init() {
    this.createElements();
    this.setupEventListeners();
    this.render();
  }

  createElements() {
    this.elements.content = document.createElement("div");
    this.elements.content.className = "pagination-content";
    this.container.appendChild(this.elements.content);

    if (this.config.showInfo) {
      this.elements.info = document.createElement("div");
      this.elements.info.className = "pagination-info";
      this.container.appendChild(this.elements.info);
    }

    if (this.config.showNavigation) {
      this.elements.pagination = document.createElement("div");
      this.elements.pagination.className = "pagination-navigation";
      this.container.appendChild(this.elements.pagination);
    }

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
      
      showNotification("Error al cargar los datos", "error");
    }
  }

  calculateTotalPages() {
    this.state.totalPages = Math.ceil(
      this.state.filteredItems.length / this.config.itemsPerPage
    );

    if (this.state.currentPage > this.state.totalPages) {
      this.state.currentPage = Math.max(1, this.state.totalPages);
    }
  }

  getCurrentPageData() {
    const startIndex = (this.state.currentPage - 1) * this.config.itemsPerPage;
    const endIndex = startIndex + this.config.itemsPerPage;
    return this.state.filteredItems.slice(startIndex, endIndex);
  }

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

  previousPage() {
    this.goToPage(this.state.currentPage - 1);
  }

  nextPage() {
    this.goToPage(this.state.currentPage + 1);
  }

  sort(column, direction = "asc") {
    try {
      this.state.sortColumn = column;
      this.state.sortDirection = direction;

      this.state.filteredItems.sort((a, b) => {
        let aVal = a[column];
        let bVal = b[column];

        if (aVal === null || aVal === undefined) aVal = "";
        if (bVal === null || bVal === undefined) bVal = "";

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

      this.state.currentPage = 1;
      this.calculateTotalPages();
      this.render();

      if (this.callbacks.onSort) {
        this.callbacks.onSort(column, direction);
      }
    } catch (error) {
      
      showNotification("Error al ordenar los datos", "error");
    }
  }

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

      this.state.currentPage = 1;
      this.calculateTotalPages();
      this.render();

      if (this.callbacks.onFilter) {
        this.callbacks.onFilter(filter);
      }
    } catch (error) {
      
      showNotification("Error al filtrar los datos", "error");
    }
  }

  showLoading(show = true) {
    this.state.isLoading = show;
    if (this.elements.loading) {
      this.elements.loading.style.display = show ? "block" : "none";
    }
  }

  render() {
    this.renderInfo();
    this.renderNavigation();
    this.renderContent();
  }

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

  generatePageNumbers() {
    const pages = [];
    const current = this.state.currentPage;
    const total = this.state.totalPages;
    const maxPages = this.config.maxPages;

    if (total <= maxPages) {
      for (let i = 1; i <= total; i++) {
        pages.push(i);
      }
    } else {
      if (current <= Math.ceil(maxPages / 2)) {
        for (let i = 1; i <= maxPages - 1; i++) {
          pages.push(i);
        }
        pages.push("...");
        pages.push(total);
      } else if (current >= total - Math.floor(maxPages / 2)) {
        pages.push(1);
        pages.push("...");
        for (let i = total - maxPages + 2; i <= total; i++) {
          pages.push(i);
        }
      } else {
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

  renderContent() {
    if (this.callbacks.onPageChange) {
      this.callbacks.onPageChange(
        this.getCurrentPageData(),
        this.state.currentPage
      );
    }
  }

  updateConfig(newConfig) {
    this.config = { ...this.config, ...newConfig };
    this.calculateTotalPages();
    this.render();
  }

  getState() {
    return { ...this.state };
  }

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

    const table = document.createElement("table");
    table.className = "pagination-table";

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

    const tbody = document.createElement("tbody");

    data.forEach((item, index) => {
      const row = document.createElement("tr");

      if (this.tableConfig.rowRenderer) {
        row.innerHTML = this.tableConfig.rowRenderer(item, index);
      } else {
        this.tableConfig.columns.forEach((column) => {
          const td = document.createElement("td");
          td.textContent = item[column.key] || "";
          row.appendChild(td);
        });
      }

      tbody.appendChild(row);
    });

    table.appendChild(tbody);

    this.elements.content.innerHTML = "";
    this.elements.content.appendChild(table);
  }
}

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

    const list = document.createElement("div");
    list.className = "pagination-list";

    data.forEach((item, index) => {
      const listItem = document.createElement("div");
      listItem.className = this.listConfig.itemClass;

      if (this.listConfig.itemRenderer) {
        listItem.innerHTML = this.listConfig.itemRenderer(item, index);
      } else {
        listItem.textContent = JSON.stringify(item);
      }

      list.appendChild(listItem);
    });

    this.elements.content.innerHTML = "";
    this.elements.content.appendChild(list);
  }
}

export { PaginationManager, TablePagination, ListPagination };
export default PaginationManager;

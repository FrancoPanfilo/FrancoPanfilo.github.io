import { auth, db } from "../firebase.js";
import {
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
} from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js";
import { exportSessionToPDF } from "./pdfExport.js";
import { createYardageBook } from "./yardageBook.js";
import {
  formatClubName,
  getClubColor,
  clubColors,
  getClubOrder,
} from "../shared/utils/constants.js";

// Fixed column order (excluding club name and shot number)
const fixedColumns = [
  "ball speed (mph)",
  "launch angle (deg)",
  "back spin (rpm)",
  "side spin (rpm l-/r+)",
  "carry (yds)",
  "total distance (yds)",
  "peak height (yds)",
  "descent angle (deg)",
  "club speed (mph)",
  "efficiency",
  "angle of attack (deg)",
  "club path (deg out-in-/in-out+)",
];

// Format column display names
function formatColumnDisplayName(columnName) {
  const displayNames = {
    "ball speed (mph)": "Ball Speed",
    "launch angle (deg)": "Launch Angle",
    "back spin (rpm)": "Back Spin",
    "side spin (rpm l-/r+)": "Side Spin",
    "carry (yds)": "Carry",
    "total distance (yds)": "Total Distance",
    "peak height (yds)": "Peak Height",
    "descent angle (deg)": "Descent Angle",
    "club speed (mph)": "Club Speed",
    efficiency: "Efficiency",
    "angle of attack (deg)": "Angle of Attack",
    "club path (deg out-in-/in-out+)": "Club Path",
  };
  return displayNames[columnName] || columnName;
}

// Toggle column selection
function toggleColumnSelection(columnName) {
  if (selectedColumns.has(columnName)) {
    selectedColumns.delete(columnName);
  } else {
    selectedColumns.add(columnName);
  }
  saveSelectedColumns();
  updateColumnCount();
  event.stopPropagation();
}

// Get active (selected) columns
function getActiveColumns() {
  return fixedColumns.filter((col) => selectedColumns.has(col));
}

// Format values consistently
function formatValue(value, column, shot = null) {
  if (value === undefined || value === null || value === "") {
    return "-";
  }

  const numValue = parseFloat(value);
  if (isNaN(numValue)) {
    return value;
  }

  if (
    [
      "club speed (mph)",
      "efficiency",
      "angle of attack (deg)",
      "club path (deg out-in-/in-out+)",
    ].includes(column)
  ) {
    if (column === "club speed (mph)") {
      if (numValue >= 550 || numValue <= 0) {
        return "-";
      }
    } else if (shot) {
      const clubSpeed = parseFloat(shot["club speed (mph)"]);
      if (!clubSpeed || clubSpeed >= 550 || clubSpeed <= 0) {
        return "-";
      }
    }
  }

  if (column === "efficiency") {
    return numValue.toFixed(2);
  } else if (column.includes("angle") || column.includes("path")) {
    return numValue.toFixed(1);
  } else if (column.includes("speed")) {
    return numValue.toFixed(1);
  } else if (column.includes("spin")) {
    return Math.round(numValue);
  } else if (column.includes("distance") || column.includes("height")) {
    return numValue.toFixed(1);
  }
  return numValue.toFixed(1);
}

// Show column selector modal
function showColumnSelector() {
  const existingModal = document.getElementById("columnSelectorModal");
  if (existingModal) existingModal.remove();

  const maxSelectable = getMaxSelectableColumns();

  const modalHTML = `
    <div id="columnSelectorModal" class="modal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>Seleccionar Columnas</h3>
          <div class="column-count">
            <span id="selectedColumnsCount">${
              selectedColumns.size
            }</span> de ${maxSelectable} columnas permitidas
          </div>
          <button class="close-modal" onclick="closeColumnSelector()">&times;</button>
        </div>
        <div class="modal-body">
          <div class="column-selector">
            ${fixedColumns
              .map(
                (col) => `
              <label class="column-checkbox">
                <input type="checkbox" 
                       value="${col}" 
                       ${selectedColumns.has(col) ? "checked" : ""}
                       onchange="toggleColumnSelection('${col}')">
                <span>${formatColumnDisplayName(col)}</span>
              </label>
            `
              )
              .join("")}
          </div>
          <div id="columnLimitMsg" style="color: #ffb3b3; display: none; margin-top: 8px; text-align: center; font-size: 0.9em;">
            ¡Has alcanzado el máximo de columnas visibles para tu pantalla!
          </div>
        </div>
        <div class="modal-footer">
          <button onclick="resetToDefaultColumns()" class="reset-btn">
            <i class="fas fa-undo"></i> Restablecer
          </button>
          <button onclick="applyColumnSelection()" class="apply-btn">
            <i class="fas fa-check"></i> Aplicar
          </button>
          <button onclick="closeColumnSelector()" class="cancel-btn">
            <i class="fas fa-times"></i> Cancelar
          </button>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML("beforeend", modalHTML);
  const modal = document.getElementById("columnSelectorModal");
  setTimeout(() => {
    modal.style.display = "flex";
    modal.classList.add("show");
  }, 10);

  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      closeColumnSelector();
    }
  });

  const checkboxes = modal.querySelectorAll('input[type="checkbox"]');
  checkboxes.forEach((checkbox) => {
    checkbox.addEventListener("click", (event) => event.stopPropagation());
    checkbox.addEventListener("change", (event) => {
      const checkedCount = Array.from(checkboxes).filter(
        (cb) => cb.checked
      ).length;
      if (checkedCount > maxSelectable) {
        checkbox.checked = false;
        document.getElementById("columnLimitMsg").style.display = "block";
        setTimeout(() => {
          document.getElementById("columnLimitMsg").style.display = "none";
        }, 2000);
      }
    });
  });
}

// Update column count in modal
function updateColumnCount() {
  const countElement = document.getElementById("selectedColumnsCount");
  if (countElement) {
    countElement.textContent = selectedColumns.size;
  }
}

// Apply column selection and close modal
function applyColumnSelection() {
  saveSelectedColumns();
  if (currentData.length > 0) {
    const activeSession = document.querySelector(".session-item.active");
    const sessionIndex = activeSession
      ? parseInt(activeSession.dataset.index)
      : 0;
    displayShotsTable(currentData, sessionIndex);
  }
  closeColumnSelector();
}

// Global state
let currentData = [];
let currentSort = { column: null, ascending: true };
let currentFilter = null;
let clubVisibility = {};
let selectedColumns = new Set([
  "carry (yds)",
  "peak height (yds)",
  "club speed (mph)",
  "efficiency",
  "club path (deg out-in-/in-out+)",
]);
let yardageBookSessions = new Set();
let sortedSessions = [];
let selectedClubsForYardageBook = new Set();
let currentPage = 0;
let selectedUserUid = null;

// Check if shot is selected
function isShotSelected(shot) {
  return shot.TiroDesactivado !== true;
}

// Calculate club averages
function calculateClubAverages(club, shots) {
  const selectedRows = shots.filter(isShotSelected);
  if (selectedRows.length === 0) {
    return getActiveColumns().map(() => "-");
  }

  return getActiveColumns().map((col) => {
    if (
      [
        "club speed (mph)",
        "efficiency",
        "angle of attack (deg)",
        "club path (deg out-in-/in-out+)",
      ].includes(col)
    ) {
      const validRows = selectedRows.filter((row) => {
        const clubSpeed = parseFloat(row["club speed (mph)"]);
        return clubSpeed && clubSpeed < 550 && clubSpeed > 0;
      });
      if (validRows.length === 0) return "-";
      const values = validRows
        .map((row) => parseFloat(row[col]))
        .filter((val) => !isNaN(val));
      if (values.length === 0) return "-";
      const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
      return col === "efficiency"
        ? avg.toFixed(2)
        : col.includes("angle") || col.includes("path")
        ? avg.toFixed(1)
        : col.includes("speed")
        ? avg.toFixed(1)
        : avg.toFixed(1);
    } else {
      const values = selectedRows
        .map((row) => parseFloat(row[col]))
        .filter((val) => !isNaN(val));
      if (values.length === 0) return "-";
      const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
      return col === "efficiency"
        ? avg.toFixed(2)
        : col.includes("angle") || col.includes("path")
        ? avg.toFixed(1)
        : col.includes("speed")
        ? avg.toFixed(1)
        : col.includes("spin")
        ? Math.round(avg)
        : col.includes("distance") ||
          col.includes("carry") ||
          col.includes("height")
        ? Math.round(avg)
        : avg.toFixed(1);
    }
  });
}

// Update club averages in table
function updateClubAverages() {
  document.querySelectorAll(".average-row").forEach((row) => {
    const club = row.dataset.club;
    const clubShots = currentData.filter((shot) => shot["club name"] == club);
    const averages = calculateClubAverages(club, clubShots);
    const cells = row.querySelectorAll("td");
    for (let i = 2; i < cells.length; i++) {
      cells[i].textContent = averages[i - 2] || "-";
    }
  });
}

// Save selected columns
function saveSelectedColumns() {
  localStorage.setItem("selectedColumns", JSON.stringify([...selectedColumns]));
  showSaveIndicator();
}

// Show save indicator for visual feedback
function showSaveIndicator() {
  let indicator = document.getElementById("saveIndicator");
  if (!indicator) {
    indicator = document.createElement("div");
    indicator.id = "saveIndicator";
    indicator.className = "save-indicator";
    indicator.innerHTML = '<i class="fas fa-check"></i> Preferencias guardadas';
    document.body.appendChild(indicator);
  }
  indicator.style.display = "block";
  indicator.style.opacity = "1";
  setTimeout(() => {
    indicator.style.opacity = "0";
    setTimeout(() => {
      indicator.style.display = "none";
    }, 300);
  }, 2000);
}

// Default columns based on device
function getDefaultColumns() {
  if (window.innerWidth <= 600) {
    return new Set(["carry (yds)", "back spin (rpm)", "efficiency"]);
  }
  return new Set([
    "carry (yds)",
    "peak height (yds)",
    "club speed (mph)",
    "efficiency",
    "club path (deg out-in-/in-out+)",
  ]);
}

// Load selected columns
function loadSelectedColumns() {
  if (window.innerWidth <= 600) {
    selectedColumns = getDefaultColumns();
    saveSelectedColumns();
    return;
  }
  const savedColumns = localStorage.getItem("selectedColumns");
  if (savedColumns) {
    selectedColumns = new Set(JSON.parse(savedColumns));
  } else {
    selectedColumns = getDefaultColumns();
  }
}

// Reset to default columns
function resetToDefaultColumns() {
  selectedColumns = getDefaultColumns();
  saveSelectedColumns();
  updateColumnCheckboxes();
  showResetConfirmation();
}

// Update column checkboxes in modal
function updateColumnCheckboxes() {
  const checkboxes = document.querySelectorAll(
    '#columnSelectorModal input[type="checkbox"]'
  );
  checkboxes.forEach((checkbox) => {
    checkbox.checked = selectedColumns.has(checkbox.value);
  });
}

// Show reset confirmation
function showResetConfirmation() {
  let indicator = document.getElementById("saveIndicator");
  if (!indicator) {
    indicator = document.createElement("div");
    indicator.id = "saveIndicator";
    indicator.className = "save-indicator";
    indicator.innerHTML = '<i class="fas fa-undo"></i> Columnas restablecidas';
    document.body.appendChild(indicator);
  }
  indicator.style.display = "block";
  indicator.style.opacity = "1";
  setTimeout(() => {
    indicator.style.opacity = "0";
    setTimeout(() => {
      indicator.style.display = "none";
    }, 300);
  }, 2000);
}

// Show yardage book modal
async function showYardageBookModal() {
  if (!auth.currentUser) {
    alert("Por favor, inicia sesión para crear un YardageBook");
    return;
  }

  const existingModal = document.getElementById("yardageBookModal");
  if (existingModal) existingModal.remove();

  const modalHTML = `
    <div id="yardageBookModal" class="modal" role="dialog" aria-labelledby="yardageBookModalTitle" aria-modal="true">
      <div class="modal-content yardagebook-modal">
        <div class="modal-header">
          <h3 id="yardageBookModalTitle"><i class="fas fa-list-check"></i>Crear YardageBook Personalizado</h3>
          <button class="close-modal" onclick="closeYardageBookModal()">&times;</button>
        </div>
        <div class="modal-body">
          <!-- SECCIÓN DE SESIONES -->
          <div class="sessions-section">
            <div class="section-header">
              <div class="section-title">
                <i class="fas fa-history"></i>
                <span>Mis Sesiones</span>
              </div>
              <button class="select-all-btn" onclick="toggleAllSessions()" title="Seleccionar/Deseleccionar todas">
                <i class="fas fa-check-double"></i> <span id="sessionsToggleText">Seleccionar todas</span>
              </button>
            </div>
            <div id="yardageBookSessionsList" class="sessions-list-grid"></div>
          </div>

          <!-- SECCIÓN DE PALOS -->
          <div class="clubs-section">
            <div class="section-header">
              <div class="section-title">
                <i class="fas fa-golf-ball"></i>
                <span>Palos Disponibles</span>
              </div>
              <button class="select-all-btn" onclick="toggleAllClubs()" title="Seleccionar/Deseleccionar todos los palos">
                <i class="fas fa-check-double"></i> <span id="clubsToggleText">Seleccionar todos</span>
              </button>
            </div>
            <div id="clubListYardageBook" class="clubs-list-grid"></div>
          </div>

          <!-- AJUSTES AVANZADOS -->
          <div class="advanced-settings">
            <div class="section-header">
              <div class="section-title">
                <i class="fas fa-sliders-h"></i>
                <span>Ajustes Avanzados</span>
              </div>
            </div>
            <div class="settings-grid">
              <div class="setting-group">
                <label>Porcentaje de Desviación: <span id="deviationValue">75%</span></label>
                <input type="range" id="deviationSlider" min="50" max="100" value="75">
                <small>Controla qué tan estrictos son los cálculos de distancia</small>
              </div>
              <div class="setting-group">
                <label>Dispersión Lateral: <span id="lateralValue">75%</span></label>
                <input type="range" id="lateralSlider" min="50" max="100" value="75">
                <small>Controla la precisión de la dispersión lateral</small>
              </div>
              <div class="setting-group">
                <label><input type="checkbox" id="aconadoCheckbox" checked> Formato aconado</label>
                <small>Si está activado, la dispersión nunca decrece entre palos consecutivos</small>
              </div>
            </div>
          </div>
          <div class="yardagebook-info">
            <h5><i class="fas fa-info-circle"></i> Información</h5>
            <p>El YardageBook incluirá las distancias promedio calculadas con los parámetros de precisión seleccionados.</p>
          </div>
        </div>
        <div class="modal-footer">
          <div><i class="fas fa-lightbulb"></i> Tip: Selecciona múltiples sesiones para datos más precisos</div>
          <div>
            <button onclick="createYardageBookFromModal()" class="create-yardagebook-btn">
              <i class="fas fa-download"></i> Descargar YardageBook
            </button>
            <button onclick="closeYardageBookModal()" class="cancel-btn">
              <i class="fas fa-times"></i> Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML("beforeend", modalHTML);
  const modal = document.getElementById("yardageBookModal");

  setTimeout(() => {
    modal.style.display = "flex";
    modal.classList.add("show");
  }, 10);

  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      closeYardageBookModal();
    }
  });

  await loadSessionsForYardageBook();
  setupYardageBookSliders();
}

// Cerrar el modal de YardageBook
function closeYardageBookModal() {
  closeModal("yardageBookModal");
  restoreMainPageState();
}

// Función para seleccionar/deseleccionar todas las sesiones
function toggleAllSessions() {
  const sessionCheckboxes = document.querySelectorAll(
    '.sessions-list-grid input[type="checkbox"]'
  );
  const button = document.querySelector(".section-header .select-all-btn");
  const allChecked = Array.from(sessionCheckboxes).every((cb) => cb.checked);

  sessionCheckboxes.forEach((checkbox) => {
    checkbox.checked = !allChecked;
  });

  // Actualizar texto del botón
  const textSpan = button.querySelector("span");
  if (allChecked) {
    textSpan.textContent = "Seleccionar todas";
    button.innerHTML =
      '<i class="fas fa-check-double"></i> <span>Seleccionar todas</span>';
  } else {
    button.innerHTML =
      '<i class="fas fa-times-circle"></i> <span>Deseleccionar todas</span>';
  }

  updateSelectionInfo();
}

// Función para seleccionar/deseleccionar todos los palos
function toggleAllClubs() {
  const clubCheckboxes = document.querySelectorAll(
    '.clubs-list-grid input[type="checkbox"]'
  );
  const buttons = document.querySelectorAll(".section-header .select-all-btn");
  const clubButton = buttons[1]; // Segundo botón es para palos

  const allChecked = Array.from(clubCheckboxes).every((cb) => cb.checked);

  clubCheckboxes.forEach((checkbox) => {
    checkbox.checked = !allChecked;
  });

  // Actualizar texto del botón
  if (clubButton) {
    if (allChecked) {
      clubButton.innerHTML =
        '<i class="fas fa-check-double"></i> <span>Seleccionar todos</span>';
    } else {
      clubButton.innerHTML =
        '<i class="fas fa-times-circle"></i> <span>Deseleccionar todos</span>';
    }
  }

  updateSelectionInfo();
}

// Función para actualizar información de selección
function updateSelectionInfo() {
  const selectedSessions = document.querySelectorAll(
    '.sessions-list-grid input[type="checkbox"]:checked'
  ).length;
  const selectedClubs = document.querySelectorAll(
    '.clubs-list-grid input[type="checkbox"]:checked'
  ).length;

  // Mostrar contador en los botones si lo deseas
  const headers = document.querySelectorAll(".section-header");
  if (headers[0]) {
    const sessionsBtn = headers[0].querySelector(".select-all-btn span");
    if (sessionsBtn) {
      sessionsBtn.textContent =
        selectedSessions > 0 ? "Deseleccionar todas" : "Seleccionar todas";
    }
  }
  if (headers[1]) {
    const clubsBtn = headers[1].querySelector(".select-all-btn span");
    if (clubsBtn) {
      clubsBtn.textContent =
        selectedClubs > 0 ? "Deseleccionar todos" : "Seleccionar todos";
    }
  }
}

// Cerrar modal genérico
function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove("show");
    setTimeout(() => {
      modal.remove();
    }, 20);
  }
}

// Load sessions for yardage book modal
async function loadSessionsForYardageBook() {
  const user = auth.currentUser;
  if (!user) throw new Error("Usuario no autenticado");
  const userDocRef = doc(db, "Simulador", selectedUserUid || user.uid);
  const userDoc = await getDoc(userDocRef);
  const sessionsList = document.getElementById("yardageBookSessionsList");
  if (!userDoc.exists()) {
    sessionsList.innerHTML = "<p>No se encontraron sesiones.</p>";
    return;
  }
  const sessions = userDoc.data().Sesiones || [];
  loadSelectedSessions(sessions.length);
  if (sessions.length === 0) {
    sessionsList.innerHTML = "<p>No hay sesiones disponibles</p>";
    return;
  }
  sortedSessions = [...sessions].sort(
    (a, b) => new Date(b.fecha) - new Date(a.fecha)
  );
  yardageBookSessions = new Set(sortedSessions.map((_, i) => i));
  saveSelectedSessions();
  updateClubListForYardageBook(sortedSessions);
  sessionsList.innerHTML = "";
  sortedSessions.forEach((session, index) => {
    const validShots = session.datos?.filter(isShotSelected).length || 0;
    const sessionDiv = document.createElement("div");
    sessionDiv.className = "session-item-yardagebook";
    sessionDiv.innerHTML = `
      <label class="session-row-yardagebook">
        <input type="checkbox" id="session${index}" onchange="toggleSessionSelection(${index})" checked>
        <span class="session-date">${new Date(session.fecha).toLocaleDateString(
          "es-ES",
          { year: "numeric", month: "short", day: "numeric" }
        )}</span>
        <span class="session-valid-shots">${validShots} tiros válidos</span>
      </label>
    `;
    sessionsList.appendChild(sessionDiv);
  });
}

// Create yardage book
async function createYardageBookFromModal() {
  if (yardageBookSessions.size === 0) {
    alert("Selecciona al menos una sesión.");
    return;
  }
  if (selectedClubsForYardageBook.size === 0) {
    alert("Selecciona al menos un palo.");
    return;
  }
  const deviationPercentage =
    parseInt(document.getElementById("deviationSlider")?.value || 75) / 100;
  const lateralPercentage =
    parseInt(document.getElementById("lateralSlider")?.value || 75) / 100;
  const formatoAconado = document.getElementById("aconadoCheckbox")?.checked;
  const user = auth.currentUser;
  if (!user) return;
  const userDocRef = doc(db, "Simulador", selectedUserUid || user.uid);
  const userDoc = await getDoc(userDocRef);
  const userData = userDoc.data();
  const selectedSessions = getSelectedSessionsSorted();
  const filteredSessions = selectedSessions.map((session) => ({
    ...session,
    datos: (session.datos || []).filter(
      (shot) =>
        isShotSelected(shot) &&
        selectedClubsForYardageBook.has(shot["club name"])
    ),
  }));
  const button = document.querySelector(".create-yardagebook-btn");
  if (button) {
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creando...';
    button.disabled = true;
  }
  await createYardageBook(
    filteredSessions,
    deviationPercentage,
    lateralPercentage,
    formatoAconado
  );
  if (button) {
    button.innerHTML = '<i class="fas fa-download"></i> Descargar YardageBook';
    button.disabled = false;
  }
  closeYardageBookModal();
  alert("YardageBook creado exitosamente");
}

// Setup sliders for yardage book
function setupYardageBookSliders() {
  const sliders = [
    { id: "deviationSlider", valueId: "deviationValue" },
    { id: "lateralSlider", valueId: "lateralValue" },
  ];
  sliders.forEach(({ id, valueId }) => {
    const slider = document.getElementById(id);
    if (slider) {
      slider.addEventListener("input", () => {
        const valueElement = document.getElementById(valueId);
        if (valueElement) {
          valueElement.textContent = `${slider.value}%`;
          valueElement.style.color =
            slider.value >= 80
              ? "#4caf50"
              : slider.value >= 60
              ? "#ff9800"
              : "#f44336";
        }
      });
    }
  });
}

// Restore main page state
function restoreMainPageState() {
  const activeSession = document.querySelector(".session-item.active");
  if (activeSession && currentData.length > 0) {
    document.getElementById("shotsTableContainer").style.display = "block";
    showSwitchContainer(true);
  }
}

// Display shots table
function displayShotsTable(data, sessionIndex) {
  const shotsTableContainer = document.getElementById("shotsTableContainer");
  if (!shotsTableContainer) return;
  if (!data || data.length === 0) {
    shotsTableContainer.innerHTML = "<p>No hay datos para esta sesión.</p>";
    shotsTableContainer.classList.remove("active");
    return;
  }
  const groupedData = {};
  data.forEach((row, index) => {
    const club = row["club name"];
    if (!groupedData[club]) groupedData[club] = [];
    groupedData[club].push({ ...row, originalIndex: index });
    clubVisibility[club] = false;
  });
  const sortedClubs = Object.keys(groupedData).sort(
    (a, b) => getClubOrder(a) - getClubOrder(b)
  );
  const filteredClubs = currentFilter
    ? sortedClubs.filter((club) => club === currentFilter)
    : sortedClubs;
  filteredClubs.forEach((club) => {
    if (currentSort.column) {
      groupedData[club].sort((a, b) => {
        let valA = a[currentSort.column] || 0;
        let valB = b[currentSort.column] || 0;
        if (typeof valA === "string") valA = valA.toLowerCase();
        if (typeof valB === "string") valB = valB.toLowerCase();
        return currentSort.ascending ? valA - valB || 0 : valB - valA || 0;
      });
    }
  });
  shotsTableContainer.innerHTML = `
    <div class="table-actions">
      <button class="scatter-control-btn" onclick="showColumnSelector()"><i class="fas fa-columns"></i> Seleccionar Columnas</button>
      <button class="scatter-control-btn" onclick="exportToCSV()"><i class="fas fa-file-csv"></i> Exportar a CSV</button>
      <button class="scatter-control-btn" onclick="exportCurrentSessionToPDF()"><i class="fas fa-file-pdf"></i> Exportar a PDF</button>
      <button class="scatter-control-btn" onclick="showYardageBookModal()"><i class="fas fa-book"></i> Crear YardageBook</button>
    </div>
    <table class="shots-table">
      <thead>
        <tr>
          <th class="checkbox-column"><i class="fas fa-eye"></i></th>
          <th class="shot-number-cell">Tiro</th>
          ${getActiveColumns()
            .map(
              (col) => `
            <th onclick="sortTable('${col}')" data-column="${col}">
              ${formatColumnDisplayName(col)}
              <span class="sort-icon">${
                currentSort.column === col
                  ? currentSort.ascending
                    ? "↑"
                    : "↓"
                  : ""
              }</span>
            </th>
          `
            )
            .join("")}
        </tr>
      </thead>
      <tbody>
        ${filteredClubs
          .map(
            (club) => `
            ${averageRowHTML(
              club,
              calculateClubAverages(club, groupedData[club])
            )}
            ${groupedData[club]
              .map(
                (row, shotIndex) => `
                <tr class="shot-row${clubVisibility[club] ? "" : " hidden"}"
                    data-club="${club}"
                    data-original-index="${row.originalIndex}">
                  <td class="checkbox-column">
                    <input type="checkbox"
                      data-shot-number="${row["shot number"]}"
                      onchange="updateShotSelection(${sessionIndex}, ${
                  row["shot number"]
                }, this.checked)"
                      ${isShotSelected(row) ? "checked" : ""}>
                  </td>
                  <td class="shot-number-cell">${row["shot number"]}</td>
                  ${getActiveColumns()
                    .map((col) => `<td>${formatValue(row[col], col, row)}</td>`)
                    .join("")}
                </tr>
              `
              )
              .join("")}
            `
          )
          .join("")}
      </tbody>
    </table>
  `;
  shotsTableContainer.classList.add("active");
  updateClubAverages();
  const activeSession = document.querySelector(".session-item.active");
  if (activeSession) activeSession.dataset.index = sessionIndex;
  toggleViewMode(true);
}

// Update shot selection in Firebase
async function updateShotSelectionInFirebase(
  sessionIndex,
  shotNumber,
  selected
) {
  const user = auth.currentUser;
  if (!user) throw new Error("No hay usuario autenticado");
  const userDocRef = doc(db, "Simulador", selectedUserUid || user.uid);
  const userDoc = await getDoc(userDocRef);
  if (!userDoc.exists()) throw new Error("No se encontraron datos del usuario");
  const userData = userDoc.data();
  const sessions = userData.Sesiones || [];
  if (!sessions[sessionIndex]) throw new Error("Sesión no encontrada");
  const tiroIndex = sessions[sessionIndex].datos.findIndex(
    (shot) => String(shot["shot number"]) === String(shotNumber)
  );
  if (tiroIndex === -1) throw new Error(`Tiro no encontrado: ${shotNumber}`);
  if (selected) {
    delete sessions[sessionIndex].datos[tiroIndex].TiroDesactivado;
  } else {
    sessions[sessionIndex].datos[tiroIndex].TiroDesactivado = true;
  }
  await updateDoc(userDocRef, { Sesiones: sessions });
  const localTiroIndex = currentData.findIndex(
    (shot) => String(shot["shot number"]) === String(shotNumber)
  );
  if (localTiroIndex !== -1) {
    if (selected) {
      delete currentData[localTiroIndex].TiroDesactivado;
    } else {
      currentData[localTiroIndex].TiroDesactivado = true;
    }
  }
}

// Update shot selection
async function updateShotSelection(sessionIndex, shotNumber, checked) {
  const checkbox = document.querySelector(
    `input[data-shot-number="${shotNumber}"]`
  );
  const row = checkbox?.closest("tr");
  if (!checkbox || !row) return;
  try {
    row.style.opacity = "0.7";
    await updateShotSelectionInFirebase(sessionIndex, shotNumber, checked);
    checkbox.checked = checked;
    row.classList.toggle("selected", checked);
    row.classList.toggle("deselected", !checked);
    const affectedShot = currentData.find(
      (shot) => String(shot["shot number"]) === String(shotNumber)
    );
    const affectedClub = affectedShot ? affectedShot["club name"] : null;
    if (affectedClub) {
      const clubRow = document.querySelector(
        `.average-row[data-club="${affectedClub}"]`
      );
      if (clubRow) {
        const clubShots = currentData.filter(
          (shot) => shot["club name"] === affectedClub
        );
        const averages = calculateClubAverages(affectedClub, clubShots);
        const cells = clubRow.querySelectorAll("td");
        for (let i = 2; i < cells.length; i++) {
          cells[i].textContent = averages[i - 2] || "-";
        }
      }
    }
    if (typeof createScatterPlot === "function") {
      const canvas = document.getElementById("scatterCanvas");
      if (canvas && canvas.style.display !== "none") {
        requestAnimationFrame(createScatterPlot);
      }
    }
  } catch (error) {
    checkbox.checked = !checked;
    alert("Error al actualizar la selección.");
  } finally {
    row.style.opacity = "1";
  }
}

// Toggle all shots
async function toggleAllChecks(checked) {
  const sessionIndex = parseInt(
    document.querySelector(".session-item.active")?.dataset.index
  );
  const checkboxes = document.querySelectorAll("input[data-shot-number]");
  if (checkboxes.length === 0) return;
  try {
    const loadingOverlay = document.createElement("div");
    loadingOverlay.className = "loading-overlay";
    loadingOverlay.innerHTML =
      '<div><i class="fas fa-spinner fa-spin"></i><p>Actualizando...</p></div>';
    document.body.appendChild(loadingOverlay);
    checkboxes.forEach((checkbox) => {
      checkbox.disabled = true;
      checkbox.style.opacity = "0.5";
    });
    const updates = Array.from(checkboxes).map((checkbox) =>
      updateShotSelectionInFirebase(
        sessionIndex,
        parseInt(checkbox.dataset.shotNumber),
        checked
      )
    );
    await Promise.all(updates);
    checkboxes.forEach((checkbox) => {
      checkbox.checked = checked;
      checkbox.disabled = false;
      checkbox.style.opacity = "1";
      const row = checkbox.closest("tr");
      if (row) {
        row.classList.toggle("selected", checked);
        row.classList.toggle("deselected", !checked);
      }
    });
    updateClubAverages();
    if (typeof createScatterPlot === "function") {
      const canvas = document.getElementById("scatterCanvas");
      if (canvas && canvas.style.display !== "none") {
        requestAnimationFrame(createScatterPlot);
      }
    }
  } catch (error) {
    alert("Error al actualizar las selecciones.");
  } finally {
    document.querySelector(".loading-overlay")?.remove();
  }
}

// Toggle club shots
function toggleClubShots(club) {
  Object.keys(clubVisibility).forEach((key) => {
    if (key !== club) {
      clubVisibility[key] = false;
      const rows = document.querySelectorAll(`tr.shot-row[data-club="${key}"]`);
      const averageRow = document.querySelector(
        `tr.average-row[data-club="${key}"]`
      );
      rows.forEach((row) => row.classList.add("hidden"));
      if (averageRow) {
        averageRow.classList.remove("expanded");
        const arrow = averageRow.querySelector(".toggle-cell i");
        if (arrow) arrow.style.transform = "rotate(0deg)";
      }
    }
  });
  clubVisibility[club] = !clubVisibility[club];
  const rows = document.querySelectorAll(`tr.shot-row[data-club="${club}"]`);
  const averageRow = document.querySelector(
    `tr.average-row[data-club="${club}"]`
  );
  if (averageRow) {
    rows.forEach((row) =>
      row.classList.toggle("hidden", !clubVisibility[club])
    );
    const arrow = averageRow.querySelector(".toggle-cell i");
    if (clubVisibility[club]) {
      averageRow.classList.add("expanded");
      if (arrow) arrow.style.transform = "rotate(180deg)";
      averageRow.scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
      averageRow.classList.remove("expanded");
      if (arrow) arrow.style.transform = "rotate(0deg)";
    }
  }
}

// Sort table
function sortTable(column) {
  if (currentSort.column === column) {
    currentSort.ascending = !currentSort.ascending;
  } else {
    currentSort = { column, ascending: true };
  }
  document.querySelectorAll("th[data-column]").forEach((th) => {
    const sortIcon = th.querySelector(".sort-icon");
    sortIcon.textContent =
      th.dataset.column === column ? (currentSort.ascending ? "↑" : "↓") : "";
  });
  displayShotsTable(
    currentData,
    parseInt(document.querySelector(".session-item.active").dataset.index)
  );
}

// Update filter
function updateFilter(value) {
  currentFilter = value || null;
  clubVisibility = {};
  currentData.forEach((row) => {
    if (!currentFilter || row["club name"] === currentFilter) {
      clubVisibility[row["club name"]] = false;
    }
  });
  displayShotsTable(currentData, 0);
}

// Export to PDF
async function exportCurrentSessionToPDF() {
  if (!currentData || currentData.length === 0) {
    alert("No hay datos de sesión para exportar");
    return;
  }
  const user = auth.currentUser;
  if (!user) return;
  const userDocRef = doc(db, "Simulador", selectedUserUid || user.uid);
  const userDoc = await getDoc(userDocRef);
  if (!userDoc.exists()) return;
  const userData = userDoc.data();
  const nombreCompleto = `${userData.nombre} ${userData.apellido}`;
  const fechaSesion =
    currentData[0]?.["shot created date"]?.split(" ")[0] ||
    new Date().toISOString().split("T")[0];
  const dataWithSelection = currentData.filter(isShotSelected);
  if (dataWithSelection.length === 0) {
    alert("No hay tiros seleccionados para exportar");
    return;
  }
  await exportSessionToPDF(dataWithSelection, nombreCompleto, fechaSesion);
}

// Export to CSV
function exportToCSV() {
  const filteredClubs = currentFilter
    ? [currentFilter]
    : Object.keys(
        currentData.reduce((a, row) => ({ ...a, [row["club name"]]: true }), {})
      ).sort((a, b) => getClubOrder(a) - getClubOrder(b));
  const csvRows = [
    ["Club / Shot Number", ...fixedColumns]
      .map((col) => col.toUpperCase())
      .join(","),
  ];
  let allExportedShots = [];
  filteredClubs.forEach((club) => {
    const shots = currentData
      .map((row, index) => ({ ...row, originalIndex: index }))
      .filter((row) => row["club name"] === club && isShotSelected(row));
    allExportedShots = allExportedShots.concat(shots);
    if (currentSort.column) {
      shots.sort((a, b) => {
        let valA = a[currentSort.column] || 0;
        let valB = b[currentSort.column] || 0;
        if (typeof valA === "string") valA = valA.toLowerCase();
        if (typeof valB === "string") valB = valB.toLowerCase();
        return currentSort.ascending ? valA - valB || 0 : valB - valA || 0;
      });
    }
    const averages = calculateClubAverages(club, shots);
    csvRows.push(
      [
        `${formatClubName(club)} (Promedio)`,
        ...averages.map((avg) => `"${avg}"`),
      ].join(",")
    );
    shots.forEach((row) => {
      const rowData = [
        `"${String(row["shot number"] ?? "").replace(/"/g, '""')}"`,
        ...fixedColumns.map(
          (col) => `"${String(row[col] ?? "").replace(/"/g, '""')}"`
        ),
      ].join(",");
      csvRows.push(rowData);
    });
  });
  const csvContent = `data:text/csv;charset=utf-8,${csvRows.join("\n")}`;
  const link = document.createElement("a");
  link.setAttribute("href", encodeURI(csvContent));
  link.setAttribute("download", "golf_shots.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Load sessions with pagination
async function loadSessions() {
  const sessionsList = document.getElementById("sessionsList");
  const mensajeElement = document.getElementById("mensaje");
  sessionsList.innerHTML = "";
  loadSelectedColumns();
  loadSelectedSessions();

  const user =
    auth.currentUser ||
    (await new Promise((resolve) => onAuthStateChanged(auth, resolve)));
  if (!user) {
    sessionsList.innerHTML = "<p>No hay usuario autenticado.</p>";
    if (mensajeElement)
      mensajeElement.textContent = "No hay usuario autenticado.";
    return;
  }

  if (user.uid === "7G8P8GR7fBP62TU7zK0z5gkLpiA2") {
    await loadUserSelector();
  } else {
    selectedUserUid = user.uid;
  }

  await loadUserSessions(selectedUserUid || user.uid);
}

// Nueva función para cargar el selector de usuarios
async function loadUserSelector() {
  const usersCollection = collection(db, "Simulador");
  const usersSnapshot = await getDocs(usersCollection);
  const users = [];
  usersSnapshot.forEach((doc) => {
    const data = doc.data();
    users.push({
      uid: doc.id,
      nombreCompleto: `${data.nombre || ""} ${data.apellido || ""}`.trim(),
    });
  });

  users.sort((a, b) => a.nombreCompleto.localeCompare(b.nombreCompleto, "es"));

  const selectContainer = document.createElement("div");
  selectContainer.id = "userSelectorContainer";
  selectContainer.style.marginBottom = "10px";
  selectContainer.innerHTML = `
    <label for="userSelector">Seleccionar usuario: </label>
    <select id="userSelector" onchange="handleUserSelection(this.value)">
      <option value="">Selecciona un usuario</option>
      ${users
        .map(
          (user) =>
            `<option value="${user.uid}" ${
              user.uid === selectedUserUid ? "selected" : ""
            }>${user.nombreCompleto}</option>`
        )
        .join("")}
    </select>
  `;

  const sessionsList = document.getElementById("sessionsList");
  sessionsList.parentElement.insertBefore(selectContainer, sessionsList);

  if (!selectedUserUid && users.length > 0) {
    selectedUserUid = users[0].uid;
    document.getElementById("userSelector").value = selectedUserUid;
  }
}

// Nueva función para manejar la selección de usuario
async function handleUserSelection(uid) {
  if (uid) {
    selectedUserUid = uid;
    await loadUserSessions(uid);
  } else {
    selectedUserUid = null;
    const sessionsList = document.getElementById("sessionsList");
    sessionsList.innerHTML = "<p>Por favor, selecciona un usuario.</p>";
    document.getElementById("mensaje").textContent =
      "Selecciona un usuario para ver sus sesiones.";
    document.getElementById("shotsTableContainer").innerHTML = "";
    showSwitchContainer(false);
  }
}

// Nueva función para cargar sesiones de un usuario específico
async function loadUserSessions(uid) {
  const sessionsList = document.getElementById("sessionsList");
  const mensajeElement = document.getElementById("mensaje");
  const userDocRef = doc(db, "Simulador", uid);
  const userDoc = await getDoc(userDocRef);

  if (!userDoc.exists()) {
    sessionsList.innerHTML = "<p>No se encontraron sesiones.</p>";
    if (mensajeElement)
      mensajeElement.textContent = "No se encontraron sesiones.";
    return;
  }

  const userData = userDoc.data();
  sortedSessions = (userData.Sesiones || []).map((s, idx) => ({
    ...s,
    _firebaseIndex: idx,
  }));
  sortedSessions.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  if (mensajeElement) {
    mensajeElement.textContent = `Sesiones de ${userData.nombre} ${userData.apellido}`;
  }

  renderSessionsPage(sortedSessions);
}

// Render sessions for the current page
function renderSessionsPage(sessions) {
  const sessionsList = document.getElementById("sessionsList");
  const start = currentPage * 3;
  const end = start + 3;
  const pageSessions = sessions.slice(start, end);
  sessionsList.innerHTML = "";
  pageSessions.forEach((session, visualIndex) => {
    const sessionItem = document.createElement("div");
    sessionItem.className = "session-item";
    sessionItem.innerHTML = `
      <div class="session-header">
        <div class="session-info">
          <p><strong>Fecha:</strong> ${session.fecha}</p>
          ${
            session.datos && session.datos.length > 0
              ? `<p><strong>Tiros:</strong> ${session.datos.length}</p>`
              : ""
          }
          ${session.id ? `<p><strong>ID:</strong> ${session.id}</p>` : ""}
          <p><strong>Duración:</strong> ${session.stats?.sessionTime || "-"}</p>
        </div>
        <button class="delete-session-btn" onclick="deleteSession('${
          session.fecha
        }', event)" title="Eliminar sesión">
          <i class="fas fa-trash"></i>
        </button>
      </div>
    `;
    sessionItem.addEventListener("click", async (event) => {
      if (event.target.closest(".delete-session-btn")) return;
      document
        .querySelectorAll(".session-item")
        .forEach((item) => item.classList.remove("active"));
      sessionItem.classList.add("active");
      try {
        const userDocRef = doc(
          db,
          "Simulador",
          selectedUserUid || auth.currentUser.uid
        );
        const userDoc = await getDoc(userDocRef);
        const userData = userDoc.data();
        const sessionData = userData.Sesiones[session._firebaseIndex];
        currentData = sessionData.datos.map((shot, idx) => ({
          ...shot,
          originalIndex: idx,
        }));
      } catch (error) {
        currentData = session.datos.map((shot, idx) => ({
          ...shot,
          originalIndex: idx,
        }));
      }
      currentSort = { column: null, ascending: true };
      currentFilter = null;
      clubVisibility = {};
      currentData.forEach((row) => {
        clubVisibility[row["club name"]] = false;
      });
      showSwitchContainer(true);
      const toggle = document.getElementById("toggleView");
      if (toggle) {
        toggle.checked = false;
        toggleViewMode();
      }
      displayShotsTable(currentData, session._firebaseIndex);
      document
        .getElementById("shotsTableContainer")
        .scrollIntoView({ behavior: "smooth" });
    });
    sessionsList.appendChild(sessionItem);
  });
  renderPaginationControls(sessions);
}

// Render pagination controls
function renderPaginationControls(sessions) {
  const existingControls = document.querySelector(".pagination-controls");
  if (existingControls) existingControls.remove();

  const sessionsList = document.getElementById("sessionsList");
  const paginationContainer = document.createElement("div");
  paginationContainer.className = "pagination-controls";
  const totalPages = Math.ceil(sessions.length / 3);
  paginationContainer.innerHTML = `
    <button class="pagination-btn" onclick="window.goToPreviousPage()" ${
      currentPage === 0 ? "disabled" : ""
    }>
      <i class="fas fa-chevron-left"></i> Anterior
    </button>
    <span class="pagination-info">Página ${
      currentPage + 1
    } de ${totalPages}</span>
    <button class="pagination-btn" onclick="window.goToNextPage()" ${
      currentPage >= totalPages - 1 ? "disabled" : ""
    }>
      Siguiente <i class="fas fa-chevron-right"></i>
    </button>
  `;
  sessionsList.parentElement.appendChild(paginationContainer);
}

// Go to previous page
function goToPreviousPage() {
  if (currentPage > 0) {
    currentPage--;
    renderSessionsPage(sortedSessions);
  }
}

// Go to next page
function goToNextPage() {
  const totalPages = Math.ceil(sortedSessions.length / 3);
  if (currentPage < totalPages - 1) {
    currentPage++;
    renderSessionsPage(sortedSessions);
  }
}

// Save selected sessions
function saveSelectedSessions() {
  localStorage.setItem(
    "yardageBookSessions",
    JSON.stringify([...yardageBookSessions])
  );
}

// Load selected sessions
function loadSelectedSessions(sessionsLength = null) {
  const savedSessions = localStorage.getItem("yardageBookSessions");
  if (savedSessions) {
    let sessionsArray = JSON.parse(savedSessions);
    if (sessionsLength !== null) {
      sessionsArray = sessionsArray.filter(
        (idx) => idx >= 0 && idx < sessionsLength
      );
      localStorage.setItem(
        "yardageBookSessions",
        JSON.stringify(sessionsArray)
      );
    }
    yardageBookSessions = new Set(sessionsArray);
  }
}

// Toggle session selection
function toggleSessionSelection(sessionIndex) {
  if (yardageBookSessions.has(sessionIndex)) {
    yardageBookSessions.delete(sessionIndex);
  } else {
    yardageBookSessions.add(sessionIndex);
  }
  saveSelectedSessions();
  updateClubListForYardageBook(getSelectedSessionsSorted());
}

// Get selected sessions sorted
function getSelectedSessionsSorted() {
  return sortedSessions.filter((_, i) => yardageBookSessions.has(i));
}

// Update club list for yardage book
function updateClubListForYardageBook(sessions) {
  const uniqueClubs = new Set();
  const clubCounts = {};
  sessions.forEach((session) => {
    (session.datos || []).forEach((shot) => {
      if (
        shot["club name"] &&
        shot["club name"] !== "Putter" &&
        isShotSelected(shot)
      ) {
        uniqueClubs.add(shot["club name"]);
        clubCounts[shot["club name"]] =
          (clubCounts[shot["club name"]] || 0) + 1;
      }
    });
  });
  if (selectedClubsForYardageBook.size === 0) {
    uniqueClubs.forEach((club) => selectedClubsForYardageBook.add(club));
  } else {
    Array.from(selectedClubsForYardageBook).forEach((club) => {
      if (!uniqueClubs.has(club)) selectedClubsForYardageBook.delete(club);
    });
  }
  const container = document.getElementById("clubListYardageBook");
  if (!container) return;
  container.innerHTML =
    uniqueClubs.size > 0
      ? [...uniqueClubs]
          .map(
            (club) =>
              `<label>
                <input type="checkbox" value="${club}" ${
                selectedClubsForYardageBook.has(club) ? "checked" : ""
              } onchange="toggleClubForYardageBook('${club}')">
                <span>${club} (${clubCounts[club] || 0})</span>
              </label>`
          )
          .join("")
      : "<span>No hay palos en las sesiones seleccionadas.</span>";
}

// Toggle club for yardage book
function toggleClubForYardageBook(club) {
  if (selectedClubsForYardageBook.has(club)) {
    selectedClubsForYardageBook.delete(club);
  } else {
    selectedClubsForYardageBook.add(club);
  }
}

// Toggle view mode
function toggleViewMode(forceTable = false) {
  const toggle = document.getElementById("toggleView");
  if (!toggle) return;
  if (forceTable) toggle.checked = false;
  const isMap = toggle.checked;
  const table = document.getElementById("shotsTableContainer");
  const canvas = document.getElementById("scatterCanvas");
  const controls = document.getElementById("scatterControls");
  if (table) table.style.display = isMap ? "none" : "block";
  if (canvas) canvas.style.display = isMap ? "block" : "none";
  if (controls) controls.style.display = isMap ? "flex" : "none";
  if (isMap && typeof window.createScatterPlot === "function") {
    requestAnimationFrame(createScatterPlot);
  }
}

// Show switch container
function showSwitchContainer(show) {
  const switchContainer = document.getElementById("switchContainer");
  if (switchContainer) switchContainer.style.display = show ? "" : "none";
}

// Delete session
async function deleteSession(sessionFecha, event) {
  event.stopPropagation();
  if (!confirm("¿Estás seguro de que quieres eliminar esta sesión?")) return;
  const user = auth.currentUser;
  if (!user) return;
  const userDocRef = doc(db, "Simulador", selectedUserUid || user.uid);
  const userDoc = await getDoc(userDocRef);
  if (!userDoc.exists()) return;
  const userData = userDoc.data();
  const sessions = userData.Sesiones || [];
  const sessionIndex = sessions.findIndex(
    (session) => session.fecha === sessionFecha
  );
  if (sessionIndex === -1) return;
  sessions.splice(sessionIndex, 1);
  await updateDoc(userDocRef, { Sesiones: sessions });
  alert("Sesión eliminada exitosamente");
  const totalPages = Math.ceil(sessions.length / 3);
  if (currentPage >= totalPages && currentPage > 0) {
    currentPage--;
  }
  loadSessions();
}

// Average row HTML
const averageRowHTML = (club, averages) => `
  <tr class="average-row" onclick="toggleClubShots('${club}')" data-club="${club}">
    <td class="toggle-cell"><i class="fas fa-chevron-down"></i></td>
    <td class="club-name-cell">${formatClubName(club)}</td>
    ${getActiveColumns()
      .map((col, index) => `<td>${averages[index] || "-"}</td>`)
      .join("")}
  </tr>
`;

// Calculate max selectable columns
function getMaxSelectableColumns() {
  const tableContainer = document.getElementById("shotsTableContainer");
  const anchoTabla = tableContainer
    ? tableContainer.offsetWidth
    : window.innerWidth;
  const anchoColumnaDato = 120;
  const anchoFijo = 28 + 60;
  const maxColumnas = Math.floor((anchoTabla - anchoFijo) / anchoColumnaDato);
  return Math.max(1, maxColumnas);
}

// ============================================
// FUNCIONALIDAD DE CARGA DE SESIÓN
// ============================================

let uploadSessionData = [];

// Abrir modal de carga
function openUploadModal() {
  const modal = document.getElementById("uploadSessionModal");
  if (!modal) return;

  // Resetear formulario
  document.getElementById("uploadSessionForm").reset();
  document.getElementById("uploadPreview").style.display = "none";
  document.getElementById("uploadStatus").textContent = "";
  document.getElementById("uploadStatus").className = "status-message";
  document.getElementById("submitUploadBtn").disabled = true;
  uploadSessionData = [];

  // Establecer fecha de hoy
  const today = new Date();
  const dateStr = today.toISOString().split("T")[0];
  document.getElementById("sessionDate").value = dateStr;

  modal.style.display = "flex";
  setTimeout(() => modal.classList.add("show"), 10);
}

// Cerrar modal de carga
function closeUploadModal() {
  const modal = document.getElementById("uploadSessionModal");
  if (!modal) return;
  modal.classList.remove("show");
  setTimeout(() => {
    modal.style.display = "none";
  }, 300);
}

// Procesar archivo CSV
function processCSVFile(file) {
  const status = document.getElementById("uploadStatus");
  const simulatorType = document.getElementById("simuladorType").value;

  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      uploadSessionData = parseCSVForUpload(event.target.result, simulatorType);

      if (uploadSessionData.length === 0) {
        status.textContent = "El archivo CSV está vacío o no se pudo procesar.";
        status.className = "status-message error";
        document.getElementById("submitUploadBtn").disabled = true;
        return;
      }

      displayUploadPreview(uploadSessionData);
      document.getElementById("submitUploadBtn").disabled = false;

      if (simulatorType !== "foresight") {
        status.textContent = `⚠️ Parser de ${simulatorType.charAt(0).toUpperCase() + simulatorType.slice(1)} en desarrollo.`;
        status.className = "status-message";
      } else {
        status.textContent = `✓ ${uploadSessionData.length} tiros cargados correctamente`;
        status.className = "status-message success";
      }
    } catch (error) {
      status.textContent = `Error al procesar el CSV: ${error.message}`;
      status.className = "status-message error";
      document.getElementById("submitUploadBtn").disabled = true;
    }
  };
  reader.onerror = () => {
    status.textContent = "Error al leer el archivo.";
    status.className = "status-message error";
  };
  reader.readAsText(file);
}

// Parser principal
function parseCSVForUpload(csvData, simulatorType = "foresight") {
  switch (simulatorType) {
    case "foresight":
      return parseCSVForesight(csvData);
    case "garmin":
      return parseCSVGarmin(csvData);
    case "trackman":
      return parseCSVTrackman(csvData);
    default:
      return parseCSVForesight(csvData);
  }
}

// Parser para Foresight
function parseCSVForesight(csvData) {
  const lines = csvData.split("\n").filter((line) => line.trim() !== "");
  const headers = lines[0].split(",").map((header) => header.trim().toLowerCase());
  const data = [];

  for (let i = 1; i < lines.length; i++) {
    const columns = lines[i].split(",").map((col) => col.trim());
    if (columns.length < headers.length) continue;

    const rowData = {};
    headers.forEach((header, index) => {
      let value = columns[index];
      if (header !== "shot created date" && !isNaN(value) && value !== "") {
        value = parseFloat(value);
      }
      if (header === "club speed (mph)") {
        if (value > 1000) {
          rowData["club speed (mph)"] = "-";
        } else {
          rowData[header] = value;
        }
      } else {
        rowData[header] = value;
      }
    });
    data.push(rowData);
  }

  // Limpiar datos con club speed inválido
  for (let i = 0; i < data.length; i++) {
    if (data[i]["club speed (mph)"] === "-") {
      data[i]["efficiency"] = "-";
      data[i]["club path (deg out-in-/in-out+)"] = "-";
      data[i]["angle of attack (deg)"] = "-";
      data[i]["loft (deg)"] = "-";
      data[i]["lie (deg toe down-/toe up+)"] = "-";
      data[i]["club speed at impact location (mph)"] = "-";
      data[i]["face impact horizontal (mm toe-/heel+)"] = "-";
      data[i]["face impact vertical (mm low-/high+)"] = "-";
      data[i]["face to target (deg closed-/open+)"] = "-";
      data[i]["closure rate (deg/sec)"] = "-";
    }
  }
  return data;
}

// Parser para Garmin R10 - En desarrollo
function parseCSVGarmin(csvData) {
  console.warn("Parser de Garmin en desarrollo. Usando parser genérico.");
  const lines = csvData.split("\n").filter((line) => line.trim() !== "");
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((header) => header.trim().toLowerCase());
  const data = [];
  for (let i = 1; i < lines.length; i++) {
    const columns = lines[i].split(",").map((col) => col.trim());
    if (columns.length < headers.length) continue;
    const rowData = {};
    headers.forEach((header, index) => {
      let value = columns[index];
      if (!isNaN(value) && value !== "") value = parseFloat(value);
      rowData[header] = value;
    });
    data.push(rowData);
  }
  return data;
}

// Parser para Trackman - En desarrollo
function parseCSVTrackman(csvData) {
  console.warn("Parser de Trackman en desarrollo. Usando parser genérico.");
  const lines = csvData.split("\n").filter((line) => line.trim() !== "");
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((header) => header.trim().toLowerCase());
  const data = [];
  for (let i = 1; i < lines.length; i++) {
    const columns = lines[i].split(",").map((col) => col.trim());
    if (columns.length < headers.length) continue;
    const rowData = {};
    headers.forEach((header, index) => {
      let value = columns[index];
      if (!isNaN(value) && value !== "") value = parseFloat(value);
      rowData[header] = value;
    });
    data.push(rowData);
  }
  return data;
}

// Calcular estadísticas de la sesión
function calculateUploadSessionStats(data) {
  const shotCount = data.length;
  let sessionTime = 0;
  let restBetweenShots = 0;

  if (shotCount > 0 && data[0]["shot created date"]) {
    const parseTimestamp = (timestamp) => {
      const [date, time] = timestamp.split(" ");
      const [month, day, year] = date.split("/").map(Number);
      const [hours, minutes, seconds] = time.split(":").map(Number);
      return new Date(year, month - 1, day, hours, minutes, seconds);
    };
    try {
      const firstShotTime = parseTimestamp(data[0]["shot created date"]);
      const lastShotTime = parseTimestamp(data[data.length - 1]["shot created date"]);
      sessionTime = (lastShotTime - firstShotTime) / 1000;
      restBetweenShots = shotCount > 1 ? sessionTime / (shotCount - 1) : 0;
    } catch (e) {
      console.warn("No se pudo calcular el tiempo de sesión");
    }
  }

  const formatTime = (seconds) => {
    if (seconds <= 0) return "0h 0m";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const formatRest = (seconds) => {
    if (seconds <= 0) return "0s";
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  };

  return {
    shotCount,
    sessionTime: formatTime(sessionTime),
    restBetweenShots: formatRest(restBetweenShots),
  };
}

// Mostrar vista previa
function displayUploadPreview(data) {
  const previewContainer = document.getElementById("uploadPreview");
  const previewStats = calculateUploadSessionStats(data);

  document.getElementById("previewShotCount").textContent = `${previewStats.shotCount} tiros`;
  document.getElementById("previewDuration").textContent = `Duración: ${previewStats.sessionTime}`;

  const tableHead = document.querySelector("#uploadPreviewTable thead");
  const tableBody = document.querySelector("#uploadPreviewTable tbody");

  const previewColumns = ["club name", "ball speed (mph)", "carry (yds)", "total distance (yds)"];
  const availableColumns = previewColumns.filter(col => data[0] && data[0][col] !== undefined);

  tableHead.innerHTML = `<tr>${availableColumns.map(col =>
    `<th>${col.split(" ")[0].charAt(0).toUpperCase() + col.split(" ")[0].slice(1)}</th>`
  ).join("")}</tr>`;

  tableBody.innerHTML = data.slice(0, 5).map(row =>
    `<tr>${availableColumns.map(col => `<td>${row[col] || "-"}</td>`).join("")}</tr>`
  ).join("");

  if (data.length > 5) {
    tableBody.innerHTML += `<tr><td colspan="${availableColumns.length}" style="text-align:center;color:var(--text-muted)">...y ${data.length - 5} tiros más</td></tr>`;
  }

  previewContainer.style.display = "block";
}

// Guardar sesión en Firebase
async function saveUploadedSession(event) {
  event.preventDefault();
  const status = document.getElementById("uploadStatus");
  const submitBtn = document.getElementById("submitUploadBtn");

  if (uploadSessionData.length === 0) {
    status.textContent = "No hay datos para guardar.";
    status.className = "status-message error";
    return;
  }

  const user = auth.currentUser;
  if (!user) {
    status.textContent = "Debes iniciar sesión para guardar una sesión.";
    status.className = "status-message error";
    return;
  }

  const fecha = document.getElementById("sessionDate").value;
  if (!fecha) {
    status.textContent = "Por favor, selecciona una fecha.";
    status.className = "status-message error";
    return;
  }

  submitBtn.disabled = true;
  status.textContent = "Guardando...";
  status.className = "status-message";

  try {
    const userDocRef = doc(db, "Simulador", user.uid);
    const userDoc = await getDoc(userDocRef);

    const sessionStats = calculateUploadSessionStats(uploadSessionData);
    const sessionEntry = {
      fecha: fecha,
      datos: uploadSessionData,
      stats: sessionStats,
    };

    if (userDoc.exists()) {
      const userData = userDoc.data();
      await updateDoc(userDocRef, {
        Sesiones: [...(userData.Sesiones || []), sessionEntry],
      });
    } else {
      await updateDoc(userDocRef, {
        Sesiones: [sessionEntry],
      });
    }

    status.textContent = "✓ Sesión guardada exitosamente";
    status.className = "status-message success";

    setTimeout(() => {
      closeUploadModal();
      loadSessions();
    }, 1500);

  } catch (error) {
    console.error("Error guardando sesión:", error);
    status.textContent = `Error al guardar: ${error.message}`;
    status.className = "status-message error";
    submitBtn.disabled = false;
  }
}

// Inicializar eventos de carga de sesión
function initUploadSessionEvents() {
  const csvInput = document.getElementById("csvFileInput");
  if (csvInput) {
    csvInput.addEventListener("change", (e) => {
      if (e.target.files.length > 0) {
        processCSVFile(e.target.files[0]);
      }
    });
  }

  const uploadForm = document.getElementById("uploadSessionForm");
  if (uploadForm) {
    uploadForm.addEventListener("submit", saveUploadedSession);
  }

  const modal = document.getElementById("uploadSessionModal");
  if (modal) {
    modal.addEventListener("click", (event) => {
      if (event.target === modal) {
        closeUploadModal();
      }
    });
  }
}

// Global function assignments
Object.assign(window, {
  showColumnSelector,
  closeColumnSelector: () => closeModal("columnSelectorModal"),
  applyColumnSelection,
  updateColumnCount,
  toggleColumnSelection,
  saveSelectedColumns,
  loadSelectedColumns,
  showSaveIndicator,
  resetToDefaultColumns,
  updateColumnCheckboxes,
  updateClubAverages,
  showYardageBookModal,
  closeYardageBookModal,
  createYardageBookFromModal,
  toggleSessionSelection,
  toggleAllSessions,
  toggleAllClubs,
  updateSelectionInfo,
  updateClubListForYardageBook,
  toggleClubForYardageBook,
  updateShotSelection,
  toggleAllChecks,
  toggleClubShots,
  sortTable,
  updateFilter,
  exportCurrentSessionToPDF,
  exportToCSV,
  toggleViewMode,
  showScatterPlot: () => {
    const toggle = document.getElementById("toggleView");
    if (toggle) {
      toggle.checked = true;
      toggleViewMode();
    }
  },
  deleteSession,
  goToPreviousPage,
  goToNextPage,
  handleUserSelection,
  openUploadModal,
  closeUploadModal,
});

// Initialize on DOM load
document.addEventListener("DOMContentLoaded", () => {
  loadSessions();
  initUploadSessionEvents();
  const toggle = document.getElementById("toggleView");
  if (toggle) {
    toggle.checked = false;
    toggleViewMode();
  }
});

export { currentData, formatClubName };

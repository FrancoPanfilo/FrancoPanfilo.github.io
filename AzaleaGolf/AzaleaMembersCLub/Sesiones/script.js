import { auth, db } from "../firebase.js";
import {
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
} from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js";
import { exportSessionToPDF } from "./pdfExport.js";
import { createYardageBook } from "./yardageBook.js";
import {
  formatClubName,
  getClubColor,
  clubColors,
} from "../utils/constants.js";

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

// Club order hierarchy
function getClubOrder(clubName) {
  const clubHierarchy = {
    Dr: 1,
    "1w": 2,
    "2w": 3,
    "3w": 4,
    "4w": 5,
    "5w": 6,
    "6w": 7,
    "7w": 8,
    "8w": 9,
    "9w": 10,
    "1h": 11,
    "2h": 12,
    "3h": 13,
    "4h": 14,
    "5h": 15,
    "6h": 16,
    "7h": 17,
    "8h": 18,
    "1i": 19,
    "2i": 20,
    "3i": 21,
    "4i": 22,
    "5i": 23,
    "6i": 24,
    "7i": 25,
    "8i": 26,
    "9i": 27,
    Pw: 28,
    Gw: 29,
    Sw: 30,
    Lw: 31,
    47: 32,
    48: 33,
    49: 34,
    50: 35,
    51: 36,
    52: 37,
    53: 38,
    54: 39,
    55: 40,
    56: 41,
    57: 42,
    58: 43,
    59: 44,
    60: 45,
    61: 46,
    62: 47,
    63: 48,
    64: 49,
    Putter: 1000,
  };
  return clubHierarchy[clubName] || 999;
}

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

  const modalHTML = `
    <div id="columnSelectorModal" class="modal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>Seleccionar Columnas</h3>
          <div class="column-count">
            <span id="selectedColumnsCount">${selectedColumns.size}</span> de ${
    fixedColumns.length
  } columnas seleccionadas
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

// Close modal (shared for column and yardage book modals)
function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove("show");
    setTimeout(() => {
      modal.remove();
    }, 200);
  }
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
    const clubShots = currentData.filter((shot) => shot["club name"] === club);
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

// Load selected columns
function loadSelectedColumns() {
  const savedColumns = localStorage.getItem("selectedColumns");
  if (savedColumns) {
    selectedColumns = new Set(JSON.parse(savedColumns));
  }
}

// Show save indicator
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

// Reset to default columns
function resetToDefaultColumns() {
  selectedColumns = new Set([
    "carry (yds)",
    "peak height (yds)",
    "club speed (mph)",
    "efficiency",
    "club path (deg out-in-/in-out+)",
  ]);
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
    document.body.appendChild(indicator);
  }
  indicator.innerHTML = '<i class="fas fa-undo"></i> Columnas restablecidas';
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
  const modal = document.getElementById("yardageBookModal");
  if (!modal) return;
  modal.innerHTML = `
    <div class="modal-content yardagebook-modal">
      <div class="modal-header">
        <h3>📚 Crear YardageBook Personalizado</h3>
        <button class="close-modal" onclick="closeYardageBookModal()">&times;</button>
      </div>
      <div class="modal-body">
        <div class="sessions-section">
          <h4><i class="fas fa-list"></i> Selecciona las sesiones</h4>
          <div id="yardageBookSessionsList" class="sessions-list"></div>
          <div id="clubListYardageBook"></div>
        </div>
        <div class="advanced-settings">
          <h4><i class="fas fa-cogs"></i> Ajustes Avanzados</h4>
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
  `;
  modal.style.display = "block";
  modal.classList.add("show");
  await loadSessionsForYardageBook();
  setupYardageBookSliders();
  modal.addEventListener("click", (event) => {
    if (event.target === modal) {
      closeYardageBookModal();
    }
  });
}

// Load sessions for yardage book modal
async function loadSessionsForYardageBook() {
  const user = auth.currentUser;
  if (!user) throw new Error("Usuario no autenticado");
  const userDocRef = doc(db, "Simulador", user.uid);
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
    const shotCount = session.datos?.length || 0;
    const validShots = session.datos?.filter(isShotSelected).length || 0;
    const uniqueClubs = new Set(
      session.datos
        ?.filter(
          (shot) =>
            shot["club name"] &&
            shot["club name"] !== "Putter" &&
            isShotSelected(shot)
        )
        .map((shot) => formatClubName(shot["club name"]))
    );
    const sessionDiv = document.createElement("div");
    sessionDiv.className = "session-item-yardagebook";
    sessionDiv.innerHTML = `
      <input type="checkbox" id="session${index}" onchange="toggleSessionSelection(${index})" checked>
      <div>
        <div>📅 ${new Date(session.fecha).toLocaleDateString("es-ES", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })}</div>
        <div><i class="fas fa-golf-ball"></i> ${
          [...uniqueClubs].join(", ") || "No hay datos"
        }</div>
        <div>
          <div>${shotCount}</div><div>Total</div>
          <div>${validShots}</div><div>Válidos</div>
        </div>
      </div>
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
  const user = auth.currentUser;
  if (!user) return;
  const userDocRef = doc(db, "Simulador", user.uid);
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
    lateralPercentage
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

// Close yardage book modal
function closeYardageBookModal() {
  closeModal("yardageBookModal");
  restoreMainPageState();
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
      <button onclick="showColumnSelector()"><i class="fas fa-columns"></i> Seleccionar Columnas</button>
      <button onclick="exportToCSV()"><i class="fas fa-file-csv"></i> Exportar a CSV</button>
      <button onclick="exportCurrentSessionToPDF()"><i class="fas fa-file-pdf"></i> Exportar a PDF</button>
      <button onclick="showYardageBookModal()"><i class="fas fa-book"></i> Crear YardageBook</button>
    </div>
    <table class="shots-table">
      <thead>
        <tr>
          <th class="checkbox-column"><i class="fas fa-eye"></i></th>
          <th>Tiro</th>
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
              .map((row, shotIndex) => {
                console.log("Tiro mostrado en tabla:", row);
                return `
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
              `;
              })
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
  const userDocRef = doc(db, "Simulador", user.uid);
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
  const userDocRef = doc(db, "Simulador", user.uid);
  const userDoc = await getDoc(userDocRef);
  if (!userDoc.exists()) return;
  const userData = userDoc.data();
  const nombreCompleto = `${userData.nombre} ${userData.apellido}`;
  const fechaSesion =
    currentData[0]?.["shot created date"]?.split(" ")[0] ||
    new Date().toISOString().split("T")[0];
  const dataWithSelection = currentData.filter(isShotSelected);
  console.log("Tiros exportados a PDF:", dataWithSelection);
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
  console.log("Tiros exportados a CSV:", allExportedShots);
  const csvContent = `data:text/csv;charset=utf-8,${csvRows.join("\n")}`;
  const link = document.createElement("a");
  link.setAttribute("href", encodeURI(csvContent));
  link.setAttribute("download", "golf_shots.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Load sessions
async function loadSessions() {
  const sessionsList = document.getElementById("sessionsList");
  sessionsList.innerHTML = "";
  const mensajeElement = document.getElementById("mensaje");
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
  const userDocRef = doc(db, "Simulador", user.uid);
  const userDoc = await getDoc(userDocRef);
  if (!userDoc.exists()) {
    sessionsList.innerHTML = "<p>No se encontraron sesiones.</p>";
    if (mensajeElement)
      mensajeElement.textContent = "No se encontraron sesiones.";
    return;
  }
  const userData = userDoc.data();
  let sessions = userData.Sesiones || [];
  sessions = sessions.map((s, idx) => ({ ...s, _firebaseIndex: idx }));
  sessions.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  if (mensajeElement)
    mensajeElement.textContent = `Sesiones de ${userData.nombre} ${userData.apellido}`;
  sessionsList.innerHTML = "";
  sessions.forEach((session, visualIndex) => {
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
        const userDocRef = doc(db, "Simulador", user.uid);
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
    });
    sessionsList.appendChild(sessionItem);
  });
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
  const userDocRef = doc(db, "Simulador", user.uid);
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
});

// Initialize on DOM load
document.addEventListener("DOMContentLoaded", () => {
  loadSessions();
  const toggle = document.getElementById("toggleView");
  if (toggle) {
    toggle.checked = false;
    toggleViewMode();
  }
});

export { currentData, formatClubName };

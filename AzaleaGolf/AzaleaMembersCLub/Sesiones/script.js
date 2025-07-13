import { auth, db } from "../firebase.js";
import {
  doc,
  getDoc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js";
import { exportSessionToPDF } from "./pdfExport.js";
import { createYardageBook, handleYardageBookError } from "./yardageBook.js";

// Orden fijo de columnas (sin club name ni shot number)
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

// Paleta de colores para los palos
const clubColors = [
  "#FF6B6B",
  "#4ECDC4",
  "#45B7D1",
  "#96CEB4",
  "#FFEEAD",
  "#D4A5A5",
  "#9B59B6",
  "#3498DB",
  "#E74C3C",
  "#2ECC71",
  "#F1C40F",
  "#E67E22",
  "#1ABC9C",
  "#8E44AD",
  "#C0392B",
];

// Función para formatear el nombre del palo
function formatClubName(clubName, short = false) {
  const clubNames = {
    Dr: short ? "Dr" : "Driver",
    "1w": short ? "M1" : "Madera 1",
    "2w": short ? "M2" : "Madera 2",
    "3w": short ? "M3" : "Madera 3",
    "4w": short ? "M4" : "Madera 4",
    "5w": short ? "M5" : "Madera 5",
    "6w": short ? "M6" : "Madera 6",
    "7w": short ? "M7" : "Madera 7",
    "8w": short ? "M8" : "Madera 8",
    "9w": short ? "M9" : "Madera 9",
    "1h": short ? "H1" : "Híbrido 1",
    "2h": short ? "H2" : "Híbrido 2",
    "3h": short ? "H3" : "Híbrido 3",
    "4h": short ? "H4" : "Híbrido 4",
    "5h": short ? "H5" : "Híbrido 5",
    "6h": short ? "H6" : "Híbrido 6",
    "7h": short ? "H7" : "Híbrido 7",
    "8h": short ? "H8" : "Híbrido 8",
    "1i": short ? "H1" : "Hierro 1",
    "2i": short ? "H2" : "Hierro 2",
    "3i": short ? "H3" : "Hierro 3",
    "4i": short ? "H4" : "Hierro 4",
    "5i": short ? "H5" : "Hierro 5",
    "6i": short ? "H6" : "Hierro 6",
    "7i": short ? "H7" : "Hierro 7",
    "8i": short ? "H8" : "Hierro 8",
    "9i": short ? "H9" : "Hierro 9",
    Pw: short ? "PW" : "Pitching Wedge",
    Gw: short ? "GW" : "Gap Wedge",
    Sw: short ? "SW" : "Sand Wedge",
    Lw: short ? "LW" : "Lob Wedge",
    47: short ? "W47" : "Wedge 47°",
    48: short ? "W48" : "Wedge 48°",
    49: short ? "W49" : "Wedge 49°",
    50: short ? "W50" : "Wedge 50°",
    51: short ? "W51" : "Wedge 51°",
    52: short ? "W52" : "Wedge 52°",
    53: short ? "W53" : "Wedge 53°",
    54: short ? "W54" : "Wedge 54°",
    55: short ? "W55" : "Wedge 55°",
    56: short ? "W56" : "Wedge 56°",
    57: short ? "W57" : "Wedge 57°",
    58: short ? "W58" : "Wedge 58°",
    59: short ? "W59" : "Wedge 59°",
    60: short ? "W60" : "Wedge 60°",
    61: short ? "W61" : "Wedge 61°",
    62: short ? "W62" : "Wedge 62°",
    63: short ? "W63" : "Wedge 63°",
    64: short ? "W64" : "Wedge 64°",
    Putter: short ? "Warm Up" : "Warm Up",
  };
  return clubNames[clubName] || clubName;
}

// Función para obtener el orden de los palos
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
  };
  return clubHierarchy[clubName] || 999;
}

// Función para formatear nombres de columnas para mostrar
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

// Función para alternar la selección de una columna
function toggleColumnSelection(columnName) {
  if (selectedColumns.has(columnName)) {
    selectedColumns.delete(columnName);
  } else {
    selectedColumns.add(columnName);
  }

  // Guardar las preferencias automáticamente
  saveSelectedColumns();

  // Actualizar el contador de columnas seleccionadas
  updateColumnCount();

  // Prevenir que el evento se propague y cierre el modal
  event.stopPropagation();

  // NO redibujar la tabla inmediatamente - esperar a que el usuario haga clic en "Aplicar"
  // NO cerrar el modal aquí - mantenerlo abierto para selección múltiple
}

// Función para obtener las columnas activas (seleccionadas)
function getActiveColumns() {
  return fixedColumns.filter((col) => selectedColumns.has(col));
}

// Función para formatear valores de manera consistente
function formatValue(value, column, shot = null) {
  if (value === undefined || value === null || value === "") {
    return "-";
  }

  const numValue = parseFloat(value);
  if (isNaN(numValue)) {
    return value;
  }

  // Para columnas relacionadas con la cara del palo, verificar si hay datos válidos
  if (
    [
      "club speed (mph)",
      "efficiency",
      "angle of attack (deg)",
      "club path (deg out-in-/in-out+)",
    ].includes(column)
  ) {
    // Si es club speed, verificar que sea válido
    if (column === "club speed (mph)") {
      if (numValue >= 550 || numValue <= 0) {
        return "-";
      }
    } else {
      // Para otras columnas de cara del palo, verificar que club speed sea válido
      if (shot) {
        const clubSpeed = parseFloat(shot["club speed (mph)"]);
        if (!clubSpeed || clubSpeed >= 550 || clubSpeed <= 0) {
          return "-";
        }
      }
    }
  }

  // Formatear según el tipo de columna
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
  } else {
    return numValue.toFixed(1);
  }
}

// Función para mostrar el modal del selector de columnas
function showColumnSelector() {
  const modal = document.getElementById("columnSelectorModal");
  if (modal) {
    modal.style.display = "block";

    // Agregar event listener para cerrar el modal solo cuando se hace clic fuera del contenido
    const handleModalClick = (event) => {
      if (event.target === modal) {
        closeColumnSelector();
        modal.removeEventListener("click", handleModalClick);
      }
    };

    // Agregar event listener para prevenir que se cierre al hacer clic en checkboxes
    const handleCheckboxClick = (event) => {
      event.stopPropagation();
    };

    // Agregar event listeners a los checkboxes existentes
    const checkboxes = modal.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach((checkbox) => {
      checkbox.addEventListener("click", handleCheckboxClick);
    });

    // Agregar event listener al modal
    modal.addEventListener("click", handleModalClick);
  }
}

// Función para actualizar el contador de columnas seleccionadas
function updateColumnCount() {
  const countElement = document.getElementById("selectedColumnsCount");
  if (countElement) {
    countElement.textContent = selectedColumns.size;
  }
}

// Función para aplicar la selección de columnas y cerrar el modal
function applyColumnSelection() {
  // Guardar las preferencias finales
  saveSelectedColumns();

  // Redibujar la tabla con las columnas actualizadas
  if (currentData.length > 0) {
    const activeSession = document.querySelector(".session-item.active");
    const sessionIndex = activeSession
      ? parseInt(activeSession.dataset.index)
      : 0;
    displayShotsTable(currentData, sessionIndex);
  }

  // Cerrar el modal
  closeColumnSelector();
}

// Función para cerrar el modal del selector de columnas
function closeColumnSelector() {
  const modal = document.getElementById("columnSelectorModal");
  if (modal) {
    modal.style.display = "none";
  }
}

// Estado global
let currentData = [];
let currentSort = { column: null, ascending: true };
let currentFilter = null;
let selectedShots = new Set();
let clubVisibility = {};

// Estado para columnas seleccionadas
let selectedColumns = new Set([
  "carry (yds)",
  "peak height (yds)",
  "club speed (mph)",
  "efficiency",
  "club path (deg out-in-/in-out+)",
]);

// Estado global para YardageBook
let yardageBookSessions = new Set(); // Almacena los índices de las sesiones seleccionadas
let deselectedShots = new Map(); // Map<sessionIndex, Set<shotIndex>>

// Función para calcular promedios de un palo
function calculateClubAverages(club, shots) {
  // Filtrar solo los tiros seleccionados del palo específico
  const selectedRows = shots.filter((row) =>
    selectedShots.has(row.originalIndex)
  );

  if (selectedRows.length === 0) {
    return getActiveColumns().map(() => "-");
  }

  // Calcular promedios para cada columna activa
  return getActiveColumns().map((col) => {
    // Para columnas relacionadas con la cara del palo, filtrar solo tiros con datos válidos
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
        return clubSpeed && clubSpeed < 550;
      });

      if (validRows.length === 0) {
        return "-";
      }

      const values = validRows
        .map((row) => {
          const value = parseFloat(row[col]);
          return isNaN(value) ? null : value;
        })
        .filter((val) => val !== null);

      if (values.length === 0) return "-";

      const avg = values.reduce((sum, val) => sum + val, 0) / values.length;

      // Formatear según el tipo de columna
      if (col === "efficiency") {
        return avg.toFixed(2);
      } else if (col.includes("angle") || col.includes("path")) {
        return avg.toFixed(1);
      } else if (col.includes("speed")) {
        return avg.toFixed(1);
      } else {
        return avg.toFixed(1);
      }
    } else {
      // Para otras columnas, usar todos los tiros seleccionados
      const values = selectedRows
        .map((row) => {
          const value = parseFloat(row[col]);
          return isNaN(value) ? null : value;
        })
        .filter((val) => val !== null);

      if (values.length === 0) return "-";

      const avg = values.reduce((sum, val) => sum + val, 0) / values.length;

      // Solo el valor numérico, sin unidades
      if (col === "efficiency") {
        return avg.toFixed(2);
      } else if (col.includes("angle") || col.includes("path")) {
        return avg.toFixed(1);
      } else if (col.includes("speed")) {
        return avg.toFixed(1);
      } else if (col.includes("spin")) {
        return Math.round(avg);
      } else if (
        col.includes("distance") ||
        col.includes("carry") ||
        col.includes("total") ||
        col.includes("height")
      ) {
        return Math.round(avg);
      }
      return avg.toFixed(1);
    }
  });
}

// Función para actualizar los promedios en la tabla
function updateClubAverages() {
  const averageRows = document.querySelectorAll(".average-row");
  averageRows.forEach((row) => {
    const club = row.dataset.club;
    const clubShots = currentData.filter((shot) => shot["club name"] === club);
    const averages = calculateClubAverages(club, clubShots);

    // Actualizar las celdas de promedio
    const cells = row.querySelectorAll(
      "td:not(:first-child):not(:nth-child(2))"
    );
    cells.forEach((cell, index) => {
      cell.textContent = averages[index];
    });
  });
}

// Función para obtener el nombre completo del usuario
async function getUserFullName(uid) {
  const userDocRef = doc(db, "Simulador", uid);
  const userDoc = await getDoc(userDocRef);
  if (userDoc.exists()) {
    const userData = userDoc.data();
    return `${userData.nombre} ${userData.apellido}`;
  }
  return "Usuario";
}

// Función para guardar las sesiones seleccionadas
function saveSelectedSessions() {
  localStorage.setItem(
    "yardageBookSessions",
    JSON.stringify(Array.from(yardageBookSessions))
  );
}

// Función para guardar los tiros deseleccionados
function saveDeselectedShots() {
  const deselectedShotsArray = Array.from(deselectedShots.entries()).map(
    ([sessionIndex, shots]) => [sessionIndex, Array.from(shots)]
  );
  localStorage.setItem("deselectedShots", JSON.stringify(deselectedShotsArray));
}

// Función para cargar las sesiones seleccionadas
function loadSelectedSessions() {
  const savedSessions = localStorage.getItem("yardageBookSessions");
  if (savedSessions) {
    yardageBookSessions = new Set(JSON.parse(savedSessions));
  }
}

// Función para cargar los tiros deseleccionados
function loadDeselectedShots() {
  const savedShots = localStorage.getItem("deselectedShots");
  if (savedShots) {
    const deselectedShotsArray = JSON.parse(savedShots);
    deselectedShots = new Map(
      deselectedShotsArray.map(([sessionIndex, shots]) => [
        sessionIndex,
        new Set(shots),
      ])
    );
  }
}

// Función para guardar las columnas seleccionadas
function saveSelectedColumns() {
  localStorage.setItem(
    "selectedColumns",
    JSON.stringify(Array.from(selectedColumns))
  );

  // Mostrar indicador visual de que se guardaron las preferencias
  showSaveIndicator();
}

// Función para cargar las columnas seleccionadas
function loadSelectedColumns() {
  const savedColumns = localStorage.getItem("selectedColumns");
  if (savedColumns) {
    const columnsArray = JSON.parse(savedColumns);
    selectedColumns = new Set(columnsArray);
  } else {
    // Columnas por defecto si no hay preferencias guardadas
    selectedColumns = new Set([
      "carry (yds)",
      "peak height (yds)",
      "club speed (mph)",
      "efficiency",
      "club path (deg out-in-/in-out+)",
    ]);
  }
}

// Función para mostrar indicador de guardado
function showSaveIndicator() {
  // Crear o actualizar el indicador
  let indicator = document.getElementById("saveIndicator");
  if (!indicator) {
    indicator = document.createElement("div");
    indicator.id = "saveIndicator";
    indicator.className = "save-indicator";
    indicator.innerHTML = '<i class="fas fa-check"></i> Preferencias guardadas';
    document.body.appendChild(indicator);
  }

  // Mostrar el indicador
  indicator.style.display = "block";
  indicator.style.opacity = "1";

  // Ocultar después de 2 segundos
  setTimeout(() => {
    indicator.style.opacity = "0";
    setTimeout(() => {
      indicator.style.display = "none";
    }, 300);
  }, 2000);
}

// Función para restablecer las columnas por defecto
function resetToDefaultColumns() {
  // Restablecer a las columnas por defecto
  selectedColumns = new Set([
    "carry (yds)",
    "peak height (yds)",
    "club speed (mph)",
    "efficiency",
    "club path (deg out-in-/in-out+)",
  ]);

  // Guardar las preferencias
  saveSelectedColumns();

  // Actualizar el contador
  updateColumnCount();

  // Actualizar los checkboxes en el modal
  updateColumnCheckboxes();

  // Mostrar mensaje de confirmación
  showResetConfirmation();
}

// Función para actualizar los checkboxes del modal
function updateColumnCheckboxes() {
  const checkboxes = document.querySelectorAll(
    '#columnSelectorModal input[type="checkbox"]'
  );
  checkboxes.forEach((checkbox) => {
    const columnName = checkbox.value;
    checkbox.checked = selectedColumns.has(columnName);
  });
}

// Función para mostrar confirmación de restablecimiento
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

// Función para mostrar el modal de YardageBook
async function showYardageBookModal() {
  console.log("🚀 Abriendo modal de YardageBook...");

  // Verificar que las dependencias estén disponibles
  if (typeof auth === "undefined") {
    console.error("❌ Firebase auth no está disponible");
    alert("Error: Firebase no está inicializado");
    return;
  }

  if (typeof db === "undefined") {
    console.error("❌ Firebase db no está disponible");
    alert("Error: Base de datos no está inicializada");
    return;
  }

  // Esperar a que el usuario esté autenticado
  let user = auth.currentUser;
  if (!user) {
    console.log("⏳ Esperando autenticación del usuario...");
    try {
      await new Promise((resolve) => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
          unsubscribe();
          resolve(user);
        });
      });
      user = auth.currentUser;
    } catch (error) {
      console.error("❌ Error al esperar autenticación:", error);
      alert("Error al verificar autenticación");
      return;
    }
  }

  if (!user || !user.uid) {
    console.error("❌ Usuario no autenticado o UID inválido");
    alert("Por favor, inicia sesión para crear un YardageBook");
    return;
  }

  console.log("✅ Usuario autenticado:", user.email, "UID:", user.uid);

  const modal = document.getElementById("yardageBookModal");
  if (!modal) {
    console.error("❌ No se encontró el modal yardageBookModal");
    alert("Error: Modal no encontrado. Recarga la página.");
    return;
  }

  console.log("✅ Modal encontrado, creando contenido...");

  // Crear contenido del modal
  modal.innerHTML = `
    <div class="modal-content yardagebook-modal" style="max-width: 1000px; max-height: 90vh; overflow-y: auto;">
      <div class="modal-header">
        <h3>📚 Crear YardageBook Personalizado</h3>
        <button class="close-modal" onclick="closeYardageBookModal()">&times;</button>
      </div>
      
      <div class="modal-body">
        <!-- Lista de Sesiones -->
        <div class="sessions-section" style="margin-bottom: 30px;">
          <h4 style="color: #4caf50; margin-bottom: 20px; font-size: 18px;">
            <i class="fas fa-list"></i> Selecciona las sesiones para incluir en el YardageBook
          </h4>
          <div id="yardageBookSessionsList" class="sessions-list" style="max-height: 300px; overflow-y: auto; border: 1px solid #404040; border-radius: 8px; padding: 15px; background: #2d2d2d;">
            <p style="text-align: center; color: #b3b3b3;">Cargando sesiones...</p>
          </div>
        </div>
        
        <!-- Ajustes Avanzados -->
        <div class="advanced-settings" style="margin-bottom: 30px;">
          <h4 style="color: #2196f3; margin-bottom: 20px; font-size: 18px;">
            <i class="fas fa-cogs"></i> Ajustes Avanzados
          </h4>
          
          <div class="settings-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
            <div class="setting-group">
              <label style="display: block; margin-bottom: 8px; color: #ffffff; font-weight: 500;">
                Porcentaje de Desviación: <span id="deviationValue" style="color: #4caf50; font-weight: bold;">75%</span>
              </label>
              <input type="range" id="deviationSlider" min="50" max="100" value="75" style="width: 100%; height: 6px; border-radius: 3px; background: #404040; outline: none;">
              <small style="color: #b3b3b3; font-size: 12px;">
                Controla qué tan estrictos son los cálculos de distancia
              </small>
            </div>
            
            <div class="setting-group">
              <label style="display: block; margin-bottom: 8px; color: #ffffff; font-weight: 500;">
                Dispersión Lateral: <span id="lateralValue" style="color: #4caf50; font-weight: bold;">75%</span>
              </label>
              <input type="range" id="lateralSlider" min="50" max="100" value="75" style="width: 100%; height: 6px; border-radius: 3px; background: #404040; outline: none;">
              <small style="color: #b3b3b3; font-size: 12px;">
                Controla la precisión de la dispersión lateral
              </small>
            </div>
          </div>
        </div>
        
        <!-- Información del YardageBook -->
        <div class="yardagebook-info" style="padding: 15px; background: #2d2d2d; border-radius: 8px; border-left: 4px solid #ff9800;">
          <h5 style="color: #ff9800; margin-bottom: 10px; font-size: 14px;">
            <i class="fas fa-info-circle"></i> Información del YardageBook
          </h5>
          <p style="color: #b3b3b3; font-size: 13px; line-height: 1.4;">
            El YardageBook incluirá las distancias promedio calculadas con los parámetros de precisión seleccionados. 
            Los rangos de variación te ayudarán a entender la consistencia de tus tiros con cada palo.
          </p>
        </div>
      </div>
      
      <div class="modal-footer" style="display: flex; justify-content: space-between; align-items: center; padding: 20px; border-top: 1px solid #404040;">
        <div style="color: #b3b3b3; font-size: 14px;">
          <i class="fas fa-lightbulb"></i> Tip: Selecciona múltiples sesiones para obtener datos más precisos
        </div>
        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
          <button onclick="createYardageBookFromModal()" class="create-yardagebook-btn" style="background: #28a745; color: white; padding: 12px 24px; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;">
            <i class="fas fa-download"></i> Descargar YardageBook
          </button>

          <button onclick="closeYardageBookModal()" style="background: #6c757d; color: white; padding: 12px 24px; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  `;

  // Mostrar el modal
  console.log("✅ Mostrando modal...");
  modal.style.display = "block";
  modal.classList.add("show");

  // Cargar sesiones
  console.log("📋 Cargando sesiones...");
  try {
    await loadSessionsForYardageBook();
    console.log("✅ Sesiones cargadas exitosamente");
  } catch (error) {
    console.error("❌ Error al cargar sesiones:", error);
    const sessionsList = document.getElementById("yardageBookSessionsList");
    if (sessionsList) {
      sessionsList.innerHTML = `
        <div style="text-align: center; color: #f44336; padding: 20px;">
          <i class="fas fa-exclamation-triangle" style="font-size: 24px; margin-bottom: 10px;"></i>
          <p>Error al cargar sesiones</p>
          <p style="font-size: 12px;">${error.message}</p>
        </div>
      `;
    }
  }

  // Configurar sliders
  console.log("🎛️ Configurando sliders...");
  try {
    setupYardageBookSliders();
    console.log("✅ Sliders configurados exitosamente");
  } catch (error) {
    console.error("❌ Error al configurar sliders:", error);
  }

  // Agregar event listener para cerrar al hacer clic fuera del modal
  // Solo agregar si no existe ya
  if (!modal.hasAttribute("data-modal-initialized")) {
    const handleModalClick = (event) => {
      if (event.target === modal) {
        closeYardageBookModal();
      }
    };

    modal.addEventListener("click", handleModalClick);
    modal.setAttribute("data-modal-initialized", "true");
    console.log("✅ Event listener del modal agregado");
  }
}

// Función para cargar sesiones en el modal
async function loadSessionsForYardageBook() {
  console.log("🔍 Cargando sesiones para yardage book...");

  const user = auth.currentUser;
  if (!user) {
    console.error("❌ No hay usuario autenticado");
    throw new Error("Usuario no autenticado");
  }

  try {
    const userDocRef = doc(db, "Simulador", user.uid);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
      const sessions = userDoc.data().Sesiones || [];
      console.log(`📊 Encontradas ${sessions.length} sesiones`);

      if (sessions.length === 0) {
        const sessionsList = document.getElementById("yardageBookSessionsList");
        if (sessionsList) {
          sessionsList.innerHTML = `
            <div style="text-align: center; color: #ff9800; padding: 40px;">
              <i class="fas fa-info-circle" style="font-size: 48px; margin-bottom: 15px; opacity: 0.5;"></i>
              <p>No hay sesiones disponibles</p>
              <p style="font-size: 12px; color: #b3b3b3;">Crea algunas sesiones de práctica para poder generar tu YardageBook</p>
            </div>
          `;
        }
        return;
      }

      sessions.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

      const sessionsList = document.getElementById("yardageBookSessionsList");
      if (!sessionsList) {
        console.error("❌ No se encontró el elemento yardageBookSessionsList");
        throw new Error("Elemento de lista no encontrado");
      }

      sessionsList.innerHTML = "";

      sessions.forEach((session, index) => {
        try {
          const shotCount =
            session.stats?.shotCount ||
            (Array.isArray(session.datos) ? session.datos.length : 0);
          const validShots =
            session.datos?.filter((shot) => shot.selected !== false)?.length ||
            0;

          // Obtener palos únicos de la sesión
          const uniqueClubs = new Set();
          if (session.datos && Array.isArray(session.datos)) {
            session.datos.forEach((shot) => {
              if (
                shot &&
                shot["club name"] &&
                shot["club name"] !== "Putter" &&
                shot.selected !== false
              ) {
                uniqueClubs.add(shot["club name"]);
              }
            });
          }
          const clubsList = Array.from(uniqueClubs)
            .map((club) => formatClubName(club))
            .join(", ");

          const sessionDiv = document.createElement("div");
          sessionDiv.className = "session-item-yardagebook";
          sessionDiv.style.cssText = `
          background: #3d3d3d;
          border: 1px solid #404040;
          border-radius: 8px;
          padding: 15px;
          margin-bottom: 10px;
          transition: all 0.3s ease;
          cursor: pointer;
        `;

          sessionDiv.innerHTML = `
          <div class="session-header" style="display: flex; align-items: center; margin-bottom: 10px;">
            <input type="checkbox" id="session${index}" 
                   onchange="toggleSessionSelection(${index})"
                   style="margin-right: 12px; transform: scale(1.2);">
            <label for="session${index}" style="flex: 1; cursor: pointer;">
              <strong style="color: #4caf50; font-size: 16px;">
                📅 Sesión del ${new Date(session.fecha).toLocaleDateString(
                  "es-ES",
                  {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  }
                )}
              </strong>
            </label>
          </div>
          <div class="session-details" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 14px;">
            <div style="text-align: center; padding: 8px; background: #2d2d2d; border-radius: 4px;">
              <div style="color: #ff9800; font-weight: bold;">${shotCount}</div>
              <div style="color: #b3b3b3; font-size: 12px;">Tiros Totales</div>
            </div>
            <div style="text-align: center; padding: 8px; background: #2d2d2d; border-radius: 4px;">
              <div style="color: #4caf50; font-weight: bold;">${validShots}</div>
              <div style="color: #b3b3b3; font-size: 12px;">Tiros Válidos</div>
            </div>
          </div>
          <div class="session-clubs" style="margin-top: 10px; padding: 8px; background: #2d2d2d; border-radius: 4px;">
            <div style="color: #2196f3; font-weight: bold; font-size: 12px; margin-bottom: 5px;">
              <i class="fas fa-golf-ball"></i> Palos utilizados:
            </div>
            <div style="color: #b3b3b3; font-size: 12px;">
              ${clubsList || "No hay datos de palos"}
            </div>
          </div>
        `;

          // Agregar efecto hover
          sessionDiv.addEventListener("mouseenter", function () {
            this.style.transform = "translateY(-2px)";
            this.style.boxShadow = "0 4px 12px rgba(0,0,0,0.3)";
            this.style.borderColor = "#4caf50";
          });

          sessionDiv.addEventListener("mouseleave", function () {
            this.style.transform = "translateY(0)";
            this.style.boxShadow = "none";
            this.style.borderColor = "#404040";
          });

          sessionsList.appendChild(sessionDiv);
        } catch (sessionError) {
          console.error(`❌ Error al procesar sesión ${index}:`, sessionError);
        }
      });

      console.log("✅ Sesiones cargadas exitosamente en el modal");
    } else {
      console.error("❌ No se encontró el documento del usuario");
      throw new Error("Documento de usuario no encontrado");
    }
  } catch (error) {
    console.error("❌ Error al cargar sesiones:", error);
    throw error;
  }
}

// Función para crear el yardage book
async function createYardageBookFromModal() {
  console.log("🚀 Iniciando creación de YardageBook desde modal...");

  try {
    // Verificar que hay sesiones seleccionadas
    if (yardageBookSessions.size === 0) {
      console.log("❌ No hay sesiones seleccionadas");
      alert(
        "Por favor, selecciona al menos una sesión para crear el YardageBook"
      );
      return;
    }

    // Verificar que la función createYardageBook esté disponible
    if (typeof createYardageBook !== "function") {
      console.error("❌ La función createYardageBook no está disponible");
      alert("Error: Función de creación de YardageBook no disponible");
      return;
    }

    // Obtener configuración de los sliders
    const deviationSlider = document.getElementById("deviationSlider");
    const lateralSlider = document.getElementById("lateralSlider");

    if (!deviationSlider || !lateralSlider) {
      console.error("❌ No se encontraron los sliders");
      alert("Error: Configuración de sliders no encontrada");
      return;
    }

    const deviationPercentage = parseInt(deviationSlider.value || 75) / 100;
    const lateralPercentage = parseInt(lateralSlider.value || 75) / 100;

    console.log("📚 Configuración del YardageBook:");
    console.log("- Sesiones seleccionadas:", yardageBookSessions.size);
    console.log("- Desviación:", deviationPercentage);
    console.log("- Dispersión lateral:", lateralPercentage);

    // Obtener datos del usuario
    const user = auth.currentUser;
    if (!user) {
      console.error("❌ No hay usuario autenticado");
      alert("No hay usuario autenticado");
      return;
    }

    console.log("✅ Usuario autenticado:", user.email);

    const userDocRef = doc(db, "Simulador", user.uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      console.error("❌ No se encontraron datos del usuario");
      alert("No se encontraron datos del usuario");
      return;
    }

    const userData = userDoc.data();
    const sessions = userData.Sesiones || [];

    console.log("📊 Total de sesiones disponibles:", sessions.length);

    // Filtrar sesiones seleccionadas
    const selectedSessions = sessions.filter((session, index) =>
      yardageBookSessions.has(index)
    );

    console.log(
      "📋 Sesiones seleccionadas para YardageBook:",
      selectedSessions.length
    );

    if (selectedSessions.length === 0) {
      console.error("❌ No se encontraron sesiones válidas");
      alert("No se encontraron sesiones válidas para crear el YardageBook");
      return;
    }

    // Mostrar indicador de carga
    const button = document.querySelector(".create-yardagebook-btn");
    if (button) {
      button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creando...';
      button.disabled = true;
    }

    console.log("🔄 Llamando a createYardageBook...");

    // Crear yardagebook con configuración personalizada
    await createYardageBook(
      selectedSessions,
      deviationPercentage,
      lateralPercentage
    );

    console.log("✅ YardageBook creado exitosamente");

    // Restaurar botón
    if (button) {
      button.innerHTML =
        '<i class="fas fa-download"></i> Descargar YardageBook';
      button.disabled = false;
    }

    // Cerrar modal
    closeYardageBookModal();

    // Mostrar mensaje de éxito
    alert("YardageBook creado exitosamente");
  } catch (error) {
    console.error("❌ Error al crear yardagebook:", error);
    console.error("Stack trace:", error.stack);

    // Restaurar botón en caso de error
    const button = document.querySelector(".create-yardagebook-btn");
    if (button) {
      button.innerHTML =
        '<i class="fas fa-download"></i> Descargar YardageBook';
      button.disabled = false;
    }

    alert("Error al crear el YardageBook: " + error.message);
  }
}

// Función para configurar sliders
function setupYardageBookSliders() {
  console.log("🎛️ Iniciando configuración de sliders...");
  const deviationSlider = document.getElementById("deviationSlider");
  const lateralSlider = document.getElementById("lateralSlider");

  console.log("Deviation slider encontrado:", !!deviationSlider);
  console.log("Lateral slider encontrado:", !!lateralSlider);

  if (deviationSlider) {
    // Estilo del slider
    deviationSlider.style.cssText = `
      width: 100%;
      height: 6px;
      border-radius: 3px;
      background: #404040;
      outline: none;
      -webkit-appearance: none;
      appearance: none;
    `;

    // Estilo del thumb para webkit
    deviationSlider.style.setProperty("--slider-color", "#4caf50");

    deviationSlider.addEventListener("input", function () {
      const value = this.value;
      const deviationValue = document.getElementById("deviationValue");
      if (deviationValue) {
        deviationValue.textContent = value + "%";
        deviationValue.style.color =
          value >= 80 ? "#4caf50" : value >= 60 ? "#ff9800" : "#f44336";
      }
    });
  }

  if (lateralSlider) {
    // Estilo del slider
    lateralSlider.style.cssText = `
      width: 100%;
      height: 6px;
      border-radius: 3px;
      background: #404040;
      outline: none;
      -webkit-appearance: none;
      appearance: none;
    `;

    // Estilo del thumb para webkit
    lateralSlider.style.setProperty("--slider-color", "#4caf50");

    lateralSlider.addEventListener("input", function () {
      const value = this.value;
      const lateralValue = document.getElementById("lateralValue");
      if (lateralValue) {
        lateralValue.textContent = value + "%";
        lateralValue.style.color =
          value >= 80 ? "#4caf50" : value >= 60 ? "#ff9800" : "#f44336";
      }
    });
  }

  // Agregar estilos CSS para los sliders
  const style = document.createElement("style");
  style.textContent = `
    input[type="range"]::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: var(--slider-color, #4caf50);
      cursor: pointer;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    }
    
    input[type="range"]::-moz-range-thumb {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: #4caf50;
      cursor: pointer;
      border: none;
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    }
    
    input[type="range"]:hover::-webkit-slider-thumb {
      transform: scale(1.1);
    }
    
    input[type="range"]:hover::-moz-range-thumb {
      transform: scale(1.1);
    }
  `;
  document.head.appendChild(style);
  console.log("✅ Estilos de sliders agregados al head");
}

// Función para cerrar el modal
function closeYardageBookModal() {
  const modal = document.getElementById("yardageBookModal");
  if (modal) {
    modal.style.display = "none";
    modal.classList.remove("show");

    // Limpiar el contenido del modal para evitar conflictos
    modal.innerHTML = "";

    // Remover event listeners específicos del modal
    const newModal = modal.cloneNode(true);
    modal.parentNode.replaceChild(newModal, modal);

    // Restaurar el estado de la página principal si es necesario
    restoreMainPageState();

    console.log("✅ Modal cerrado y limpiado correctamente");
  }
}

// Función para restaurar el estado de la página principal
function restoreMainPageState() {
  // Verificar si hay una sesión activa y restaurar su estado
  const activeSession = document.querySelector(".session-item.active");
  if (activeSession && currentData && currentData.length > 0) {
    console.log("🔄 Restaurando estado de la página principal...");

    // Asegurar que la tabla de tiros esté visible
    const shotsTableContainer = document.getElementById("shotsTableContainer");
    if (shotsTableContainer) {
      shotsTableContainer.style.display = "block";
    }

    // Asegurar que el switch esté visible
    showSwitchContainer(true);

    console.log("✅ Estado de la página principal restaurado");
  }
}

// Función para mostrar la tabla de tiros
function displayShotsTable(data, sessionIndex) {
  const shotsTableContainer = document.getElementById("shotsTableContainer");
  if (!shotsTableContainer) return;

  if (!data || data.length === 0) {
    shotsTableContainer.innerHTML = "<p>No hay datos para esta sesión.</p>";
    shotsTableContainer.classList.remove("active");
    return;
  }

  // Inicializar clubVisibility y ocultar todas las filas de tiros
  const groupedData = {};
  data.forEach((row, index) => {
    const club = row["club name"];
    if (!groupedData[club]) groupedData[club] = [];
    groupedData[club].push({ ...row, originalIndex: index });
    if (typeof clubVisibility[club] === "undefined") {
      clubVisibility[club] = false;
    }
  });

  const sortedClubs = Object.keys(groupedData).sort(
    (a, b) => getClubOrder(a) - getClubOrder(b)
  );

  const filteredClubs = currentFilter
    ? sortedClubs.filter((club) => club === currentFilter)
    : sortedClubs;

  // Ordenar los datos de cada palo si hay una columna de ordenamiento
  filteredClubs.forEach((club) => {
    if (currentSort.column) {
      groupedData[club].sort((a, b) => {
        let valA = a[currentSort.column] || 0;
        let valB = b[currentSort.column] || 0;
        if (typeof valA === "string") valA = valA.toLowerCase();
        if (typeof valB === "string") valB = valB.toLowerCase();
        return currentSort.ascending
          ? valA < valB
            ? -1
            : valA > valB
            ? 1
            : 0
          : valA > valB
          ? -1
          : valA < valB
          ? 1
          : 0;
      });
    }
  });

  const tableHTML = `
    <div class="table-actions">
      <button onclick="showColumnSelector()" class="column-selector-btn">
        <i class="fas fa-columns"></i> Seleccionar Columnas
      </button>
      <button onclick="exportToCSV()">
        <i class="fas fa-file-csv"></i> Exportar a CSV
      </button>
      <button onclick="exportCurrentSessionToPDF()">
        <i class="fas fa-file-pdf"></i> Exportar a PDF
      </button>
      <button onclick="showYardageBookModal()">
        <i class="fas fa-book"></i> Crear YardageBook
      </button>
    </div>
    
    <!-- Modal para selector de columnas -->
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
          <button onclick="resetToDefaultColumns()" class="reset-btn">Restablecer</button>
          <button onclick="applyColumnSelection()" class="apply-btn">Aplicar</button>
          <button onclick="closeColumnSelector()" class="cancel-btn">Cancelar</button>
        </div>
      </div>
    </div>
    
    <table class="shots-table">
      <thead>
        <tr>
          <th class="checkbox-column">
            <i class="fas fa-eye"></i>
          </th>
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
              .map(
                (row, shotIndex) => `
                <tr class="shot-row${clubVisibility[club] ? "" : " hidden"}"
                    data-club="${club}"
                    data-original-index="${row.originalIndex}">
                  <td class="checkbox-column">
                    <input type="checkbox"
                      data-original-index="${row.originalIndex}"
                      onchange="updateShotSelection(${sessionIndex}, ${
                  row.originalIndex
                }, this.checked)"
                      ${selectedShots.has(row.originalIndex) ? "checked" : ""}>
                  </td>
                  <td class="shot-number-cell">${shotIndex + 1}</td>
                  ${getActiveColumns()
                    .map((col) => {
                      const value = row[col];
                      return `<td>${formatValue(value, col, row)}</td>`;
                    })
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

  shotsTableContainer.innerHTML = tableHTML;
  shotsTableContainer.classList.add("active");

  // Actualizar el índice de la sesión activa
  const activeSession = document.querySelector(".session-item.active");
  if (activeSession) {
    activeSession.dataset.index = sessionIndex;
  }
}

// Función para actualizar solo el estado visual de un checkbox
function updateCheckboxState(originalIndex, checked) {
  const checkbox = document.querySelector(
    `input[data-original-index="${originalIndex}"]`
  );
  if (checkbox) {
    checkbox.checked = checked;
    const row = checkbox.closest("tr");
    if (row) {
      row.classList.toggle("selected", checked);
    }
  }
}

// Función para actualizar todos los checkboxes
function updateAllCheckboxes() {
  document
    .querySelectorAll("input[data-original-index]")
    .forEach((checkbox) => {
      const originalIndex = parseInt(checkbox.dataset.originalIndex);
      const isChecked = selectedShots.has(originalIndex);
      checkbox.checked = isChecked;
      const row = checkbox.closest("tr");
      if (row) {
        row.classList.toggle("selected", isChecked);
      }
    });
}

// Función para actualizar la selección de un tiro en Firebase
async function updateShotSelectionInFirebase(
  sessionIndex,
  originalIndex,
  selected
) {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("No hay usuario autenticado");

    const userDocRef = doc(db, "Simulador", user.uid);
    const userDoc = await getDoc(userDocRef);
    if (!userDoc.exists())
      throw new Error("No se encontraron datos del usuario");

    const userData = userDoc.data();
    const sessions = userData.Sesiones || [];
    if (!sessions[sessionIndex]) throw new Error("Sesión no encontrada");

    // Verificar que el tiro existe
    if (!sessions[sessionIndex].datos[originalIndex]) {
      console.error("Tiro no encontrado en Firebase:", {
        sessionIndex,
        originalIndex,
        totalTiros: sessions[sessionIndex].datos.length,
      });
      throw new Error("Tiro no encontrado");
    }

    // Actualizar el campo selected del tiro
    sessions[sessionIndex].datos[originalIndex].selected = selected;

    // Actualizar en Firebase
    await updateDoc(userDocRef, {
      Sesiones: sessions,
    });

    console.log(
      `Tiro ${originalIndex} de la sesión ${sessionIndex} actualizado a ${selected}`
    );
  } catch (error) {
    console.error("Error al actualizar la selección del tiro:", error);
    throw error;
  }
}

// Función optimizada para actualizar la selección
window.updateShotSelection = async function (
  sessionIndex,
  originalIndex,
  checked
) {
  try {
    // Actualizar Firebase
    await updateShotSelectionInFirebase(sessionIndex, originalIndex, checked);

    // Actualizar estado local
    if (checked) {
      selectedShots.add(originalIndex);
    } else {
      selectedShots.delete(originalIndex);
    }

    // Actualizar solo el checkbox y la fila afectada
    updateCheckboxState(originalIndex, checked);

    // Actualizar los promedios del palo afectado
    const affectedClub = currentData[originalIndex]["club name"];
    const clubRow = document.querySelector(
      `.average-row[data-club="${affectedClub}"]`
    );
    if (clubRow) {
      const clubShots = currentData.filter(
        (shot) => shot["club name"] === affectedClub
      );
      const averages = calculateClubAverages(affectedClub, clubShots);

      // Actualizar las celdas de promedio
      const cells = clubRow.querySelectorAll(
        "td:not(:first-child):not(:nth-child(2))"
      );
      cells.forEach((cell, index) => {
        cell.textContent = averages[index];
      });
    }

    // Actualizar el gráfico de dispersión si existe
    if (typeof createScatterPlot === "function") {
      requestAnimationFrame(createScatterPlot);
    }
  } catch (error) {
    console.error("Error al actualizar la selección:", error);
    // Revertir el estado visual en caso de error
    updateCheckboxState(originalIndex, !checked);
    alert("Error al actualizar la selección. Por favor, intente nuevamente.");
  }
};

// Función optimizada para toggle de todos los checkboxes
window.toggleAllChecks = async function (checked) {
  try {
    const sessionIndex = parseInt(
      document.querySelector(".session-item.active").dataset.index
    );
    const checkboxes = document.querySelectorAll("input[data-original-index]");
    const updates = [];

    // Preparar todas las actualizaciones
    checkboxes.forEach((checkbox) => {
      const originalIndex = parseInt(checkbox.dataset.originalIndex);
      updates.push(
        updateShotSelectionInFirebase(sessionIndex, originalIndex, checked)
      );
    });

    // Ejecutar todas las actualizaciones en paralelo
    await Promise.all(updates);

    // Actualizar estado local
    if (checked) {
      checkboxes.forEach((checkbox) => {
        selectedShots.add(parseInt(checkbox.dataset.originalIndex));
      });
    } else {
      selectedShots.clear();
    }

    // Actualizar UI
    updateAllCheckboxes();

    // Actualizar todos los promedios
    updateClubAverages();

    // Actualizar gráfico si existe
    if (typeof createScatterPlot === "function") {
      requestAnimationFrame(createScatterPlot);
    }
  } catch (error) {
    console.error("Error al actualizar todas las selecciones:", error);
    alert(
      "Error al actualizar las selecciones. Por favor, intente nuevamente."
    );
  }
};

// Función optimizada para toggle de palo
window.toggleClubShots = function (club) {
  // Ocultar todos los palos primero
  Object.keys(clubVisibility).forEach((key) => {
    if (key !== club) {
      clubVisibility[key] = false;
      const rows = document.querySelectorAll(`tr.shot-row[data-club="${key}"]`);
      const averageRow = document.querySelector(
        `tr.average-row[data-club="${key}"]`
      );
      rows.forEach((row) => {
        row.classList.remove("visible");
        row.classList.add("hidden");
      });
      if (averageRow) {
        const arrowImg = averageRow.querySelector(".arrow-icon");
        if (arrowImg) arrowImg.classList.remove("rotated");
      }
    }
  });

  // Toggle del palo seleccionado
  clubVisibility[club] = !clubVisibility[club];
  const rows = document.querySelectorAll(`tr.shot-row[data-club="${club}"]`);
  const averageRow = document.querySelector(
    `tr.average-row[data-club="${club}"]`
  );
  if (averageRow) {
    rows.forEach((row) => {
      if (clubVisibility[club]) {
        row.classList.remove("hidden");
        row.classList.add("visible");
      } else {
        row.classList.remove("visible");
        row.classList.add("hidden");
      }
    });
    const arrowImg = averageRow.querySelector(".arrow-icon");
    if (arrowImg) {
      if (clubVisibility[club]) {
        arrowImg.classList.add("rotated");
      } else {
        arrowImg.classList.remove("rotated");
      }
    }
    if (clubVisibility[club]) {
      averageRow.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }
};

// Función optimizada para ordenar
window.sortTable = function (column) {
  if (currentSort.column === column) {
    currentSort.ascending = !currentSort.ascending;
  } else {
    currentSort = { column, ascending: true };
  }

  // Actualizar solo los iconos de ordenamiento
  document.querySelectorAll("th[data-column]").forEach((th) => {
    const sortIcon = th.querySelector(".sort-icon");
    if (th.dataset.column === column) {
      sortIcon.textContent = currentSort.ascending ? "↑" : "↓";
    } else {
      sortIcon.textContent = "";
    }
  });

  // Regenerar la tabla solo si es necesario
  displayShotsTable(
    currentData,
    parseInt(document.querySelector(".session-item.active").dataset.index)
  );
};

window.updateFilter = function (value) {
  currentFilter = value || null;
  selectedShots = new Set(currentData.map((_, i) => i));
  clubVisibility = {};
  currentData.forEach((row) => {
    if (!currentFilter || row["club name"] === currentFilter) {
      clubVisibility[row["club name"]] = false;
    }
  });
  displayShotsTable(currentData, 0);
};

window.exportToCSV = function () {
  const filteredClubs = currentFilter
    ? [currentFilter]
    : Object.keys(
        currentData.reduce((a, row) => ({ ...a, [row["club name"]]: true }), {})
      ).sort((a, b) => getClubOrder(a) - getClubOrder(b));
  let csvRows = [];
  const headers = ["Club / Shot Number", ...fixedColumns]
    .map((col) => col.toUpperCase())
    .join(",");
  csvRows.push(headers);

  filteredClubs.forEach((club) => {
    const shots = currentData
      .map((row, index) => ({ ...row, originalIndex: index }))
      .filter(
        (row) =>
          row["club name"] === club && selectedShots.has(row.originalIndex)
      );
    if (currentSort.column) {
      shots.sort((a, b) => {
        let valA = a[currentSort.column] || 0;
        let valB = b[currentSort.column] || 0;
        if (typeof valA === "string") valA = valA.toLowerCase();
        if (typeof valB === "string") valB = valB.toLowerCase();
        return currentSort.ascending
          ? valA < valB
            ? -1
            : 1
          : valA > valB
          ? -1
          : 1;
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
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", "golf_shots.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Cargar estados guardados al iniciar cuando el DOM esté listo
document.addEventListener("DOMContentLoaded", () => {
  loadSelectedSessions();
  loadDeselectedShots();
});

// Hacer las funciones disponibles globalmente
window.exportSessionToPDF = exportSessionToPDF;
window.createYardageBook = createYardageBook;
window.createYardageBookFromModal = createYardageBookFromModal;

// Función de prueba para diagnosticar problemas
window.testYardageBookModal = function () {
  console.log("🧪 Probando modal de YardageBook...");

  // Verificar que el modal existe
  const modal = document.getElementById("yardageBookModal");
  if (!modal) {
    console.error("❌ Modal no encontrado");
    alert("Modal no encontrado. Verifica que el HTML esté cargado.");
    return;
  }

  // Verificar que las funciones están disponibles
  if (typeof showYardageBookModal !== "function") {
    console.error("❌ showYardageBookModal no está disponible");
    alert("Función showYardageBookModal no está disponible");
    return;
  }

  if (typeof loadSessionsForYardageBook !== "function") {
    console.error("❌ loadSessionsForYardageBook no está disponible");
    alert("Función loadSessionsForYardageBook no está disponible");
    return;
  }

  // Verificar Firebase
  if (typeof auth === "undefined") {
    console.error("❌ Firebase auth no está disponible");
    alert("Firebase auth no está disponible");
    return;
  }

  if (typeof db === "undefined") {
    console.error("❌ Firebase db no está disponible");
    alert("Firebase db no está disponible");
    return;
  }

  console.log(
    "✅ Todas las verificaciones pasaron, llamando a showYardageBookModal..."
  );

  // Intentar abrir el modal
  try {
    showYardageBookModal();
  } catch (error) {
    console.error("❌ Error al abrir modal:", error);
    alert("Error al abrir modal: " + error.message);
  }
};

// Función para cargar y mostrar sesiones

// Función para cargar y mostrar sesiones
async function loadSessions() {
  const sessionsList = document.getElementById("sessionsList");
  const shotsTableContainer = document.getElementById("shotsTableContainer");
  sessionsList.innerHTML = "<p>Cargando sesiones...</p>";

  try {
    // Cargar preferencias guardadas al inicio
    loadSelectedSessions();
    loadDeselectedShots();
    loadSelectedColumns();

    // Esperar a que auth.currentUser esté disponible
    let user = auth.currentUser;
    if (!user) {
      await new Promise((resolve) => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
          unsubscribe();
          resolve(user);
        });
      });
      user = auth.currentUser;
    }

    if (!user) {
      sessionsList.innerHTML = "<p>No hay usuario autenticado.</p>";
      return;
    }

    const userDocRef = doc(db, "Simulador", user.uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      sessionsList.innerHTML = "<p>No se encontraron sesiones.</p>";
      return;
    }

    const userData = userDoc.data();
    const sessions = userData.Sesiones || [];

    if (sessions.length === 0) {
      sessionsList.innerHTML = "<p>No hay sesiones registradas.</p>";
      return;
    }

    document.querySelector(
      ".sessions h2"
    ).textContent = `Sesiones de ${userData.nombre} ${userData.apellido}`;

    sessions.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

    sessionsList.innerHTML = "";
    sessions.forEach((session, index) => {
      const sessionItem = document.createElement("div");
      sessionItem.className = "session-item";
      sessionItem.innerHTML = `
        <p><strong>Fecha:</strong> ${session.fecha}</p>
        <p><strong>Cantidad de tiros:</strong> ${session.stats.shotCount}</p>
        <p><strong>Duración:</strong> ${session.stats.sessionTime}</p>
      `;

      sessionItem.addEventListener("click", () => {
        document
          .querySelectorAll(".session-item")
          .forEach((item) => item.classList.remove("active"));
        sessionItem.classList.add("active");

        // Asegurar que cada tiro tenga su índice original
        currentData = session.datos.map((shot, idx) => ({
          ...shot,
          originalIndex: idx,
        }));

        currentSort = { column: null, ascending: true };
        currentFilter = null;

        // Inicializar selectedShots basado en el campo selected de cada tiro
        selectedShots = new Set(
          currentData
            .map((shot, idx) => (shot.selected !== false ? idx : null))
            .filter((idx) => idx !== null)
        );

        clubVisibility = {};
        currentData.forEach((row) => {
          clubVisibility[row["club name"]] = true;
        });

        showSwitchContainer(true);
        const toggle = document.getElementById("toggleView");
        if (toggle) {
          toggle.checked = false;
          toggleViewMode();
        }
        displayShotsTable(currentData, index);
      });

      sessionsList.appendChild(sessionItem);
    });
  } catch (error) {
    console.error("Error al cargar sesiones:", error);
    sessionsList.innerHTML = "<p>Error al cargar sesiones.</p>";
  }
}

// Solo cargar sesiones si no se han cargado ya
if (!window.sessionsLoaded) {
  loadSessions();
  window.sessionsLoaded = true;
}

export { currentData, selectedShots, clubColors, formatClubName };

// Agregar función global para exportar la sesión actual
window.exportCurrentSessionToPDF = async function () {
  if (!currentData || currentData.length === 0) {
    alert("No hay datos de sesión para exportar");
    return;
  }

  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error("No hay usuario autenticado");
    }

    // Obtener datos del usuario desde Firestore
    const userDocRef = doc(db, "Simulador", user.uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      throw new Error("No se encontraron datos del usuario");
    }

    const userData = userDoc.data();
    const nombreCompleto = `${userData.nombre} ${userData.apellido}`;

    // Obtener la fecha de la sesión actual
    const fechaSesion =
      currentData[0]?.["shot created date"]?.split(" ")[0] ||
      new Date().toISOString().split("T")[0];

    // Preparar los datos con la propiedad selected
    const dataWithSelection = currentData.map((shot, index) => ({
      ...shot,
      selected: selectedShots.has(index),
    }));

    // Pasar los datos del usuario a exportSessionToPDF
    await exportSessionToPDF(dataWithSelection, nombreCompleto, fechaSesion);
  } catch (error) {
    console.error("Error al exportar sesión:", error);
    alert("Error al exportar la sesión. Por favor, intente nuevamente.");
  }
};

async function loadUserSessions() {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error("No hay usuario autenticado");
    }

    // Obtener datos del usuario desde Firestore
    const userDocRef = doc(db, "Simulador", user.uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      throw new Error("No se encontró el documento para el UID: " + user.uid);
    }

    const userData = userDoc.data();
    if (!userData.Sesiones || userData.Sesiones.length === 0) {
      throw new Error("El documento existe pero no tiene sesiones");
    }

    // Ordenar sesiones por fecha (más reciente primero)
    const sesionesOrdenadas = [...userData.Sesiones].sort((a, b) => {
      const fechaA = new Date(a.fecha);
      const fechaB = new Date(b.fecha);
      return fechaB - fechaA;
    });

    // ... resto del código existente ...
  } catch (error) {
    console.error("Error al cargar sesiones:", error);
    alert("Error al cargar las sesiones. Por favor, intente nuevamente.");
  }
}

async function loadSessionData(sessionId) {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error("No hay usuario autenticado");
    }

    const userDocRef = doc(db, "Simulador", user.uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      throw new Error("No se encontró el documento para el UID: " + user.uid);
    }

    const userData = userDoc.data();
    const session = userData.Sesiones.find((s) => s.id === sessionId);

    if (!session) {
      throw new Error("No se encontró la sesión");
    }

    currentData = session.data;
    // ... resto del código existente ...
  } catch (error) {
    console.error("Error al cargar datos de la sesión:", error);
    alert(
      "Error al cargar los datos de la sesión. Por favor, intente nuevamente."
    );
  }
}

// Función para manejar la selección de sesiones
window.toggleSessionSelection = function (sessionIndex) {
  if (yardageBookSessions.has(sessionIndex)) {
    yardageBookSessions.delete(sessionIndex);
    deselectedShots.delete(sessionIndex);
  } else {
    yardageBookSessions.add(sessionIndex);
  }
  // Guardar el estado de las sesiones seleccionadas
  saveSelectedSessions();
};

// Función para manejar la selección avanzada de sesiones
function toggleAdvancedSessionSelection(sessionIndex) {
  if (yardageBookSessions.has(sessionIndex)) {
    yardageBookSessions.delete(sessionIndex);
    deselectedShots.delete(sessionIndex);
  } else {
    yardageBookSessions.add(sessionIndex);
  }

  // Guardar el estado y actualizar estadísticas
  saveSelectedSessions();
  updateYardageBookStats();
  updateYardageBookPreview();
}

// Función para actualizar estadísticas del yardagebook
async function updateYardageBookStats() {
  const selectedCount = yardageBookSessions.size;
  const totalShots = await calculateTotalShots();

  // Calcular palos estimados
  let estimatedClubs = 0;
  if (selectedCount > 0) {
    try {
      const user = auth.currentUser;
      if (user) {
        const userDocRef = doc(db, "Simulador", user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const sessions = userDoc.data().Sesiones || [];
          const uniqueClubs = new Set();

          yardageBookSessions.forEach((sessionIndex) => {
            if (sessions[sessionIndex] && sessions[sessionIndex].datos) {
              sessions[sessionIndex].datos.forEach((shot) => {
                if (
                  shot.selected !== false &&
                  shot["club name"] &&
                  shot["club name"] !== "Putter"
                ) {
                  uniqueClubs.add(shot["club name"]);
                }
              });
            }
          });

          estimatedClubs = uniqueClubs.size;
        }
      }
    } catch (error) {
      console.error("Error al calcular palos estimados:", error);
    }
  }

  const selectedCountElement = document.getElementById("selectedSessionsCount");
  const totalShotsElement = document.getElementById("totalShotsCount");
  const estimatedClubsElement = document.getElementById("estimatedClubsCount");

  if (selectedCountElement) {
    selectedCountElement.textContent = selectedCount;
  }

  if (totalShotsElement) {
    totalShotsElement.textContent = totalShots;
  }

  if (estimatedClubsElement) {
    estimatedClubsElement.textContent = estimatedClubs;
  }
}

// Función para actualizar la previsualización del yardagebook
async function updateYardageBookPreview() {
  try {
    console.log("🔄 Actualizando previsualización del yardagebook...");
    console.log("Sesiones seleccionadas:", yardageBookSessions.size);

    if (yardageBookSessions.size > 0) {
      const preview = await generateYardageBookPreview();
      displayYardageBookPreview(preview);
    } else {
      const previewContainer = document.getElementById("clubsPreview");
      if (previewContainer) {
        previewContainer.innerHTML = `
          <div class="preview-header">
            <h4>Previsualización del YardageBook</h4>
            <div class="preview-summary">
              <span>Selecciona al menos una sesión para ver la previsualización</span>
            </div>
          </div>
        `;
      }
    }
  } catch (error) {
    console.error("Error al actualizar previsualización:", error);
    // No propagar el error para evitar que afecte el modal
  }
}

// Función para calcular total de tiros
async function calculateTotalShots() {
  const user = auth.currentUser;
  if (!user) return 0;

  try {
    const userDocRef = doc(db, "Simulador", user.uid);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
      const sessions = userDoc.data().Sesiones || [];
      let totalShots = 0;

      yardageBookSessions.forEach((sessionIndex) => {
        if (sessions[sessionIndex]) {
          const validShots =
            sessions[sessionIndex].datos?.filter(
              (shot) => shot.selected !== false
            )?.length || 0;
          totalShots += validShots;
        }
      });

      return totalShots;
    }
  } catch (error) {
    console.error("Error al calcular tiros totales:", error);
  }

  return 0;
}

// Función para previsualizar yardagebook
async function previewYardageBook() {
  try {
    const preview = await generateYardageBookPreview();
    displayYardageBookPreview(preview);
  } catch (error) {
    console.error("Error al previsualizar:", error);
    showErrorModal({
      title: "Error de Previsualización",
      message: "No se pudo generar la previsualización",
      details: error.message,
    });
  }
}

// Función para generar previsualización
async function generateYardageBookPreview() {
  const user = auth.currentUser;
  if (!user) throw new Error("No hay usuario autenticado");

  const userDocRef = doc(db, "Simulador", user.uid);
  const userDoc = await getDoc(userDocRef);

  if (!userDoc.exists()) throw new Error("No se encontraron datos del usuario");

  const userData = userDoc.data();
  const sessions = userData.Sesiones || [];

  // Filtrar sesiones seleccionadas
  const selectedSessions = sessions.filter((session, index) =>
    yardageBookSessions.has(index)
  );

  if (selectedSessions.length === 0) {
    throw new Error("No hay sesiones seleccionadas");
  }

  // Procesar sesiones
  const processedSessions = selectedSessions.map((session) => {
    const validShots =
      session.datos?.filter((shot) => shot.selected !== false) || [];
    return { ...session, shots: validShots };
  });

  // Agrupar por palos
  const shotsByClub = {};
  processedSessions.forEach((session) => {
    session.shots.forEach((shot) => {
      const club = shot["club name"];
      if (!club || club === "Putter") return;

      if (!shotsByClub[club]) shotsByClub[club] = [];
      shotsByClub[club].push(shot);
    });
  });

  // Calcular estadísticas preliminares
  const clubStats = {};
  Object.keys(shotsByClub).forEach((club) => {
    const shots = shotsByClub[club];
    if (shots.length >= 3) {
      const carryValues = shots
        .map((s) => parseFloat(s["carry (yds)"]))
        .filter((v) => !isNaN(v));
      const avgCarry =
        carryValues.reduce((a, b) => a + b, 0) / carryValues.length;

      clubStats[club] = {
        avgCarry: avgCarry,
        shots: shots.length,
        minCarry: Math.min(...carryValues),
        maxCarry: Math.max(...carryValues),
        variation: Math.max(...carryValues) - Math.min(...carryValues),
      };
    }
  });

  return {
    totalClubs: Object.keys(clubStats).length,
    totalShots: Object.values(clubStats).reduce(
      (sum, club) => sum + club.shots,
      0
    ),
    avgShotsPerClub:
      Object.values(clubStats).reduce((sum, club) => sum + club.shots, 0) /
      Object.keys(clubStats).length,
    clubs: clubStats,
  };
}

// Función para mostrar previsualización
function displayYardageBookPreview(preview) {
  const previewContainer = document.getElementById("clubsPreview");

  if (!previewContainer) return;

  previewContainer.innerHTML = `
    <div class="preview-header" style="margin-bottom: 20px;">
      <h4 style="color: #4caf50; margin-bottom: 10px;">
        <i class="fas fa-chart-bar"></i> Resumen del YardageBook
      </h4>
      <div class="preview-summary" style="display: flex; justify-content: space-around; background: #3d3d3d; padding: 15px; border-radius: 8px;">
        <div style="text-align: center;">
          <div style="font-size: 20px; font-weight: bold; color: #4caf50;">${
            preview.totalClubs
          }</div>
          <div style="font-size: 12px; color: #b3b3b3;">Palos</div>
        </div>
        <div style="text-align: center;">
          <div style="font-size: 20px; font-weight: bold; color: #2196f3;">${
            preview.totalShots
          }</div>
          <div style="font-size: 12px; color: #b3b3b3;">Tiros</div>
        </div>
        <div style="text-align: center;">
          <div style="font-size: 20px; font-weight: bold; color: #ff9800;">${preview.avgShotsPerClub.toFixed(
            1
          )}</div>
          <div style="font-size: 12px; color: #b3b3b3;">Tiros/Palo</div>
        </div>
      </div>
    </div>
    
    <div class="preview-clubs" style="max-height: 300px; overflow-y: auto;">
      <h5 style="color: #ffffff; margin-bottom: 15px; font-size: 16px;">
        <i class="fas fa-golf-ball"></i> Distancias por Palo (ordenadas por distancia)
      </h5>
      ${Object.entries(preview.clubs)
        .sort((a, b) => b[1].avgCarry - a[1].avgCarry)
        .map(
          ([club, stats]) => `
          <div class="preview-club" style="
            background: #3d3d3d;
            border: 1px solid #404040;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 10px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            transition: all 0.3s ease;
          ">
            <div class="club-name" style="flex: 1;">
              <div style="font-weight: bold; color: #4caf50; font-size: 16px;">${formatClubName(
                club
              )}</div>
              <div style="font-size: 12px; color: #b3b3b3; margin-top: 2px;">${
                stats.shots
              } tiros analizados</div>
            </div>
            <div class="club-stats" style="display: flex; gap: 15px; align-items: center;">
              <div style="text-align: center;">
                <div style="font-size: 18px; font-weight: bold; color: #2196f3;">${stats.avgCarry.toFixed(
                  0
                )}</div>
                <div style="font-size: 10px; color: #b3b3b3;">yds avg</div>
              </div>
              <div style="text-align: center;">
                <div style="font-size: 14px; font-weight: bold; color: #ff9800;">±${stats.variation.toFixed(
                  0
                )}</div>
                <div style="font-size: 10px; color: #b3b3b3;">variación</div>
              </div>
              <div style="text-align: center;">
                <div style="font-size: 14px; font-weight: bold; color: #e91e63;">${stats.minCarry.toFixed(
                  0
                )}-${stats.maxCarry.toFixed(0)}</div>
                <div style="font-size: 10px; color: #b3b3b3;">rango</div>
              </div>
            </div>
          </div>
        `
        )
        .join("")}
    </div>
    
    <div style="margin-top: 20px; padding: 15px; background: #2d2d2d; border-radius: 8px; border-left: 4px solid #4caf50;">
      <h5 style="color: #4caf50; margin-bottom: 10px; font-size: 14px;">
        <i class="fas fa-info-circle"></i> Información del YardageBook
      </h5>
      <p style="color: #b3b3b3; font-size: 13px; line-height: 1.4;">
        Este YardageBook incluirá las distancias promedio calculadas con los parámetros de precisión seleccionados. 
        Los rangos de variación te ayudarán a entender la consistencia de tus tiros con cada palo.
      </p>
    </div>
  `;
}

// Función para crear yardagebook avanzado
async function createAdvancedYardageBook() {
  try {
    if (yardageBookSessions.size === 0) {
      throw new YardageBookError(
        "No hay sesiones seleccionadas",
        "NO_SESSIONS"
      );
    }

    // Obtener configuración de los sliders
    const deviationPercentage =
      parseInt(document.getElementById("deviationSlider")?.value || 75) / 100;
    const lateralPercentage =
      parseInt(document.getElementById("lateralSlider")?.value || 75) / 100;

    // Crear yardagebook con configuración personalizada
    await createYardageBook(
      yardageBookSessions,
      deviationPercentage,
      lateralPercentage
    );

    // Cerrar modal
    closeYardageBookModal();

    // Mostrar mensaje de éxito
    showSuccessMessage("YardageBook creado exitosamente");
  } catch (error) {
    console.error("Error al crear yardagebook:", error);
    const errorInfo = handleYardageBookError(error);
    showErrorModal(errorInfo);
  }
}

// Función para mostrar mensaje de éxito
function showSuccessMessage(message) {
  const indicator = document.getElementById("saveIndicator");
  if (indicator) {
    indicator.innerHTML = `<i class="fas fa-check"></i> ${message}`;
    indicator.style.display = "block";
    indicator.style.opacity = "1";

    setTimeout(() => {
      indicator.style.opacity = "0";
      setTimeout(() => {
        indicator.style.display = "none";
      }, 300);
    }, 3000);
  }
}

// Función para mostrar modal de error
function showErrorModal(errorInfo) {
  const modal = document.createElement("div");
  modal.className = "modal error-modal";
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header">
        <h3>${errorInfo.title}</h3>
        <button class="close-modal" onclick="this.closest('.modal').remove()">&times;</button>
      </div>
      <div class="modal-body">
        <p>${errorInfo.message}</p>
        ${
          errorInfo.suggestions
            ? `
          <div class="suggestions">
            <h4>Sugerencias:</h4>
            <ul>
              ${errorInfo.suggestions
                .map((suggestion) => `<li>${suggestion}</li>`)
                .join("")}
            </ul>
          </div>
        `
            : ""
        }
      </div>
      <div class="modal-footer">
        <button onclick="this.closest('.modal').remove()">Cerrar</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
}

// Función para manejar la deselección de tiros
window.toggleShotSelection = function (sessionIndex, shotIndex) {
  if (!deselectedShots.has(sessionIndex)) {
    deselectedShots.set(sessionIndex, new Set());
  }

  const deselectedShotsForSession = deselectedShots.get(sessionIndex);
  if (deselectedShotsForSession.has(shotIndex)) {
    deselectedShotsForSession.delete(shotIndex);
    if (deselectedShotsForSession.size === 0) {
      deselectedShots.delete(sessionIndex);
    }
  } else {
    deselectedShotsForSession.add(shotIndex);
  }

  // Guardar el estado de los tiros deseleccionados
  saveDeselectedShots();
};

async function loadSession(session, index) {
  document
    .querySelectorAll(".session-item")
    .forEach((item) => item.classList.remove("active"));
  const sessionItem = document.querySelector(`[data-session-index="${index}"]`);
  if (sessionItem) sessionItem.classList.add("active");

  // Asegurarnos de que cada tiro tenga su índice original
  currentData = session.datos.map((shot, i) => ({
    ...shot,
    originalIndex: i,
  }));

  currentSort = { column: null, ascending: true };
  currentFilter = null;

  // Inicializar selectedShots basado en el campo selected de cada tiro
  selectedShots = new Set(
    currentData
      .map((shot, i) => (shot.selected !== false ? i : null))
      .filter((i) => i !== null)
  );

  clubVisibility = {};
  currentData.forEach((row) => {
    clubVisibility[row["club name"]] = false;
  });

  showSwitchContainer(true);

  // Limpiar controles del mapa si existen
  clearScatterControls();

  const toggle = document.getElementById("toggleView");
  if (toggle) {
    toggle.checked = false;
    toggleViewMode();
  }
  displayShotsTable(currentData, index);
}

const averageRowHTML = (club, averages) => `
  <tr class="average-row" data-club="${club}">
    <td class="checkbox-column">
      <button class="toggle-club-btn" data-club="${club}" onclick="toggleClubShots('${club}')" aria-label="Mostrar/ocultar tiros">
        <img src="./arrow-down.png" class="arrow-icon" alt="Desplegar">
      </button>
    </td>
    <td class="club-name-cell">${formatClubName(club)}</td>
    ${averages.map((avg) => `<td>${avg}</td>`).join("")}
  </tr>
`;

// Switch para alternar entre tabla y mapa de dispersión
function toggleViewMode() {
  const isMap = document.getElementById("toggleView").checked;
  const labelTable = document.getElementById("label-table");
  const labelMap = document.getElementById("label-map");

  // Actualizar etiquetas
  if (labelTable) labelTable.classList.toggle("active", !isMap);
  if (labelMap) labelMap.classList.toggle("active", isMap);

  const table = document.getElementById("shotsTableContainer");
  const canvas = document.getElementById("scatterCanvas");
  const controls = document.getElementById("scatterControls");

  // Mostrar/ocultar elementos
  if (table) {
    table.style.display = isMap ? "none" : "block";
  }
  if (canvas) {
    canvas.style.display = isMap ? "block" : "none";
  }
  if (controls) {
    controls.style.display = isMap ? "flex" : "none";
  }

  // Si se activa el mapa, dibuja el scatter plot
  if (isMap && typeof window.createScatterPlot === "function") {
    console.log("🔄 Activando mapa de dispersión...");
    window.createScatterPlot();

    // Asegurar que los controles estén visibles
    setTimeout(() => {
      const controls = document.getElementById("scatterControls");
      if (controls) {
        controls.style.display = "flex";
      }
    }, 100);
  } else if (!isMap) {
    console.log("📊 Mostrando tabla de datos...");

    // Ocultar controles del mapa
    const controls = document.getElementById("scatterControls");
    if (controls) {
      controls.style.display = "none";
    }
  }
}

// Hacer la función disponible globalmente
window.toggleViewMode = toggleViewMode;

// Función para limpiar controles del mapa
function clearScatterControls() {
  const controls = document.getElementById("scatterControls");
  if (controls) {
    controls.style.display = "none";
    // Remover los botones para evitar duplicados
    const buttons = controls.querySelectorAll("button");
    buttons.forEach((button) => button.remove());
  }
}

// Inicialización cuando el DOM esté listo
window.addEventListener("DOMContentLoaded", () => {
  console.log("🚀 Inicializando sistema de vistas...");

  const toggle = document.getElementById("toggleView");
  if (toggle) {
    toggle.checked = false;
    toggleViewMode();
  }

  // Verificar que las funciones estén disponibles
  if (typeof window.createScatterPlot === "function") {
    console.log("✅ createScatterPlot disponible");
  } else {
    console.warn("⚠️ createScatterPlot no disponible");
  }

  if (typeof window.toggleViewMode === "function") {
    console.log("✅ toggleViewMode disponible");
  } else {
    console.warn("⚠️ toggleViewMode no disponible");
  }

  // Inicializar funciones del yardage book
  initializeYardageBook();
});

// Función para inicializar el yardage book
function initializeYardageBook() {
  console.log("🔧 Inicializando YardageBook...");

  // Cargar preferencias guardadas
  loadSelectedSessions();
  loadDeselectedShots();
  loadSelectedColumns();

  // Verificar que el modal existe
  const modal = document.getElementById("yardageBookModal");
  if (!modal) {
    console.error("❌ Modal yardageBookModal no encontrado en el DOM");
    return;
  }

  console.log("✅ Modal yardageBookModal encontrado");

  // Verificar que todas las funciones estén disponibles globalmente
  const requiredFunctions = [
    "showYardageBookModal",
    "closeYardageBookModal",
    "previewYardageBook",
    "createAdvancedYardageBook",
    "toggleAdvancedSessionSelection",
  ];

  requiredFunctions.forEach((funcName) => {
    if (typeof window[funcName] === "function") {
      console.log(`✅ ${funcName} disponible`);
    } else {
      console.error(`❌ ${funcName} no disponible`);
    }
  });
}

// Función para mostrar el switch solo cuando hay sesión seleccionada
function showSwitchContainer(show) {
  const switchContainer = document.getElementById("switchContainer");
  if (switchContainer) {
    switchContainer.style.display = show ? "" : "none";
  }
}

// Hacer las funciones disponibles globalmente
window.showColumnSelector = showColumnSelector;
window.closeColumnSelector = closeColumnSelector;
window.applyColumnSelection = applyColumnSelection;
window.updateColumnCount = updateColumnCount;
window.toggleColumnSelection = toggleColumnSelection;
window.saveSelectedColumns = saveSelectedColumns;
window.loadSelectedColumns = loadSelectedColumns;
window.showSaveIndicator = showSaveIndicator;
window.resetToDefaultColumns = resetToDefaultColumns;
window.updateColumnCheckboxes = updateColumnCheckboxes;

// Hacer disponibles las funciones de YardageBook globalmente
window.showYardageBookModal = showYardageBookModal;
window.closeYardageBookModal = closeYardageBookModal;
window.previewYardageBook = previewYardageBook;
window.createAdvancedYardageBook = createAdvancedYardageBook;
window.toggleAdvancedSessionSelection = toggleAdvancedSessionSelection;

// Verificar que todas las funciones de YardageBook estén disponibles
console.log("🔍 Verificando funciones de YardageBook...");
console.log("showYardageBookModal:", typeof window.showYardageBookModal);
console.log("closeYardageBookModal:", typeof window.closeYardageBookModal);
console.log("previewYardageBook:", typeof window.previewYardageBook);
console.log(
  "createAdvancedYardageBook:",
  typeof window.createAdvancedYardageBook
);
console.log(
  "toggleAdvancedSessionSelection:",
  typeof window.toggleAdvancedSessionSelection
);

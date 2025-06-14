import { db, doc, getDoc } from "../db.js";
import { auth } from "../firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js";
import { exportSessionToPDF } from "./pdfExport.js";
import { createYardageBook, handleSessionSelection } from "./yardageBook.js";

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

// Estado global
let currentData = [];
let currentSort = { column: null, ascending: true };
let currentFilter = null;
let selectedShots = new Set();
let clubVisibility = {};

// Estado global para YardageBook
let yardageBookSessions = new Set();
let deselectedShots = new Map(); // Map<sessionId, Set<shotIndex>>

// Función para calcular promedios de un palo
function calculateClubAverages(club, shots) {
  const selectedRows = shots.filter((row) =>
    selectedShots.has(row.originalIndex)
  );
  if (selectedRows.length === 0) {
    return fixedColumns.map(() => "-");
  }
  return fixedColumns.map((col) => {
    const values = selectedRows
      .map((row) => parseFloat(row[col]))
      .filter((val) => !isNaN(val));
    if (values.length === 0) return "-";
    const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
    if (col === "efficiency") {
      return avg.toFixed(2);
    }
    return avg.toFixed(1);
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

// Función para guardar los tiros deseleccionados
function saveDeselectedShots(sessionId) {
  const deselected = new Set();
  currentData.forEach((_, index) => {
    if (!selectedShots.has(index)) {
      deselected.add(index);
    }
  });
  deselectedShots.set(sessionId, deselected);
  localStorage.setItem(
    "deselectedShots",
    JSON.stringify(Array.from(deselectedShots.entries()))
  );
}

// Función para cargar los tiros deseleccionados
function loadDeselectedShots() {
  const saved = localStorage.getItem("deselectedShots");
  if (saved) {
    deselectedShots = new Map(JSON.parse(saved));
  }
}

// Función para mostrar el modal de YardageBook
window.showYardageBookModal = function () {
  const modal = document.getElementById("yardageBookModal");
  const checkboxesContainer = document.getElementById("sessionCheckboxes");
  checkboxesContainer.innerHTML = "";

  // Obtener todas las sesiones
  const user = auth.currentUser;
  if (user) {
    const userDocRef = doc(db, "Simulador", user.uid);
    getDoc(userDocRef).then((userDoc) => {
      if (userDoc.exists()) {
        const sessions = userDoc.data().Sesiones || [];
        sessions.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

        sessions.forEach((session, index) => {
          const checkboxDiv = document.createElement("div");
          checkboxDiv.className = "session-checkbox";
          checkboxDiv.innerHTML = `
            <input type="checkbox" id="session${index}" value="${index}" 
              ${yardageBookSessions.has(index) ? "checked" : ""}>
            <label for="session${index}">
              Sesión del ${new Date(session.fecha).toLocaleDateString()} 
              (${session.stats.shotCount} tiros)
            </label>
          `;
          checkboxesContainer.appendChild(checkboxDiv);
        });
      }
    });
  }

  modal.style.display = "block";
};

// Función para mostrar la tabla de tiros
function displayShotsTable(data, sessionIndex) {
  const shotsTableContainer = document.getElementById("shotsTableContainer");

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
        return currentSort.ascending
          ? valA < valB
            ? -1
            : 1
          : valA > valB
          ? -1
          : 1;
      });
    }
  });

  const uniqueClubs = sortedClubs;
  const tableHTML = `
    <div class="table-actions">
      <select id="clubFilter" onchange="updateFilter(this.value)">
        <option value="">Filtrar por: Todos</option>
        ${uniqueClubs
          .map(
            (club) =>
              `<option value="${club}" ${
                currentFilter === club ? "selected" : ""
              }>${formatClubName(club)}</option>`
          )
          .join("")}
      </select>
      <button onclick="exportToCSV()">
        <i class="fas fa-file-csv"></i> Exportar a CSV
      </button>
      <button onclick="exportCurrentSessionToPDF()">
        <i class="fas fa-file-pdf"></i> Exportar a PDF
      </button>
      <button onclick="window.showYardageBookModal()">
        <i class="fas fa-book"></i> Crear YardageBook
      </button>
      <button onclick="createScatterPlot()">
        <i class="fas fa-chart-scatter"></i> Ver Dispersión de Tiros
      </button>
    </div>
    <table class="shots-table">
      <thead>
        <tr>
          <th class="checkbox-column"></th>
          <th>Club / Shot Number</th>
          ${fixedColumns
            .map(
              (col) => `
            <th onclick="sortTable('${col}')" data-column="${col}">
              ${col.charAt(0).toUpperCase() + col.slice(1)}
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
            <tr class="average-row">
              <td class="checkbox-column">
                <button class="toggle-club-btn" data-club="${club}" onclick="toggleClubShots('${club}')">
                  ${clubVisibility[club] ? "−" : "+"}
                </button>
              </td>
              <td>${formatClubName(club)}</td>
              ${calculateClubAverages(club, groupedData[club])
                .map((avg) => `<td>${avg}</td>`)
                .join("")}
            </tr>
            ${groupedData[club]
              .map(
                (row) => `
                <tr class="shot-row${clubVisibility[club] ? "" : " hidden"}">
                  <td class="checkbox-column"><input type="checkbox" data-row="${
                    row.originalIndex
                  }" onchange="updateShotSelection(this)" ${
                  selectedShots.has(row.originalIndex) ? "checked" : ""
                }></td>
                  <td>${
                    row["shot number"] !== undefined ? row["shot number"] : ""
                  }</td>
                  ${fixedColumns
                    .map(
                      (col) =>
                        `<td>${row[col] !== undefined ? row[col] : ""}</td>`
                    )
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
    <canvas id="scatterCanvas" style="max-width: 100%; margin-top: 20px;"></canvas>
  `;

  shotsTableContainer.innerHTML = tableHTML;
  shotsTableContainer.classList.add("active");
}

// Funciones de acciones
window.toggleClubShots = function (club) {
  clubVisibility[club] = !clubVisibility[club];
  displayShotsTable(currentData, 0);
};

window.toggleAllChecks = function (checked) {
  selectedShots = checked ? new Set(currentData.map((_, i) => i)) : new Set();
  displayShotsTable(currentData, 0);
};

window.updateShotSelection = function (checkbox) {
  const index = parseInt(checkbox.dataset.row);
  if (checkbox.checked) {
    selectedShots.add(index);
  } else {
    selectedShots.delete(index);
  }
  // Guardar los tiros deseleccionados cuando se cambia la selección
  const activeSession = document.querySelector(".session-item.active");
  if (activeSession) {
    const sessionDate = activeSession
      .querySelector("p")
      .textContent.split(": ")[1];
    saveDeselectedShots(sessionDate);
  }
  displayShotsTable(currentData, 0);
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

window.sortTable = function (column) {
  if (currentSort.column === column) {
    currentSort.ascending = !currentSort.ascending;
  } else {
    currentSort = { column, ascending: true };
  }
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

// Agregar event listeners para el modal de YardageBook
document.addEventListener("DOMContentLoaded", () => {
  const modal = document.getElementById("yardageBookModal");
  const closeBtn = modal.querySelector(".close-modal");
  const createBtn = modal.querySelector(".create-yardagebook");

  closeBtn.onclick = () => {
    modal.style.display = "none";
  };

  window.onclick = (event) => {
    if (event.target === modal) {
      modal.style.display = "none";
    }
  };

  createBtn.onclick = () => {
    window.createYardageBook(yardageBookSessions, deselectedShots);
    modal.style.display = "none";
  };

  // Cargar tiros deseleccionados al iniciar
  loadDeselectedShots();
});

// Hacer las funciones disponibles globalmente
window.exportSessionToPDF = exportSessionToPDF;
window.createYardageBook = createYardageBook;
window.showYardageBookModal = showYardageBookModal;

// Función para cargar y mostrar sesiones
async function loadSessions() {
  const sessionsList = document.getElementById("sessionsList");
  const shotsTableContainer = document.getElementById("shotsTableContainer");
  sessionsList.innerHTML = "<p>Cargando sesiones...</p>";

  try {
    // Esperar a que auth.currentUser esté disponible
    let user = auth.currentUser;
    if (!user) {
      // Si no hay usuario actual, esperar a que se resuelva la autenticación
      await new Promise((resolve) => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
          unsubscribe();
          resolve(user);
        });
      });
      user = auth.currentUser;
    }

    console.log("=== INFORMACIÓN DEL USUARIO ===");
    console.log("Usuario actual:", user);
    console.log("UID del usuario:", user?.uid);
    console.log("Email del usuario:", user?.email);

    if (!user) {
      sessionsList.innerHTML = "<p>No hay usuario autenticado.</p>";
      return;
    }

    // Usar el UID del usuario para buscar en la colección Simulador
    console.log("=== BÚSQUEDA EN FIRESTORE ===");
    console.log(
      "Buscando documento en colección 'Simulador' con ID:",
      user.uid
    );
    const userDocRef = doc(db, "Simulador", user.uid);
    const userDoc = await getDoc(userDocRef);
    console.log("Documento encontrado:", userDoc.exists());

    if (!userDoc.exists()) {
      console.log("No se encontró el documento para el UID:", user.uid);
      sessionsList.innerHTML = "<p>No se encontraron sesiones.</p>";
      return;
    }

    const userData = userDoc.data();
    console.log("=== DATOS DEL DOCUMENTO ===");
    console.log("Datos del usuario:", userData);
    console.log("Sesiones encontradas:", userData.Sesiones?.length || 0);

    const sessions = userData.Sesiones || [];
    if (sessions.length === 0) {
      console.log("El documento existe pero no tiene sesiones");
      sessionsList.innerHTML = "<p>No hay sesiones registradas.</p>";
      return;
    }

    // Actualizar el título con el nombre del usuario
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
        currentData = session.datos;
        currentSort = { column: null, ascending: true };
        currentFilter = null;

        // Cargar tiros deseleccionados para esta sesión
        const deselected = deselectedShots.get(session.fecha) || new Set();
        selectedShots = new Set(
          currentData
            .map((_, i) => (!deselected.has(i) ? i : null))
            .filter((i) => i !== null)
        );

        clubVisibility = {};
        currentData.forEach((row) => {
          clubVisibility[row["club name"]] = false;
        });
        displayShotsTable(currentData, index);
      });
      sessionsList.appendChild(sessionItem);
    });
  } catch (error) {
    console.error("Error al cargar sesiones:", error);
    sessionsList.innerHTML = "<p>Error al cargar sesiones.</p>";
  }
}

loadSessions();

export { currentData, selectedShots, clubColors, formatClubName };

// Agregar función global para exportar la sesión actual
window.exportCurrentSessionToPDF = async function () {
  if (!currentData || currentData.length === 0) {
    alert("No hay datos de sesión para exportar");
    return;
  }
  await exportSessionToPDF(currentData, auth.currentUser);
};

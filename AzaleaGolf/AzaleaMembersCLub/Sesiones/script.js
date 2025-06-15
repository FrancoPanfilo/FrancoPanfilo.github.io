import { auth, db } from "../firebase.js";
import {
  doc,
  getDoc,
  updateDoc,
} from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js";
import { exportSessionToPDF } from "./pdfExport.js";
import { createYardageBook } from "./yardageBook.js";

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
let yardageBookSessions = new Set(); // Almacena los índices de las sesiones seleccionadas
let deselectedShots = new Map(); // Map<sessionIndex, Set<shotIndex>>

// Función para calcular promedios de un palo
function calculateClubAverages(club, shots) {
  // Filtrar solo los tiros seleccionados del palo específico
  const selectedRows = shots.filter((row) =>
    selectedShots.has(row.originalIndex)
  );

  if (selectedRows.length === 0) {
    return fixedColumns.map(() => "-");
  }

  // Calcular promedios para cada columna
  return fixedColumns.map((col) => {
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

          // Obtener la cantidad de tiros de la sesión
          const shotCount =
            session.stats?.shotCount ||
            (Array.isArray(session.data) ? session.data.length : 0);

          checkboxDiv.innerHTML = `
            <input type="checkbox" id="session${index}" 
                   onchange="toggleSessionSelection(${index})"
                   ${yardageBookSessions.has(index) ? "checked" : ""}>
            <label for="session${index}">
              Sesión del ${new Date(session.fecha).toLocaleDateString()} 
              (${shotCount} tiros)
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
      <select id="clubFilter" onchange="updateFilter(this.value)">
        <option value="">Filtrar por: Todos</option>
        ${sortedClubs
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
      
    </div>
    <table class="shots-table">
      <thead>
        <tr>
          <th class="checkbox-column">
            
          </th>
          <th>Club</th>
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
            ${averageRowHTML(
              club,
              calculateClubAverages(club, groupedData[club])
            )}
            ${groupedData[club]
              .map(
                (row) => `
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

  createBtn.onclick = async () => {
    try {
      if (yardageBookSessions.size === 0) {
        alert("Por favor, selecciona al menos una sesión para el YardageBook.");
        return;
      }

      await createYardageBook(yardageBookSessions);
      modal.style.display = "none";
    } catch (error) {
      console.error("Error al crear el YardageBook:", error);
      alert("Error al crear el YardageBook. Por favor, intente nuevamente.");
    }
  };

  // Cargar estados guardados al iniciar
  loadSelectedSessions();
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

loadSessions();

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
    <td>${formatClubName(club)}</td>
    ${averages.map((avg) => `<td>${avg}</td>`).join("")}
  </tr>
`;

// Switch para alternar entre tabla y mapa de dispersión
function toggleViewMode() {
  const isMap = document.getElementById("toggleView").checked;
  const labelTable = document.getElementById("label-table");
  const labelMap = document.getElementById("label-map");
  if (labelTable) labelTable.classList.toggle("active", !isMap);
  if (labelMap) labelMap.classList.toggle("active", isMap);

  const table = document.getElementById("shotsTableContainer");
  const canvas = document.getElementById("scatterCanvas");
  if (table) table.style.display = isMap ? "none" : "";
  if (canvas) canvas.style.display = isMap ? "" : "none";

  // Si se activa el mapa, dibuja el scatter plot si la función existe
  if (isMap) {
    createScatterPlot();
  }
}
window.toggleViewMode = toggleViewMode;

window.addEventListener("DOMContentLoaded", () => {
  const toggle = document.getElementById("toggleView");
  if (toggle) {
    toggle.checked = false;
    toggleViewMode();
  }
});

// Función para mostrar el switch solo cuando hay sesión seleccionada
function showSwitchContainer(show) {
  const switchContainer = document.getElementById("switchContainer");
  if (switchContainer) {
    switchContainer.style.display = show ? "" : "none";
  }
}

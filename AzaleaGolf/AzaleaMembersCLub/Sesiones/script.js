import { db, doc, getDoc } from "../db.js";

// Orden fijo de columnas (sin club name)
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

// Función para cargar y mostrar sesiones
async function loadSessions() {
  const sessionsList = document.getElementById("sessionsList");
  const shotsTableContainer = document.getElementById("shotsTableContainer");
  sessionsList.innerHTML = "<p>Cargando sesiones...</p>";

  try {
    const nombre = "Miguel Reyes";
    const userDocRef = doc(db, "Simulador", nombre);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      sessionsList.innerHTML = "<p>No se encontraron sesiones.</p>";
      return;
    }

    const sessions = userDoc.data().Sesiones || [];
    if (sessions.length === 0) {
      sessionsList.innerHTML = "<p>No hay sesiones registradas.</p>";
      return;
    }

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
        selectedShots = new Set(currentData.map((_, i) => i));
        clubVisibility = {};
        currentData.forEach((row) => {
          clubVisibility[row["club name"]] = true;
        });
        displayShotsTable(currentData, index);
      });
      sessionsList.appendChild(sessionItem);
    });
  } catch (error) {
    sessionsList.innerHTML = "<p>Error al cargar sesiones.</p>";
  }
}

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
      <button onclick="exportToCSV()">Exportar a CSV</button>
    </div>
    <table class="shots-table">
      <thead>
        <tr>
          <th class="checkbox-column"><input type="checkbox" onchange="toggleAllChecks(this.checked)" checked></th>
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
            <tr>
              <th class="club-header" colspan="${
                fixedColumns.length + 1
              }">${formatClubName(club)}</th>
            </tr>
            <tr class="average-row">
              <td class="checkbox-column">
                <button class="toggle-club-btn" data-club="${club}" onclick="toggleClubShots('${club}')">
                  ${clubVisibility[club] ? "−" : "+"}
                </button>
              </td>
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
  displayShotsTable(currentData, 0);
};

window.updateFilter = function (value) {
  currentFilter = value || null;
  selectedShots = new Set(currentData.map((_, i) => i));
  clubVisibility = {};
  currentData.forEach((row) => {
    if (!currentFilter || row["club name"] === currentFilter) {
      clubVisibility[row["club name"]] = true;
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
  const headers = ["Club Name", ...fixedColumns]
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
        formatClubName(club),
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

loadSessions();

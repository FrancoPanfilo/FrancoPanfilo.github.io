// Importaciones
import {
  currentData,
  currentSort,
  currentFilter,
  selectedShots,
  clubVisibility,
} from "./sessions.js";
import { saveDeselectedShots } from "./storage.js";
import { calculateClubAverages } from "./stats.js";
import { formatClubName } from "./utils.js";

// Columnas fijas para mostrar
const fixedColumns = [
  "club speed",
  "ball speed",
  "smash factor",
  "spin rate",
  "carry",
  "total",
  "height",
  "landing angle",
  "side",
  "side angle",
  "club path",
  "face angle",
  "face to path",
  "attack angle",
  "loft",
  "dynamic loft",
  "spin loft",
  "spin axis",
  "launch direction",
  "launch angle",
];

// Función para mostrar la tabla de tiros
export function displayShotsTable(data, sessionIndex) {
  const tableContainer = document.getElementById("shotsTable");
  if (!tableContainer) return;

  // Filtrar datos si hay un filtro activo
  let filteredData = data;
  if (currentFilter) {
    filteredData = data.filter((row) => row["club name"] === currentFilter);
  }

  // Ordenar datos si hay una columna seleccionada
  if (currentSort.column) {
    filteredData.sort((a, b) => {
      const aValue = parseFloat(a[currentSort.column]) || 0;
      const bValue = parseFloat(b[currentSort.column]) || 0;
      return currentSort.ascending ? aValue - bValue : bValue - aValue;
    });
  }

  // Inicializar clubVisibility con todos los palos ocultos
  const clubVisibility = {};
  const uniqueClubs = [...new Set(data.map((shot) => shot.club))];
  uniqueClubs.forEach((club) => {
    clubVisibility[club] = false;
  });

  // Función simplificada para toggle de visibilidad
  window.toggleClubShots = function (club) {
    // Ocultar todos los palos primero
    Object.keys(clubVisibility).forEach((key) => {
      if (key !== club) {
        clubVisibility[key] = false;
        const rows = document.querySelectorAll(
          `tr.shot-row[data-club="${key}"]`
        );
        const averageRow = document.querySelector(
          `tr.average-row[data-club="${key}"]`
        );

        rows.forEach((row) => {
          row.style.display = "none";
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
        row.style.display = clubVisibility[club] ? "table-row" : "none";
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

  // Crear HTML de la tabla
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
      <button onclick="exportToPDF()">
        <i class="fas fa-file-pdf"></i> Exportar a PDF
      </button>
      <button onclick="showYardageBookModal()">
        <i class="fas fa-book"></i> Crear YardageBook
      </button>
      <button onclick="createScatterPlot()">
        <i class="fas fa-chart-scatter"></i> Ver Dispersión de Tiros
      </button>
    </div>
    <table class="shots-table">
      <thead>
        <tr>
          <th><input type="checkbox" id="selectAll" onchange="toggleAllShots(this.checked)"></th>
          <th>Club</th>
          ${fixedColumns
            .map(
              (col) =>
                `<th onclick="sortTable('${col}')" class="sortable">
                  ${formatColumnName(col)}
                  ${
                    currentSort.column === col
                      ? currentSort.ascending
                        ? " ↑"
                        : " ↓"
                      : ""
                  }
                </th>`
            )
            .join("")}
        </tr>
      </thead>
      <tbody>
        ${filteredData
          .map(
            (row, index) => `
          <tr class="${clubVisibility[row["club name"]] ? "expanded" : ""}">
            <td>
              <input type="checkbox" 
                data-row="${index}" 
                onchange="updateShotSelection(this)"
                ${selectedShots.has(index) ? "checked" : ""}>
            </td>
            <td onclick="toggleClubShots('${
              row["club name"]
            }')" class="club-cell">
              ${formatClubName(row["club name"])}
            </td>
            ${fixedColumns
              .map((col) => `<td>${formatValue(row[col], col)}</td>`)
              .join("")}
          </tr>
        `
          )
          .join("")}
      </tbody>
    </table>
  `;

  tableContainer.innerHTML = tableHTML;
}

// Función para actualizar la selección de tiros
export function updateShotSelection(checkbox) {
  const index = parseInt(checkbox.dataset.row);
  if (checkbox.checked) {
    selectedShots.add(index);
  } else {
    selectedShots.delete(index);
  }

  // Guardar los tiros deseleccionados
  const activeSession = document.querySelector(".session-item.active");
  if (activeSession) {
    const sessionDate = activeSession
      .querySelector("p")
      .textContent.split(": ")[1];
    saveDeselectedShots(sessionDate);
  }

  displayShotsTable(currentData, 0);
}

// Función para alternar la visibilidad de todos los tiros
export function toggleAllShots(checked) {
  if (checked) {
    currentData.forEach((_, index) => selectedShots.add(index));
  } else {
    selectedShots.clear();
  }
  displayShotsTable(currentData, 0);
}

// Función para actualizar el filtro
export function updateFilter(club) {
  currentFilter = club || null;
  displayShotsTable(currentData, 0);
}

// Función para ordenar la tabla
export function sortTable(column) {
  if (currentSort.column === column) {
    currentSort.ascending = !currentSort.ascending;
  } else {
    currentSort.column = column;
    currentSort.ascending = true;
  }
  displayShotsTable(currentData, 0);
}

// Función para formatear nombres de columnas
function formatColumnName(column) {
  return column
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// Función para formatear valores
function formatValue(value, column) {
  if (value === undefined || value === null) return "-";

  const numValue = parseFloat(value);
  if (isNaN(numValue)) return value;

  switch (column) {
    case "club speed":
    case "ball speed":
    case "carry":
    case "total":
    case "height":
      return numValue.toFixed(1) + " mph";
    case "smash factor":
      return numValue.toFixed(2);
    case "spin rate":
      return Math.round(numValue) + " rpm";
    case "landing angle":
    case "side angle":
    case "club path":
    case "face angle":
    case "face to path":
    case "attack angle":
    case "loft":
    case "dynamic loft":
    case "spin loft":
    case "spin axis":
    case "launch direction":
    case "launch angle":
      return numValue.toFixed(1) + "°";
    case "side":
      return numValue.toFixed(1) + " yds";
    default:
      return numValue.toFixed(1);
  }
}

// Exportar funciones necesarias
export { fixedColumns, formatColumnName, formatValue };

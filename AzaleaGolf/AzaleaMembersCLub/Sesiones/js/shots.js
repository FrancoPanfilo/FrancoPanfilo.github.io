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
import { formatClubName } from "../../utils/constants.js";

// Columnas fijas para mostrar
let fixedColumns = [
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

// Detectar si es móvil y limitar columnas
if (window.innerWidth <= 600) {
  fixedColumns = ["carry", "launch angle", "spin rate"];
}

// Función para mostrar la tabla de tiros
export function displayShotsTable(data, sessionIndex) {
  const tableContainer = document.getElementById("shotsTableContainer");
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

  // Agrupar datos por palo
  const clubGroups = {};
  filteredData.forEach((row, index) => {
    const clubName = row["club name"];
    if (!clubGroups[clubName]) {
      clubGroups[clubName] = [];
    }
    clubGroups[clubName].push({ ...row, originalIndex: index });
  });

  // Calcular promedios por palo
  const clubAverages = {};
  Object.keys(clubGroups).forEach((clubName) => {
    const shots = clubGroups[clubName];
    clubAverages[clubName] = {};

    fixedColumns.forEach((col) => {
      const values = shots
        .map((shot) => parseFloat(shot[col]))
        .filter((val) => !isNaN(val));
      if (values.length > 0) {
        const average =
          values.reduce((sum, val) => sum + val, 0) / values.length;
        clubAverages[clubName][col] = average;
      } else {
        clubAverages[clubName][col] = null;
      }
    });
  });

  // Inicializar clubVisibility con todos los palos ocultos
  const clubVisibility = {};
  Object.keys(clubGroups).forEach((club) => {
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
        ${Object.keys(clubGroups)
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
          <th class="checkbox-column"><i class="fas fa-eye"></i></th>
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
        ${Object.keys(clubGroups)
          .map((clubName) => {
            const shots = clubGroups[clubName];
            const averages = clubAverages[clubName];

            return `
            <!-- Fila de promedio del palo -->
            <tr class="average-row" data-club="${clubName}">
              <td class="checkbox-column">
                <button class="toggle-club-btn" onclick="toggleClubShots('${clubName}')">
                  <img src="arrow-down.png" alt="Toggle" class="arrow-icon">
                </button>
              </td>
              <td class="club-name-cell">${formatClubName(clubName)}</td>
              ${fixedColumns
                .map((col) => `<td>${formatValue(averages[col], col)}</td>`)
                .join("")}
            </tr>
            <!-- Filas de tiros del palo -->
            ${shots
              .map(
                (row, shotIndex) => `
              <tr class="shot-row" data-club="${clubName}" style="display: none;">
                <td class="checkbox-column">
                  <input type="checkbox" 
                    data-row="${row.originalIndex}" 
                    onchange="updateShotSelection(this)"
                    ${selectedShots.has(row.originalIndex) ? "checked" : ""}>
                </td>
                <td class="shot-number-cell">Tiro ${shotIndex + 1}</td>
                ${fixedColumns
                  .map((col) => `<td>${formatValue(row[col], col)}</td>`)
                  .join("")}
              </tr>
            `
              )
              .join("")}
          `;
          })
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
  // Convierte snake_case o nombres con espacios en dos líneas
  if (column.includes(" ")) {
    const parts = column.split(" ");
    return parts
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
      .join("<br>");
  }
  // Si no tiene espacio, solo capitaliza
  return column.charAt(0).toUpperCase() + column.slice(1);
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

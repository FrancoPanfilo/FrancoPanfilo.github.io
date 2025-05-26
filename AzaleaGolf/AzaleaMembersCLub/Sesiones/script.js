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

// Función para formatear el nombre del palo (corto para leyenda)
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

// Función para obtener el orden de los palos (driver primero)
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
let showAverageLines = false;

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
    return avg.toFixed(1);
  });
}

// Función para obtener distancia máxima
function getMaxDistance(data) {
  const distances = data
    .map((row) => parseFloat(row["total distance (yds)"]))
    .filter((val) => !isNaN(val));
  return distances.length > 0 ? Math.max(...distances) : 300; // Default 300 yds
}

// Función para generar datos del mapa
function generateChartData(data) {
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

  console.log("Raw data for chart:", data); // Debug: Log raw data
  const datasets = filteredClubs
    .map((club, i) => {
      const shots = groupedData[club].filter((row) =>
        selectedShots.has(row.originalIndex)
      );
      const avgDistance =
        shots
          .map((row) => parseFloat(row["total distance (yds)"]))
          .filter((val) => !isNaN(val))
          .reduce((sum, val, _, { length }) => sum + val / length, 0) || 0;

      const shotData = shots.map((row) => {
        const offline = parseFloat(row["offline (yds)"]);
        const distance = parseFloat(row["total distance (yds)"]);
        console.log(
          `Club: ${club}, Shot: ${row.originalIndex}, Offline: ${offline}, Distance: ${distance}`
        ); // Debug: Log each shot
        return {
          x: isNaN(offline) ? 0 : offline,
          y: isNaN(distance) ? 0 : distance,
          club: club,
          index: row.originalIndex,
        };
      });

      return {
        club: club,
        label: formatClubName(club, true),
        shots: shotData,
        color: clubColors[i % clubColors.length],
        avgDistance: showAverageLines ? avgDistance : null,
      };
    })
    .filter((dataset) => dataset.shots.length > 0);

  console.log("Generated datasets:", datasets); // Debug: Log final datasets
  return datasets;
}

// Función para crear o actualizar el mapa con D3.js
function updateShotsMap(data) {
  const shotsMapContainer = d3.select("#shotsMapContainer");
  if (!shotsMapContainer.node()) {
    console.error("Contenedor #shotsMapContainer no encontrado");
    return;
  }

  // Hide map if no data
  if (!data || data.length === 0) {
    shotsMapContainer.classed("hidden", true);
    return;
  }

  const datasets = generateChartData(data);
  if (datasets.length === 0) {
    shotsMapContainer.classed("hidden", false);
    shotsMapContainer.html(
      '<p class="map-message">No hay tiros seleccionados para mostrar.</p>'
    );
    return;
  }

  shotsMapContainer.classed("hidden", false);
  shotsMapContainer.html(`
    <div class="map-actions">
      <button onclick="exportChart()">Exportar PNG</button>
      <button onclick="toggleAverageLines()">${
        showAverageLines ? "Ocultar" : "Mostrar"
      } Líneas Promedio</button>
    </div>
  `);

  // SVG setup
  const svgWidth = 333; // px
  const svgHeight = 1000; // px
  const margin = { top: 30, right: 30, bottom: 30, left: 30 };
  const innerWidth = svgWidth - margin.left - margin.right;
  const innerHeight = svgHeight - margin.top - margin.bottom;

  // Calculate dimensions in yards
  const maxDistance = getMaxDistance(data);
  const mapHeightYards = maxDistance * 1.1; // Max distance + 10%
  const mapWidthYards = mapHeightYards / 3; // Width = Height / 3
  const xRange = mapWidthYards / 2; // Symmetric x-axis (e.g., -55 to 55 for 110 yards)

  // Scales
  const xScale = d3
    .scaleLinear()
    .domain([-xRange, xRange])
    .range([0, innerWidth]); // 333px
  const yScale = d3
    .scaleLinear()
    .domain([0, mapHeightYards])
    .range([innerHeight, 0]); // 1000px

  const svg = shotsMapContainer
    .append("svg")
    .attr("width", svgWidth)
    .attr("height", svgHeight)
    .attr("viewBox", `0 0 ${svgWidth} ${svgHeight}`)
    .attr("preserveAspectRatio", "xMidYMid meet");

  const g = svg
    .append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);

  // Green background
  g.append("rect")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", innerWidth)
    .attr("height", innerHeight)
    .attr("fill", "#4CAF50");

  // Axes
  const xAxis = d3
    .axisBottom(xScale)
    .tickSize(innerHeight)
    .tickValues(d3.range(-Math.floor(xRange), Math.floor(xRange) + 1, 10))
    .tickFormat(d3.format("d"));
  const yAxis = d3
    .axisLeft(yScale)
    .tickSize(-innerWidth)
    .tickValues(d3.range(0, Math.ceil(mapHeightYards / 10) * 10, 10))
    .tickFormat(d3.format("d"));

  g.append("g")
    .attr("transform", `translate(0, ${innerHeight})`)
    .call(xAxis)
    .selectAll("text")
    .style("font-family", "Montserrat, sans-serif")
    .style("font-size", "10px");
  g.append("g")
    .call(yAxis)
    .selectAll("text")
    .style("font-family", "Montserrat, sans-serif")
    .style("font-size", "10px");

  // Center line (x=0)
  g.append("line")
    .attr("x1", xScale(0))
    .attr("y1", 0)
    .attr("x2", xScale(0))
    .attr("y2", innerHeight)
    .attr("stroke", "#333")
    .attr("stroke-width", 2);

  // Axis labels
  g.append("text")
    .attr("x", innerWidth / 2)
    .attr("y", innerHeight + 25)
    .attr("text-anchor", "middle")
    .style("font-family", "Montserrat, sans-serif")
    .style("font-size", "12px")
    .style("fill", "#333")
    .text("Desviación (yds)");
  g.append("text")
    .attr("transform", `rotate(-90) translate(${-innerHeight / 2}, -25)`)
    .attr("text-anchor", "middle")
    .style("font-family", "Montserrat, sans-serif")
    .style("font-size", "12px")
    .style("fill", "#333")
    .text("Distancia (yds)");

  // Points
  datasets.forEach((dataset, i) => {
    g.selectAll(`.point-${i}`)
      .data(dataset.shots)
      .enter()
      .append("circle")
      .attr("class", `point-${i}`)
      .attr("cx", (d) => xScale(d.x))
      .attr("cy", (d) => yScale(d.y))
      .attr("r", 4)
      .attr("fill", dataset.color)
      .attr("stroke", "#000")
      .attr("stroke-width", (d) => (selectedShots.has(d.index) ? 2 : 1))
      .attr("opacity", (d) => (selectedShots.has(d.index) ? 1 : 0.6))
      .on("click", (event, d) => {
        updateFilter(d.club);
        const checkbox = document.querySelector(`input[data-row="${d.index}"]`);
        if (checkbox) {
          checkbox.checked = !checkbox.checked;
          updateShotSelection(checkbox);
        }
      });
  });

  // Average lines
  if (showAverageLines) {
    datasets.forEach((dataset) => {
      if (dataset.avgDistance) {
        g.append("line")
          .attr("x1", 0)
          .attr("x2", innerWidth)
          .attr("y1", yScale(dataset.avgDistance))
          .attr("y2", yScale(dataset.avgDistance))
          .attr("stroke", dataset.color)
          .attr("stroke-width", 1)
          .attr("stroke-dasharray", "5,5");
      }
    });
  }

  // Legend
  const legend = g.append("g").attr("transform", `translate(0, -20)`);
  datasets.forEach((dataset, i) => {
    const legendItem = legend
      .append("g")
      .attr("transform", `translate(${i * 80}, 0)`);
    legendItem
      .append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", 10)
      .attr("height", 10)
      .attr("fill", dataset.color);
    legendItem
      .append("text")
      .attr("x", 15)
      .attr("y", 8)
      .style("font-family", "Montserrat, sans-serif")
      .style("font-size", "10px")
      .style("fill", "#333")
      .text(dataset.label)
      .on("click", () => {
        const points = g.selectAll(`.point-${i}`);
        points.style(
          "display",
          points.style("display") === "none" ? "block" : "none"
        );
      });
  });
}

// Función para cargar y mostrar sesiones
async function loadSessions() {
  const sessionsList = document.getElementById("sessionsList");
  const shotsTableContainer = document.getElementById("shotsTableContainer");
  const shotsMapContainer = document.getElementById("shotsMapContainer");
  sessionsList.innerHTML = "<p>Cargando sesiones...</p>";
  shotsMapContainer.classList.add("hidden");

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
        showAverageLines = false;
        displayShotsTable(session.datos, index);
      });
      sessionsList.appendChild(sessionItem);
    });
  } catch (error) {
    console.error("Error al cargar sesiones:", error);
    sessionsList.innerHTML = "<p>Error al cargar sesiones.</p>";
  }
}

// Función para mostrar la tabla de tiros
function displayShotsTable(data, sessionIndex) {
  const shotsTableContainer = document.getElementById("shotsTableContainer");
  const shotsMapContainer = document.getElementById("shotsMapContainer");

  if (!data || data.length === 0) {
    shotsTableContainer.innerHTML = "<p>No hay datos para esta sesión.</p>";
    shotsTableContainer.classList.remove("active");
    shotsMapContainer.classList.add("hidden");
    updateShotsMap([]); // Limpiar mapa
    return;
  }

  // Agrupar datos por palo
  const groupedData = {};
  data.forEach((row, index) => {
    const club = row["club name"];
    if (!groupedData[club]) groupedData[club] = [];
    groupedData[club].push({ ...row, originalIndex: index });
  });

  // Ordenar palos por longitud
  const sortedClubs = Object.keys(groupedData).sort(
    (a, b) => getClubOrder(a) - getClubOrder(b)
  );

  // Aplicar filtro
  const filteredClubs = currentFilter
    ? sortedClubs.filter((club) => club === currentFilter)
    : sortedClubs;

  // Aplicar ordenación por columna
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

  // Generar acciones
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
              <td class="checkbox-column">-</td>
              ${calculateClubAverages(club, groupedData[club])
                .map((avg) => `<td>${avg}</td>`)
                .join("")}
            </tr>
            ${groupedData[club]
              .map(
                (row) => `
                <tr>
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
  updateShotsMap(data);
}

// Funciones de acciones
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

window.toggleAverageLines = function () {
  showAverageLines = !showAverageLines;
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
  link.setAttribute(
    "download",
    `sesion_tiros_${new Date().toISOString().slice(0, 10)}.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

window.exportChart = function () {
  const svg = document.querySelector("#shotsMapContainer svg");
  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(svg);
  const canvas = document.createElement("canvas");
  canvas.width = 333;
  canvas.height = 1000;
  const ctx = canvas.getContext("2d");
  const img = new Image();
  img.onload = function () {
    ctx.drawImage(img, 0, 0);
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = `mapa_tiros_${new Date().toISOString().slice(0, 10)}.png`;
    link.click();
  };
  img.src = "data:image/svg+xml;base64," + btoa(svgString);
};

// Inicializar al cargar la página
document.addEventListener("DOMContentLoaded", () => {
  loadSessions();
});

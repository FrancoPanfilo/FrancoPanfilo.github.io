import { currentData, formatClubName } from "./script.js";
import { clubColors } from "../utils/constants.js";

// State for toggle modes
let isCarryMode = true;
let showEllipses = false;

// Función local para verificar si un tiro está seleccionado
function isShotSelected(shot) {
  return shot.TiroDesactivado !== true;
}

// Function to calculate offline carry
function calculateOfflineCarry(row) {
  const pushPullDeg = parseFloat(row["push/pull (deg l-/r+)"]) || 0;
  const carryYds = parseFloat(row["carry (yds)"]) || 0;
  const sideSpinRpm = parseFloat(row["side spin (rpm l-/r+)"]) || 0;
  const offlineTotal = parseFloat(row["offline (yds l-/r+)"]) || 0;

  // Validar datos
  if (
    Math.abs(pushPullDeg) > 45 ||
    Math.abs(sideSpinRpm) > 5000 ||
    carryYds < 0 ||
    Math.abs(offlineTotal) > 100
  ) {
    return 0;
  }

  // Desviación inicial por push/pull
  const initialOffline = Math.tan((pushPullDeg * Math.PI) / 180) * carryYds;

  // Curvatura por side spin (1.5 yds por 1000 RPM por 50 yds de carry)
  const curvature = (sideSpinRpm / 1000) * 1.5 * (carryYds / 50);

  // Término de corrección basado en offline total
  const offlineCorrection = 0.2 * offlineTotal;

  return (initialOffline + curvature + offlineCorrection).toFixed(2);
}

// Function to calculate ellipse parameters for a dataset
function calculateEllipseParams(data) {
  if (data.length < 2) return null; // Necesitamos al menos 2 puntos para una elipse

  // Calcular promedios (centro de la elipse)
  const meanX = data.reduce((sum, d) => sum + d.x, 0) / data.length;
  const meanY = data.reduce((sum, d) => sum + d.y, 0) / data.length;

  // Calcular matriz de covarianza
  const varianceX =
    data.reduce((sum, d) => sum + Math.pow(d.x - meanX, 2), 0) / data.length;
  const varianceY =
    data.reduce((sum, d) => sum + Math.pow(d.y - meanY, 2), 0) / data.length;
  const covarianceXY =
    data.reduce((sum, d) => sum + (d.x - meanX) * (d.y - meanY), 0) /
    data.length;

  // Calcular valores propios para los radios
  const a = varianceX + varianceY;
  const b = Math.sqrt(
    Math.pow(varianceX - varianceY, 2) + 4 * Math.pow(covarianceXY, 2)
  );
  const lambda1 = (a + b) / 2; // Valor propio mayor
  const lambda2 = (a - b) / 2; // Valor propio menor

  // Radios: 2 * raíces de los valores propios (~95% de los puntos)
  const radiusX = Math.max(Math.sqrt(lambda1) * 2, 5); // Mínimo de 5 yardas
  const radiusY = Math.max(Math.sqrt(lambda2) * 2, 5);

  // Calcular ángulo de rotación (corregido para invertir la inclinación)
  const rotation =
    -0.5 *
    Math.atan2(2 * covarianceXY, varianceX - varianceY) *
    (180 / Math.PI); // Negado para corregir la inclinación

  return { x: meanX, y: meanY, radiusX, radiusY, rotation };
}

// Function to create the scatter plot
function createScatterPlot() {
  const canvas = document.getElementById("scatterCanvas");
  if (!canvas) {
    return;
  }

  // --- ADAPTACIÓN RESPONSIVE DEL CANVAS ---
  let canvasWidth, canvasHeight, yardsPerPixel;
  const screenW = window.innerWidth;
  const screenH = window.innerHeight;
  const isMobile = screenW <= 600;
  if (isMobile) {
    canvasWidth = Math.max(screenW, 320);
    canvasHeight = Math.max(Math.round(screenH * 1.0), 500);
    yardsPerPixel = 350 / canvasWidth;
  } else if (screenW <= 1024) {
    canvasWidth = Math.min(screenW * 0.9, 900);
    yardsPerPixel = 350 / canvasWidth;
    canvasHeight = Math.round(160 / yardsPerPixel);
  } else {
    canvasWidth = 1200;
    yardsPerPixel = 350 / canvasWidth;
    canvasHeight = Math.round(160 / yardsPerPixel);
  }
  canvas.style.width = canvasWidth + "px";
  canvas.style.height = canvasHeight + "px";
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;
  // --- FIN ADAPTACIÓN RESPONSIVE ---

  // Get selected shots and group by club
  const groupedData = {};
  currentData.forEach((row, index) => {
    if (isShotSelected(row)) {
      const club = row["club name"];
      if (!groupedData[club] && club != "Putter") {
        groupedData[club] = [];
      }
      if (club !== "Putter") {
        groupedData[club].push(row);
      }
    }
  });

  // Check if there are any selected shots
  if (Object.keys(groupedData).length === 0) {
    canvas.style.display = "none";
    return;
  } else {
    canvas.style.display = "block";
  }

  // --- PREPARAR DATASETS CON INVERSIÓN DE EJES EN MÓVIL ---
  const datasets = Object.keys(groupedData).map((club, index) => ({
    label: formatClubName(club),
    data: groupedData[club].map((row) => {
      const distance =
        parseFloat(
          isCarryMode ? row["carry (yds)"] : row["total distance (yds)"]
        ) || 0;
      let dispersionRaw =
        parseFloat(
          isCarryMode ? calculateOfflineCarry(row) : row["offline (yds l-/r+)"]
        ) || 0;
      let dispersion = isMobile ? dispersionRaw : -1 * dispersionRaw;
      if (isMobile) {
        // En móvil: distancia en Y, dispersión en X (sin invertir)
        return {
          x: dispersion,
          y: distance,
          shotNumber: row["shot number"] || "N/A",
        };
      } else {
        // Desktop/tablet: distancia en X, dispersión en Y (invertido)
        return {
          x: distance,
          y: dispersion,
          shotNumber: row["shot number"] || "N/A",
        };
      }
    }),
    backgroundColor: clubColors[index % clubColors.length],
    borderColor: clubColors[index % clubColors.length],
    pointRadius: 3, // Reducido el tamaño de los puntos
    pointHoverRadius: 5, // Reducido el tamaño al hacer hover
  }));

  // --- AJUSTAR ELIPSES TAMBIÉN ---
  const annotations = showEllipses
    ? Object.keys(groupedData)
        .map((club, index) => {
          // Usar los datos ya invertidos
          const ellipseParams = calculateEllipseParams(datasets[index].data);
          if (!ellipseParams) return null;
          return {
            type: "ellipse",
            xMin: ellipseParams.x - ellipseParams.radiusX,
            xMax: ellipseParams.x + ellipseParams.radiusX,
            yMin: ellipseParams.y - ellipseParams.radiusY,
            yMax: ellipseParams.y + ellipseParams.radiusY,
            rotation: ellipseParams.rotation,
            backgroundColor: "rgba(0, 0, 0, 0)",
            borderColor: clubColors[index % clubColors.length],
            borderWidth: 2,
            label: {
              content: formatClubName(club),
              enabled: true,
              position: "center",
              color: clubColors[index % clubColors.length],
              font: { size: 10 },
            },
          };
        })
        .filter((ann) => ann !== null)
    : [];

  // --- CONFIGURAR LOS EJES SEGÚN EL DISPOSITIVO ---
  let xTitle, yTitle, xMin, xMax, yMin, yMax;
  if (isMobile) {
    xTitle = "Dispersión Lateral (yds i+/d-)";
    yTitle = isCarryMode ? "Carry (yds)" : "Distancia Total (yds)";
    xMin = -80;
    xMax = 80;
    yMin = 0;
    yMax = 350;
  } else {
    xTitle = isCarryMode ? "Carry (yds)" : "Distancia Total (yds)";
    yTitle = "Desviación Lateral (yds i+/d-)";
    xMin = 0;
    xMax = 350;
    yMin = -80;
    yMax = 80;
  }

  // Create or update the chart
  if (window.scatterChart) {
    window.scatterChart.destroy();
  }

  window.scatterChart = new Chart(canvas, {
    type: "scatter",
    data: { datasets },
    options: {
      responsive: false,
      plugins: {
        legend: {
          position: "top",
          labels: {
            font: { size: 12 },
            color: "#FFFFFF",
          },
        },
        title: {
          display: true,
          text: `Dispersión de Tiros (${
            isCarryMode ? "Carry" : "Total Distance"
          })`,
          font: { size: 16 },
          color: "#FFFFFF",
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              const dataPoint = context.raw;
              let offlineDirection;
              if (isMobile) {
                offlineDirection = dataPoint.x >= 0 ? "Izquierda" : "Derecha";
              } else {
                offlineDirection = dataPoint.y >= 0 ? "Izquierda" : "Derecha";
              }
              return [
                `Club: ${context.dataset.label}`,
                `Tiro: ${dataPoint.shotNumber}`,
                `${isCarryMode ? "Carry" : "Distancia Total"}: ${
                  isMobile ? dataPoint.y.toFixed(1) : dataPoint.x.toFixed(1)
                } yds`,
                `Desviación Lateral: ${
                  isMobile
                    ? Math.abs(dataPoint.x).toFixed(1)
                    : Math.abs(dataPoint.y).toFixed(1)
                } yds (${offlineDirection})`,
              ];
            },
          },
        },
        annotation: {
          annotations: annotations,
        },
      },
      scales: {
        x: {
          title: {
            display: true,
            text: xTitle,
          },
          grid: { display: true },
          ticks: { color: "#FFFFFF" },
          min: xMin,
          max: xMax,
        },
        y: {
          title: {
            display: true,
            text: yTitle,
          },
          grid: { display: true },
          ticks: { color: "#FFFFFF" },
          min: yMin,
          max: yMax,
        },
      },
    },
  });

  // Crear o actualizar contenedor de controles del mapa
  let controlsContainer = document.getElementById("scatterControls");
  if (!controlsContainer) {
    controlsContainer = document.createElement("div");
    controlsContainer.id = "scatterControls";
    controlsContainer.className = "scatter-controls";
    canvas.parentNode.insertBefore(controlsContainer, canvas);
  }

  // Add or update toggle button for carry/total distance
  let toggleButton = document.getElementById("scatterToggle");
  if (!toggleButton) {
    toggleButton = document.createElement("button");
    toggleButton.id = "scatterToggle";
    toggleButton.className = "scatter-control-btn";
    controlsContainer.appendChild(toggleButton);
  }
  toggleButton.innerHTML = `<i class="fas fa-exchange-alt"></i> Cambiar a ${
    isCarryMode ? "Total Distance" : "Carry"
  }`;
  toggleButton.onclick = () => {
    isCarryMode = !isCarryMode;
    const canvas = document.getElementById("scatterCanvas");
    if (canvas && canvas.style.display !== "none") {
      createScatterPlot();
    }
  };

  // Add or update toggle button for ellipses
  let ellipseToggle = document.getElementById("ellipseToggle");
  if (!ellipseToggle) {
    ellipseToggle = document.createElement("button");
    ellipseToggle.id = "ellipseToggle";
    ellipseToggle.className = "scatter-control-btn";
    controlsContainer.appendChild(ellipseToggle);
  }
  ellipseToggle.innerHTML = `<i class="fas fa-circle"></i> ${
    showEllipses ? "Ocultar Elipses" : "Mostrar Elipses"
  }`;
  ellipseToggle.onclick = () => {
    showEllipses = !showEllipses;
    const canvas = document.getElementById("scatterCanvas");
    if (canvas && canvas.style.display !== "none") {
      createScatterPlot();
    }
  };

  // Mostrar/ocultar controles según el estado del mapa
  const isMapVisible = canvas.style.display !== "none";
  controlsContainer.style.display = isMapVisible ? "flex" : "none";

  // Si el mapa no está visible, ocultar los controles
  if (!isMapVisible) {
    controlsContainer.style.display = "none";
  }
}

// Expose function to global scope
window.createScatterPlot = createScatterPlot;

// Call createScatterPlot when shots are updated (only if visible)
window.updateShotSelectionAndPlot = async function (checkbox) {
  if (typeof window.updateShotSelection === "function") {
    await window.updateShotSelection(checkbox);
  }
  if (typeof window.createScatterPlot === "function") {
    const canvas = document.getElementById("scatterCanvas");
    if (canvas && canvas.style.display !== "none") {
      window.createScatterPlot();
    }
  }
};

// Asegurar que la función esté disponible inmediatamente

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
  const canvas = document.getElementById("scatterCanvas");
  if (canvas && canvas.style.display !== "none") {
    createScatterPlot();
  }
};

// Actualizar la tabla HTML para usar la nueva función
function updateTableHTML() {
  const tableContainer = document.getElementById("shotsTable");
  if (!tableContainer) return;

  // ... código existente ...

  // En la parte donde se generan las filas, actualizar el onchange:
  const rows = filteredData
    .map(
      (row, index) => `
    <tr>
      <td>
        <input type="checkbox" 
               data-row="${index}" 
               data-session="${currentSessionIndex}"
               onchange="updateShotSelectionAndPlot(this)"
               ${selectedShots.has(index) ? "checked" : ""}>
      </td>
      <td>${formatClubName(row["club name"])}</td>
      ${fixedColumns
        .map(
          (col) => `
        <td>${formatValue(row[col])}</td>
      `
        )
        .join("")}
    </tr>
  `
    )
    .join("");

  // ... resto del código existente ...
}

// --- REDIBUJAR HEATMAP AL REDIMENSIONAR PANTALLA ---
let resizeTimeout;
window.addEventListener("resize", function () {
  // Debounce para evitar redibujos excesivos
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    if (typeof window.createScatterPlot === "function") {
      const canvas = document.getElementById("scatterCanvas");
      if (canvas && canvas.style.display !== "none") {
        window.createScatterPlot();
      }
    }
  }, 200);
});

// Redimensionar el canvas y redibujar el gráfico al cambiar el tamaño de la ventana
window.addEventListener("resize", () => {
  const canvas = document.getElementById("scatterCanvas");
  if (canvas && canvas.style.display !== "none") {
    createScatterPlot();
  }
});

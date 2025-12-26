import { currentData, formatClubName } from "./script.js";
import { clubColors } from "../shared/utils/constants.js";
import { calculateOfflineCarry, calculateEllipseParams } from "../shared/utils/golf-calculations.js";

// State for toggle modes
let isCarryMode = true;
let showEllipses = false;

// Función local para verificar si un tiro está seleccionado
function isShotSelected(shot) {
  return shot.TiroDesactivado !== true;
}

// Function to create the scatter plot
function createScatterPlot() {
  const canvas = document.getElementById("scatterCanvas");
  if (!canvas) {
    return;
  }

  // --- ADAPTACIÓN RESPONSIVE DEL CANVAS ---
  let canvasWidth, canvasHeight, xMin, xMax, yMin, yMax;
  const screenW = window.innerWidth;
  const screenH = window.innerHeight;
  const isMobile = screenW <= 768; // Cambio a 768px para tablets

  if (isMobile) {
    // En móvil: optimizar para legibilidad
    xMin = -100;
    xMax = 100;
    yMin = 0;
    yMax = 350;
    const aspectRatio = (yMax - yMin) / (xMax - xMin);
    // Ancho más generoso para móviles
    canvasWidth = Math.min(screenW * 0.92, 400); // máx 400px
    canvasHeight = Math.round(canvasWidth * aspectRatio);
  } else {
    // Desktop/tablet: distancia y dispersión lateral
    xMin = 0;
    xMax = 350;
    yMin = -120;
    yMax = 120;
    const aspectRatio = (yMax - yMin) / (xMax - xMin); // ~0.686

    // Calcular espacio disponible en viewport
    // Header: 70px, controles: ~60px, padding: ~100px, margen seguridad: 50px
    const availableHeight = screenH - 280;
    const availableWidth = screenW * 0.85;

    // Calcular dimensiones basadas en altura disponible primero
    const heightBasedWidth = availableHeight / aspectRatio;

    // Usar el menor entre el ancho disponible y el calculado por altura
    canvasWidth = Math.min(availableWidth, heightBasedWidth, 900); // máx 900px
    canvasHeight = Math.round(canvasWidth * aspectRatio);

    // Asegurar altura máxima
    if (canvasHeight > availableHeight) {
      canvasHeight = availableHeight;
      canvasWidth = Math.round(canvasHeight / aspectRatio);
    }
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
  let xTitle, yTitle;
  if (isMobile) {
    xTitle = "Dispersión Lateral (yds i+/d-)";
    yTitle = isCarryMode ? "Carry (yds)" : "Distancia Total (yds)";
  } else {
    xTitle = isCarryMode ? "Carry (yds)" : "Distancia Total (yds)";
    yTitle = "Desviación Lateral (yds i+/d-)";
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
          position: isMobile ? "bottom" : "top", // Legend abajo en móviles
          labels: {
            font: { size: isMobile ? 11 : 12 },
            color: "#FFFFFF",
            padding: isMobile ? 8 : 12,
            boxWidth: isMobile ? 10 : 12,
          },
        },
        title: {
          display: true,
          text: `Dispersión de Tiros (${
            isCarryMode ? "Carry" : "Total Distance"
          })`,
          font: { size: isMobile ? 14 : 16 },
          color: "#FFFFFF",
          padding: isMobile ? 8 : 12,
        },
        tooltip: {
          backgroundColor: "rgba(0, 0, 0, 0.8)",
          padding: isMobile ? 8 : 10,
          titleFont: { size: isMobile ? 11 : 12 },
          bodyFont: { size: isMobile ? 10 : 11 },
          displayColors: true,
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
            font: { size: isMobile ? 11 : 12, weight: "bold" },
          },
          grid: { 
            display: true,
            color: isMobile ? "rgba(255, 255, 255, 0.05)" : "rgba(255, 255, 255, 0.1)",
          },
          ticks: { color: "#FFFFFF", font: { size: isMobile ? 10 : 11 } },
          min: xMin,
          max: xMax,
        },
        y: {
          title: {
            display: true,
            text: yTitle,
            font: { size: isMobile ? 11 : 12, weight: "bold" },
          },
          grid: { 
            display: true,
            color: isMobile ? "rgba(255, 255, 255, 0.05)" : "rgba(255, 255, 255, 0.1)",
          },
          ticks: { color: "#FFFFFF", font: { size: isMobile ? 10 : 11 } },
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

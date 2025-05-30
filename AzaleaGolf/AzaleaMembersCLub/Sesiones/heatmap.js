import {
  currentData,
  selectedShots,
  clubColors,
  formatClubName,
} from "./script.js";

// State for toggle modes
let isCarryMode = true;
let showEllipses = false;

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
    console.warn(`Datos inválidos para el tiro: ${JSON.stringify(row)}`);
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
    console.error('Canvas element with ID "scatterCanvas" not found.');
    return;
  }

  // Get selected shots and group by club
  const groupedData = {};
  currentData.forEach((row, index) => {
    if (selectedShots.has(index)) {
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

  // Set canvas dimensions to ensure consistent scale
  const canvasWidth = 1200;
  const yardsPerPixel = 350 / canvasWidth;
  const canvasHeight = Math.round(160 / yardsPerPixel);
  canvas.style.width = `${canvasWidth}px`;
  canvas.style.height = `${canvasHeight}px`;
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;

  // Prepare datasets for Chart.js
  const datasets = Object.keys(groupedData).map((club, index) => ({
    label: formatClubName(club),
    data: groupedData[club].map((row) => ({
      x:
        parseFloat(
          isCarryMode ? row["carry (yds)"] : row["total distance (yds)"]
        ) || 0,
      y:
        -1 *
          parseFloat(
            isCarryMode
              ? calculateOfflineCarry(row)
              : row["offline (yds l-/r+)"]
          ) || 0,
      shotNumber: row["shot number"] || "N/A",
    })),
    backgroundColor: clubColors[index % clubColors.length],
    borderColor: clubColors[index % clubColors.length],
    pointRadius: 5,
    pointHoverRadius: 8,
  }));

  // Prepare ellipse annotations
  const annotations = showEllipses
    ? Object.keys(groupedData)
        .map((club, index) => {
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
              const offlineDirection =
                dataPoint.y >= 0 ? "Izquierda" : "Derecha";
              return [
                `Club: ${context.dataset.label}`,
                `Tiro: ${dataPoint.shotNumber}`,
                `${
                  isCarryMode ? "Carry" : "Distancia Total"
                }: ${dataPoint.x.toFixed(1)} yds`,
                `Desviación Lateral: ${Math.abs(dataPoint.y).toFixed(
                  1
                )} yds (${offlineDirection})`,
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
            text: isCarryMode ? "Carry (yds)" : "Distancia Total (yds)",
          },
          grid: { display: true },
          ticks: { color: "#FFFFFF" },
          min: 0,
          max: 350,
        },
        y: {
          title: {
            display: true,
            text: "Desviación Lateral (yds i+/d-)",
          },
          grid: { display: true },
          ticks: { color: "#FFFFFF" },
          min: -80,
          max: 80,
        },
      },
    },
  });

  // Add or update toggle button for carry/total distance
  let toggleButton = document.getElementById("scatterToggle");
  if (!toggleButton) {
    toggleButton = document.createElement("button");
    toggleButton.id = "scatterToggle";
    toggleButton.style.margin = "10px 0";
    toggleButton.style.padding = "8px 16px";
    toggleButton.style.cursor = "pointer";
    canvas.parentNode.insertBefore(toggleButton, canvas);
  }
  toggleButton.textContent = `Cambiar a ${
    isCarryMode ? "Total Distance" : "Carry"
  }`;
  toggleButton.onclick = () => {
    isCarryMode = !isCarryMode;
    createScatterPlot();
  };

  // Add or update toggle button for ellipses
  let ellipseToggle = document.getElementById("ellipseToggle");
  if (!ellipseToggle) {
    ellipseToggle = document.createElement("button");
    ellipseToggle.id = "ellipseToggle";
    ellipseToggle.style.margin = "10px 10px";
    ellipseToggle.style.padding = "8px 16px";
    ellipseToggle.style.cursor = "pointer";
    canvas.parentNode.insertBefore(ellipseToggle, toggleButton.nextSibling);
  }
  ellipseToggle.textContent = showEllipses
    ? "Ocultar Elipses"
    : "Mostrar Elipses";
  ellipseToggle.onclick = () => {
    showEllipses = !showEllipses;
    createScatterPlot();
  };
}

// Expose function to global scope
window.createScatterPlot = createScatterPlot;

// Call createScatterPlot when shots are updated
window.updateShotSelection = function (checkbox) {
  const index = parseInt(checkbox.dataset.row);
  if (checkbox.checked) {
    selectedShots.add(index);
  } else {
    selectedShots.delete(index);
  }
  displayShotsTable(currentData, 0);
  createScatterPlot();
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
  createScatterPlot();
};

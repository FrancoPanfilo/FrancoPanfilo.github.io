import {
  currentData,
  selectedShots,
  clubColors,
  formatClubName,
} from "./script.js";

// State for toggle mode
let isCarryMode = true;

// Function to calculate offline carry
function calculateOfflineCarry(row) {
  const pushPullDeg = parseFloat(row["push/pull (deg l-/r+)"]) || 0;
  const carryYds = parseFloat(row["carry (yds)"]) || 0;
  const sideSpinRpm = parseFloat(row["side spin (rpm l-/r+)"]) || 0;

  // Initial deviation from push/pull
  const initialOffline = Math.tan((pushPullDeg * Math.PI) / 180) * carryYds;

  // Curvature from side spin (approx. 1.5 yds per 1000 rpm per 50 yds of carry)
  const curvature = (sideSpinRpm / 1000) * 1.5 * (carryYds / 50);

  return (initialOffline + curvature).toFixed(1);
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

  // Calculate max carry and round up to nearest 50
  const maxCarry = Math.max(
    ...currentData.map((row) => parseFloat(row["carry (yds)"]) || 0)
  );
  const maxX = Math.ceil(maxCarry / 50) * 50 + 5;

  // Set canvas dimensions to maintain 3:1 ratio
  const canvasHeight = 400; // Base height in pixels
  const canvasWidth = canvasHeight * 3; // 3:1 ratio
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
        parseFloat(
          isCarryMode ? calculateOfflineCarry(row) : row["offline (yds l-/r+)"]
        ) || 0,
      shotNumber: row["shot number"] || "N/A",
    })),
    backgroundColor: clubColors[index % clubColors.length],
    borderColor: clubColors[index % clubColors.length],
    pointRadius: 5,
    pointHoverRadius: 8,
  }));

  // Create or update the chart
  if (window.scatterChart) {
    window.scatterChart.destroy(); // Destroy existing chart to prevent overlap
  }

  window.scatterChart = new Chart(canvas, {
    type: "scatter",
    data: { datasets },
    options: {
      responsive: false, // Disable responsive to enforce fixed dimensions
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
              return [
                `Club: ${context.dataset.label}`,
                `Tiro: ${dataPoint.shotNumber}`,
                `${
                  isCarryMode ? "Carry" : "Distancia Total"
                }: ${dataPoint.x.toFixed(1)} yds`,
                `Desviación Lateral: ${dataPoint.y.toFixed(1)} yds`,
              ];
            },
          },
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
          max: maxX, // Rounded up to nearest 50
        },
        y: {
          title: { display: true, text: "Desviación Lateral (yds l-/r+)" },
          grid: { display: true },
          ticks: { color: "#FFFFFF" },
          min: -50, // Fixed range: -50 to +50 yards
          max: 50,
        },
      },
    },
  });

  // Add or update toggle button
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
  createScatterPlot(); // Update scatter plot on shot selection change
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
  createScatterPlot(); // Update scatter plot on filter change
};

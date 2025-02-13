document.getElementById("botonTabla"),
  addEventListener("click", () => handleFile());
function handleFile() {
  const input = document.getElementById("fileInput");
  if (input.files.length === 0) {
    alert("Por favor, selecciona un archivo CSV.");
    return;
  }

  const file = input.files[0];
  const reader = new FileReader();

  reader.onload = function (e) {
    const csvData = e.target.result;
    const shotsByClub = parseGolfShots(csvData);
    calculateStatistics(shotsByClub);
  };

  reader.readAsText(file);
}

function parseGolfShots(csvData) {
  const rows = csvData.split("\n").map((row) => row.split(","));
  const headers = rows[0].map((h) => h.trim().toLowerCase());

  console.log("Columnas detectadas en el CSV:", headers);

  const clubIndex = headers.findIndex((h) => h.includes("club"));
  const carryIndex = headers.findIndex((h) => h.includes("carry"));
  const offlineIndex = headers.findIndex((h) => h.includes("offline"));

  if (clubIndex === -1 || carryIndex === -1 || offlineIndex === -1) {
    console.error("No se encontraron las columnas necesarias en el CSV.");
    return {};
  }

  const shotsByClub = {};

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length < headers.length) continue;

    const clubName = row[clubIndex].trim();
    const carry = parseFloat(row[carryIndex]) || 0;
    const offline = parseFloat(row[offlineIndex]) || 0;

    if (!shotsByClub[clubName]) {
      shotsByClub[clubName] = [];
    }

    shotsByClub[clubName].push({ carry, offline });
  }

  return shotsByClub;
}

function calculateStatistics(shotsByClub) {
  const lateralDeviation =
    parseFloat(document.getElementById("lateralDeviation").value) / 100;
  const minDistVar =
    parseFloat(document.getElementById("minDistanceVariation").value) / 100;
  const maxDistVar =
    parseFloat(document.getElementById("maxDistanceVariation").value) / 100;

  const clubStats = {};

  Object.keys(shotsByClub).forEach((club) => {
    const shots = shotsByClub[club].sort((a, b) => a.carry - b.carry);

    const carryValues = shots.map((s) => s.carry);
    const offlineValues = shots.map((s) => s.offline).sort((a, b) => a - b);

    const avgCarry =
      carryValues.reduce((sum, val) => sum + val, 0) / carryValues.length;

    const lateralLimit = Math.floor(offlineValues.length * lateralDeviation);
    const selectedOffline = shots
      .map((s) => s.offline)
      .sort((a, b) => Math.abs(a) - Math.abs(b)) // Ordenar por magnitud de offline
      .slice(0, lateralLimit); // Tomar el % indicado

    const maxLeft = Math.min(...selectedOffline); // Máximo fallo a la izquierda
    const maxRight = Math.max(...selectedOffline); // Máximo fallo a la derecha

    const lateralDispersion = `${Math.abs(maxLeft)}L - ${Math.abs(maxRight)}R`;

    const minIndex = Math.floor(carryValues.length * minDistVar);
    const maxIndex = Math.floor(carryValues.length * maxDistVar);
    const selectedCarries = carryValues.slice(minIndex, maxIndex);

    const distanceVariations = selectedCarries.map((carry) =>
      Math.abs(carry - avgCarry)
    );
    const variation =
      distanceVariations.reduce((sum, val) => sum + val, 0) /
      distanceVariations.length;

    clubStats[club] = {
      avgCarry,
      lateralDispersion,
      variation,
    };
  });

  console.log(clubStats);
  return clubStats;
}

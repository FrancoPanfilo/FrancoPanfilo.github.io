 import { PDFDocument } from "https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.esm.js";

console.log("HOLA6");

document.getElementById("botonTabla").addEventListener("click", () => handleFile());

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

  async function rellenarYardageBook(datos) {
    // Cargar el PDF existente desde una URL
    const existingPdfBytes = await fetch('YardageBook.pdf').then(res => res.arrayBuffer());

    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const pages = pdfDoc.getPages();
    const firstPage = pages[0];

    // Coordenadas iniciales de la tabla
  let xBase = 40;
  let yBase = 320;
  const stepY = 21;
    // Recorrer los datos y rellenar la tabla
    let index = 0;
    for (const palo in datos) {
      const dato = datos[palo];
      const yPos = yBase - index * stepY;

      firstPage.drawText(palo, { x: xBase, y: yPos, size: 8 });                    // Nombre del palo
      firstPage.drawText(`${dato.avgCarry.toFixed(0)} yds`, { x: xBase + 10, y: yPos, size: 8 });  // Carry promedio
      firstPage.drawText(dato.lateralDispersion, { x: xBase + 10, y: yPos, size: 8 }); // Dispersión lateral
      firstPage.drawText(`${dato.variation.toFixed(0)} yds`, { x: xBase + 162, y: yPos, size: 8 }); // Variación de distancia

      index++;
    }

    // Guardar el PDF modificado
    const pdfBytes = await pdfDoc.save();

    // Crear un enlace de descarga para el nuevo PDF
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'nuevo-YardageBook.pdf';
    link.click();

    console.log('Tabla rellenada y nuevo PDF descargado.');
  }

  // Datos de ejemplo proporcionados
  const datos = {
    LW: { avgCarry: 77.53, lateralDispersion: "3.8L - 3.7R", variation: 3.20 },
    SW: { avgCarry: 92.70, lateralDispersion: "4L - 1.6R", variation: 2.20 },
    GW: { avgCarry: 111.13, lateralDispersion: "5.3L - 1.9R", variation: 2.45 },
    PW: { avgCarry: 124.17, lateralDispersion: "5.9L - 6.1R", variation: 2.38 },
    "9i": { avgCarry: 140.93, lateralDispersion: "11L - 1.9R", variation: 1.29 },
    "8i": { avgCarry: 151.63, lateralDispersion: "6.4L - 1.9R", variation: 0.86 },
    "7i": { avgCarry: 159.02, lateralDispersion: "14.3L - 13.2R", variation: 3.65 },
    "6i": { avgCarry: 173.44, lateralDispersion: "19L - 1.4R", variation: 2.38 },
    "5i": { avgCarry: 176.17, lateralDispersion: "21.1L - 11R", variation: 3.90 },
    "4i": { avgCarry: 180.17, lateralDispersion: "16.8L - 13.7R", variation: 2.57 },
    Dr: { avgCarry: 224.33, lateralDispersion: "25.9L - 7R", variation: 1.72 },
    "2w": { avgCarry: 213.40, lateralDispersion: "19.3L - 10.9R", variation: 5.77 }
  };

  rellenarYardageBook(datos);

  return clubStats;
}

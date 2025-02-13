import { PDFDocument, StandardFonts } from "https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.esm.js";

console.log("HOLA8");

document.getElementById("botonTabla").addEventListener("click", () => handleFile());
let datos;
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

  // Orden específico de los palos
  const orderedClubs = [
    "Dr", "2w", "3w", "4w", "5w", "7w", "9w",
    "2h", "3h", "4h", "5h", "1h", "2h", "3h",
    "4h", "5h", "6h", "7h", "8h", "9h",
    "1i", "2i", "3i", "4i", "5i", "6i",
    "7i", "8i", "9i", "PW", "GW", "SW", "LW",
    "50", "52", "54", "56", "58", "60", "62", "64"
  ];

  // Eliminar putt de clubStats
  delete clubStats.Putt;

  async function rellenarYardageBook(datos) {
    // Cargar el PDF existente desde una URL
    const existingPdfBytes = await fetch('YardageBook.pdf').then(res => res.arrayBuffer());

    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const pages = pdfDoc.getPages();
    const firstPage = pages[0];
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // Coordenadas iniciales de la tabla
    let xBase = 40;
    let yBase = 315;
    const stepY = 20.3;

    // Recorrer los datos y rellenar la tabla
    let index = 0;
    orderedClubs.forEach((club) => {
      if (datos[club]) {
        const dato = datos[club];
        const yPos = yBase - index * stepY;

        // Calcular el ancho del texto para centrarlo
        const textWidth = font.widthOfTextAtSize(club, 8);
        const xClub = xBase - (textWidth / 2);
        const avgCarryText = `${dato.avgCarry.toFixed(0)} yds`;
        const avgCarryWidth = font.widthOfTextAtSize(avgCarryText, 8);
        const xAvgCarry = xBase + 42 - (avgCarryWidth / 2);
        const lateralDispersionWidth = font.widthOfTextAtSize(dato.lateralDispersion, 8);
        const xLateralDispersion = xBase + 85 - (lateralDispersionWidth / 2);
        const variationText = `${dato.variation.toFixed(0)} yds`;
        const variationWidth = font.widthOfTextAtSize(variationText, 8);
        const xVariation = xBase + 162 - (variationWidth / 2);

        firstPage.drawText(club, { x: xClub, y: yPos, size: 8, font });                    // Nombre del palo
        firstPage.drawText(avgCarryText, { x: xAvgCarry, y: yPos, size: 8, font });  // Carry promedio
        firstPage.drawText(dato.lateralDispersion, { x: xLateralDispersion, y: yPos, size: 8, font }); // Dispersión lateral
        firstPage.drawText(variationText, { x: xVariation, y: yPos, size: 8, font }); // Variación de distancia

        index++;
      }
    });

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

  rellenarYardageBook(clubStats);

  return clubStats;
}

import { PDFDocument, StandardFonts } from "https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.esm.js";

console.log("HOLA9");

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

  // Orden específico de los palos con nombres más expresivos
  const orderedClubs = {
    "Driver": "Dr", "Madera 3": "3w", "Madera 5": "5w", "Madera 7": "7w",
    "Madera 9": "9w", "Híbrido 2": "2h", "Híbrido 3": "3h", "Híbrido 4": "4h",
    "Híbrido 5": "5h", "Hierro 1": "1i", "Hierro 2": "2i", "Hierro 3": "3i",
    "Hierro 4": "4i", "Hierro 5": "5i", "Hierro 6": "6i", "Hierro 7": "7i",
    "Hierro 8": "8i", "Hierro 9": "9i", "PW": "PW", "GW": "GW", "SW": "SW",
    "LW": "LW", "50": "50", "52": "52", "54": "54", "56": "56", "58": "58",
    "60": "60", "62": "62", "64": "64"
  };

  // Eliminar putt de clubStats
  delete clubStats.Putt;

  async function rellenarYardageBook(datos) {
    // Obtener valores de nombre y fecha
    const nombre = document.getElementById("nombre").value;
    const fecha = document.getElementById("fecha").value;

    // Cargar el PDF existente desde una URL
    const existingPdfBytes = await fetch('YardageBook.pdf').then(res => res.arrayBuffer());

    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const pages = pdfDoc.getPages();
    const firstPage = pages[0];
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // Coordenadas iniciales de la tabla
    let xBase = 40;
    let yBase = 315;
    const stepY = 20.3;

    // Recorrer los datos y rellenar la tabla
    let index = 0;
    Object.keys(orderedClubs).forEach((clubName) => {
      const clubCode = orderedClubs[clubName];
      if (datos[clubCode]) {
        const dato = datos[clubCode];
        const yPos = yBase - index * stepY;

        // Calcular el ancho del texto para centrarlo
        const textWidth = fontBold.widthOfTextAtSize(clubName, 8);
        const xClub = xBase - (textWidth / 2);
        const avgCarryText = `${dato.avgCarry.toFixed(0)}`;
        const avgCarryWidth = fontRegular.widthOfTextAtSize(avgCarryText, 8);
        const xAvgCarry = xBase + 42 - (avgCarryWidth / 2);
        const lateralDispersionWidth = fontRegular.widthOfTextAtSize(dato.lateralDispersion, 8);
        const xLateralDispersion = xBase + 85 - (lateralDispersionWidth / 2);
        const variationText = `${dato.variation.toFixed(0)}`;
        const variationWidth = fontRegular.widthOfTextAtSize(variationText, 8);
        const xVariation = xBase + 162 - (variationWidth / 2);

        firstPage.drawText(clubName, { x: xClub, y: yPos, size: 8, font: fontBold });                    // Nombre del palo en negrita
        firstPage.drawText(avgCarryText, { x: xAvgCarry, y: yPos, size: 8, font: fontRegular });  // Carry promedio sin 'yds'
        firstPage.drawText(dato.lateralDispersion, { x: xLateralDispersion, y: yPos, size: 8, font: fontRegular }); // Dispersión lateral
        firstPage.drawText(variationText, { x: xVariation, y: yPos, size: 8, font: fontRegular }); // Variación de distancia

        index++;
      }
    });

    // Añadir nombre y fecha en la esquina superior derecha
    firstPage.drawText(`Nombre: ${nombre}`, { x: 400, y: 750, size: 12, font: fontRegular });
    firstPage.drawText(`Fecha: ${fecha}`, { x: 400, y: 735, size: 12, font: fontRegular });

    // Guardar el PDF modificado
    const pdfBytes = await pdfDoc.save();

    // Crear un enlace de descarga para el nuevo PDF
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `YardageBook_${nombre}_${fecha}.pdf`;
    link.click();

    console.log('Tabla rellenada y nuevo PDF descargado.');
  }

  rellenarYardageBook(clubStats);

  return clubStats;
}

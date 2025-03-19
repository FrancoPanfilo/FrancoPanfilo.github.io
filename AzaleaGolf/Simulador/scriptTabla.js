import {
  PDFDocument,
  StandardFonts,
} from "https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.esm.js";

console.log("HOLA");

function formatearFecha(fechaISO) {
  const fecha = new Date(fechaISO);
  const opciones = { day: "numeric", month: "long", year: "numeric" };
  return fecha.toLocaleDateString("es-ES", opciones);
}

document
  .getElementById("botonTabla")
  .addEventListener("click", () => handleFile());
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
  const deviationPercentage =
    parseFloat(document.getElementById("deviationPercentage").value) / 100;
  const lateralPerc =
    parseFloat(document.getElementById("lateralDeviation").value) / 100;
  const clubStats = {};

  Object.keys(shotsByClub).forEach((club) => {
    const shots = shotsByClub[club];
    let carryValues;
    let lateralDispersion = "-";
    let variation = "-";
    let maxRight = 0;
    let maxLeft = 0;

    if (shots.length === 1) {
      carryValues = shots.map((s) => s.carry);
    } else if (shots.length >= 5) {
      const avgCarry =
        shots.reduce((sum, s) => sum + s.carry, 0) / shots.length;
      const closestShots = shots.sort(
        (a, b) => Math.abs(a.carry - avgCarry) - Math.abs(b.carry - avgCarry)
      );
      const limit = Math.floor(shots.length * deviationPercentage);
      const selectedShots = closestShots.slice(0, limit);
      carryValues = selectedShots.map((s) => s.carry);
    } else {
      carryValues = shots.map((s) => s.carry);
    }

    if (shots.length > 1) {
      const avgCarry =
        carryValues.reduce((sum, val) => sum + val, 0) / carryValues.length;
      const minCarry = Math.min(...carryValues);
      const maxCarry = Math.max(...carryValues);
      variation = `±${((maxCarry - minCarry) / 2).toFixed(0)}`;

      const offlineValues = shots.map((s) => s.offline).sort((a, b) => a - b);
      const lateralLimit = Math.floor(offlineValues.length * lateralPerc);
      const selectedOffline = shots
        .map((s) => s.offline)
        .sort((a, b) => Math.abs(a) - Math.abs(b))
        .slice(0, lateralLimit);

      maxLeft = Math.min(...selectedOffline).toFixed(0);
      maxRight = Math.max(...selectedOffline).toFixed(0);
      if (maxLeft > 0) maxLeft = 0;
      if (maxRight < 0) maxRight = 0;
      maxLeft = Math.abs(maxLeft);
      lateralDispersion = `${Math.abs(maxLeft)}L - ${Math.abs(maxRight)}R`;
    }

    clubStats[club] = {
      avgCarry:
        carryValues.reduce((sum, val) => sum + val, 0) / carryValues.length,
      maxLeft,
      maxRight,
      variation,
    };
  });

  const orderedClubs = {
    Driver: "Dr",
    "Madera 3": "3w",
    "Madera 5": "5w",
    "Madera 7": "7w",
    "Madera 9": "9w",
    "Híbrido 2": "2h",
    "Híbrido 3": "3h",
    "Híbrido 4": "4h",
    "Híbrido 5": "5h",
    "Hierro 1": "1i",
    "Hierro 2": "2i",
    "Hierro 3": "3i",
    "Hierro 4": "4i",
    "Hierro 5": "5i",
    "Hierro 6": "6i",
    "Hierro 7": "7i",
    "Hierro 8": "8i",
    "Hierro 9": "9i",
    PW: "PW",
    GW: "GW",
    SW: "SW",
    LW: "LW",
    "50°": "50",
    "52°": "52",
    "54°": "54",
    "56°": "56",
    "58°": "58",
    "60°": "60",
    "62°": "62",
    "64°": "64",
  };

  delete clubStats.Putt;

  async function rellenarPDF(datos, pdfName, useTemplate = true) {
    const nombre = document.getElementById("nombre").value;
    const fecha = document.getElementById("fecha").value;
    let pdfDoc;

    if (useTemplate) {
      const existingPdfBytes = await fetch(`${pdfName}.pdf`).then((res) =>
        res.arrayBuffer()
      );
      pdfDoc = await PDFDocument.load(existingPdfBytes);
    } else {
      pdfDoc = await PDFDocument.create();
      pdfDoc.addPage([595.28, 841.89]); // Tamaño A4
    }

    const pages = pdfDoc.getPages();
    const firstPage = pages[0];
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const flechaBytes = await fetch("flecha-doble.png").then((res) =>
      res.arrayBuffer()
    );
    const flechaImage = await pdfDoc.embedPng(flechaBytes);

    const contentWidth = 167 + 47; // Ancho aproximado del contenido
    let xBase;
    if (useTemplate) {
      xBase = 47; // Posición original para plantilla
    } else {
      xBase = (595.28 - contentWidth) / 2; // Centrado en A4
    }

    const yBase = useTemplate ? 313 : 841.89 - 22.68; // 0.8 cm = 22.68 puntos desde el tope
    const stepY = 20.25;

    let index = 0;
    Object.keys(orderedClubs).forEach(async (clubName) => {
      const clubCode = orderedClubs[clubName];
      if (datos[clubCode]) {
        const dato = datos[clubCode];
        const yPos = yBase - index * stepY;
        index++;
        const textWidth = fontBold.widthOfTextAtSize(clubName, 8);
        const xClub = xBase - textWidth / 2;
        const avgCarryText = `${dato.avgCarry.toFixed(0)}`;
        const avgCarryWidth = fontRegular.widthOfTextAtSize(avgCarryText, 8);
        const xAvgCarry = xBase + 114 - avgCarryWidth / 2;

        const xLateralDispersion = xBase + 59.5;
        const LLateralDispersion = xBase + 45.5;
        const RLateralDispersion = xBase + 73.5;
        const variationText = `${dato.variation}`;
        const variationWidth = fontRegular.widthOfTextAtSize(variationText, 8);
        const xVariation = xBase + 167 - variationWidth / 2;
        const maxLeftText = `${dato.maxLeft}`;
        const maxRightText = `${dato.maxRight}`;
        const maxLeftWidth = fontRegular.widthOfTextAtSize(maxLeftText, 8);
        const maxRightWidth = fontRegular.widthOfTextAtSize(maxRightText, 8);
        const xMaxLeft = LLateralDispersion - maxLeftWidth / 2;
        const xMaxRight = RLateralDispersion - maxRightWidth / 2;

        firstPage.drawText(clubName, { x: xClub, y: yPos, size: 8, font: fontBold });
        firstPage.drawText(avgCarryText, { x: xAvgCarry, y: yPos, size: 8, font: fontRegular });
        firstPage.drawText(maxLeftText.toString(), { x: xMaxLeft, y: yPos, size: 8, font: fontRegular });
        firstPage.drawText(maxRightText.toString(), { x: xMaxRight, y: yPos, size: 8, font: fontRegular });
        firstPage.drawText(variationText, { x: xVariation, y: yPos, size: 8, font: fontRegular });

        firstPage.drawImage(flechaImage, {
          x: xLateralDispersion - 5,
          y: yPos - 2,
          width: 10,
          height: 10,
        });
      }
    });

    const fechaFormateada = formatearFecha(fecha);
    if (useTemplate) {
      firstPage.drawText(`${nombre}`, { x: 10, y: 385, size: 13, font: fontRegular });
      firstPage.drawText(`${fechaFormateada}`, { x: 10, y: 365, size: 11, font: fontRegular });
      firstPage.drawText(`${(deviationPercentage * 100).toFixed(0)}`, { x: 109, y: 21, size: 4.5, font: fontRegular });
      firstPage.drawText(`${(lateralPerc * 100).toFixed(0)}`, { x: 100.5, y: 35.5, size: 4.5, font: fontRegular });
    } else {
      const nombreWidth = fontRegular.widthOfTextAtSize(nombre, 13);
      const fechaWidth = fontRegular.widthOfTextAtSize(fechaFormateada, 11);
      firstPage.drawText(`${nombre}`, {
        x: (595.28 - nombreWidth) / 2,
        y: 841.89 - 40,
        size: 13,
        font: fontRegular,
      });
      firstPage.drawText(`${fechaFormateada}`, {
        x: (595.28 - fechaWidth) / 2,
        y: 841.89 - 60,
        size: 11,
        font: fontRegular,
      });
      const devText = `${(deviationPercentage * 100).toFixed(0)}`;
      const latText = `${(lateralPerc * 100).toFixed(0)}`;
      const devWidth = fontRegular.widthOfTextAtSize(devText, 4.5);
      const latWidth = fontRegular.widthOfTextAtSize(latText, 4.5);
      firstPage.drawText(devText, {
        x: (595.28 - devWidth) / 2,
        y: 30,
        size: 4.5,
        font: fontRegular,
      });
      firstPage.drawText(latText, {
        x: (595.28 - latWidth) / 2,
        y: 40,
        size: 4.5,
        font: fontRegular,
      });
    }

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${pdfName}_${nombre}_${fechaFormateada}.pdf`;
    link.click();

    console.log(`Tabla rellenada y nuevo PDF (${pdfName}) descargado.`);
  }

  rellenarPDF(clubStats, "YardageBook", true);
  rellenarPDF(clubStats, "vacio", false);

  return clubStats;
}

handleFile();

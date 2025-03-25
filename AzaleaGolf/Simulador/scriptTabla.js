import {
  PDFDocument,
  StandardFonts,
} from "https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.esm.js";

// Listener para el botón "Cargar Archivo"
document.getElementById("botonTabla").addEventListener("click", handleFile);

// Función para formatear la fecha
function formatearFecha(fechaISO) {
  const fecha = new Date(fechaISO);
  const opciones = { day: "numeric", month: "long", year: "numeric" };
  return fecha.toLocaleDateString("es-ES", opciones);
}

// Función principal para manejar el archivo
function handleFile() {
  const input = document.getElementById("pdfFileInput");
  if (!input || input.files.length === 0) {
    alert("Por favor, selecciona un archivo CSV para generar el PDF.");
    return;
  }

  const file = input.files[0];
  const reader = new FileReader();

  reader.onload = function (e) {
    const csvData = e.target.result;
    const shotsByClub = parseGolfShots(csvData);
    const data = calculateStatistics(shotsByClub);

    const yardageBookChecked = document.getElementById(
      "yardageBookCheckbox"
    ).checked;
    const vacioChecked = document.getElementById("vacioCheckbox").checked;

    if (yardageBookChecked) {
      createYardageBookPDF(data);
    }
    if (vacioChecked) {
      createVacioPDF(data);
    }
    if (!yardageBookChecked && !vacioChecked) {
      alert("Por favor, selecciona al menos un PDF para descargar.");
    }
  };

  reader.onerror = function () {
    alert("Error al leer el archivo CSV.");
  };

  reader.readAsText(file);
}

// Función para parsear los datos del CSV
function parseGolfShots(csvData) {
  const rows = csvData.split("\n").map((row) => row.split(","));
  const headers = rows[0].map((h) => h.trim().toLowerCase());

  const clubIndex = headers.findIndex((h) => h.includes("club"));
  const carryIndex = headers.findIndex((h) => h.includes("carry"));
  const offlineIndex = headers.findIndex((h) => h.includes("offline"));

  if (clubIndex === -1 || carryIndex === -1 || offlineIndex === -1) {
    alert(
      "El CSV no tiene las columnas esperadas: 'Club', 'Carry', 'Offline'."
    );
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

// Función para calcular las estadísticas
function calculateStatistics(shotsByClub) {
  const deviationPercentage =
    parseFloat(document.getElementById("deviationPercentage").value) / 100 ||
    0.75;
  const lateralPerc =
    parseFloat(document.getElementById("lateralDeviation").value) / 100 || 0.75;
  const conicalFormat = document.getElementById(
    "conicalFormatCheckbox"
  ).checked;
  const clubStats = {};

  const clubCategories = {
    wedges: ["60", "58", "56", "54", "52", "50", "LW", "SW", "GW"],
    irons: ["PW", "9i", "8i", "7i", "6i", "5i", "4i", "3i", "2i", "1i"],
    hybridsWoods: [
      "7h",
      "6h",
      "9w",
      "5h",
      "4h",
      "7w",
      "6w",
      "3h",
      "5w",
      "4w",
      "2h",
      "3w",

      "2w",
    ],
    driver: ["Dr"],
  };

  // Calcular estadísticas iniciales
  Object.keys(shotsByClub).forEach((club) => {
    const shots = shotsByClub[club];
    let carryValues;
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

      maxLeft = Math.abs(Math.min(...selectedOffline)).toFixed(0);
      maxRight = Math.max(...selectedOffline).toFixed(0);
      if (maxRight < 0) maxRight = 0;
    }

    clubStats[club] = {
      avgCarry:
        carryValues.reduce((sum, val) => sum + val, 0) / carryValues.length,
      maxLeft: maxLeft,
      maxRight: maxRight,
      variation: variation,
    };
  });

  // Aplicar "Formato aconado" si está activado
  if (conicalFormat) {
    const adjustDispersion = (categoryClubs) => {
      const existingClubs = categoryClubs.filter((club) => clubStats[club]);
      for (let i = 1; i < existingClubs.length; i++) {
        const currentClub = existingClubs[i];
        const prevClub = existingClubs[i - 1];

        const prevMaxLeft = parseFloat(clubStats[prevClub].maxLeft) || 0;
        const prevMaxRight = parseFloat(clubStats[prevClub].maxRight) || 0;
        const currMaxLeft = parseFloat(clubStats[currentClub].maxLeft) || 0;
        const currMaxRight = parseFloat(clubStats[currentClub].maxRight) || 0;

        clubStats[currentClub].maxLeft = Math.max(currMaxLeft, prevMaxLeft);
        clubStats[currentClub].maxRight = Math.max(currMaxRight, prevMaxRight);
      }
    };

    adjustDispersion(clubCategories.wedges);
    adjustDispersion(clubCategories.irons);
    adjustDispersion(clubCategories.hybridsWoods);
  }

  const orderedClubs = {
    Driver: "Dr",
    "Madera 2": "2w",
    "Madera 3": "3w",
    "Madera 4": "4w",
    "Madera 5": "5w",
    "Madera 6": "6w",
    "Madera 7": "7w",
    "Madera 9": "9w",
    "Híbrido 2": "2h",
    "Híbrido 3": "3h",
    "Híbrido 4": "4h",
    "Híbrido 5": "5h",
    "Híbrido 6": "6h",
    "Híbrido 7": "7h",
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

  return { clubStats, orderedClubs, deviationPercentage, lateralPerc };
}

// Función para crear el PDF "YardageBook"
async function createYardageBookPDF(data) {
  const { clubStats, orderedClubs, deviationPercentage, lateralPerc } = data;
  await rellenarPDF(
    clubStats,
    orderedClubs,
    deviationPercentage,
    lateralPerc,
    "YardageBook"
  );
}

// Función para crear el PDF "vacio"
async function createVacioPDF(data) {
  const { clubStats, orderedClubs, deviationPercentage, lateralPerc } = data;
  await rellenarPDF(
    clubStats,
    orderedClubs,
    deviationPercentage,
    lateralPerc,
    "vacio"
  );
}

// Función auxiliar para rellenar PDFs
async function rellenarPDF(
  clubStats,
  orderedClubs,
  deviationPercentage,
  lateralPerc,
  pdfName
) {
  const nombre = document.getElementById("nombre").value || "Sin nombre";
  const fecha =
    document.getElementById("fecha").value ||
    new Date().toISOString().slice(0, 10);

  try {
    const existingPdfBytes = await fetch(`${pdfName}.pdf`).then((res) => {
      if (!res.ok) throw new Error("No se pudo cargar el PDF base.");
      return res.arrayBuffer();
    });

    const pdfDoc = await PDFDocument.load(existingPdfBytes);
    const pages = pdfDoc.getPages();
    const firstPage = pages[0];
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const flechaBytes = await fetch("flecha-doble.png").then((res) => {
      if (!res.ok) throw new Error("No se pudo cargar la imagen de flecha.");
      return res.arrayBuffer();
    });
    const flechaImage = await pdfDoc.embedPng(flechaBytes);

    let xBase = 213;
    let yBase = 725;
    const stepY = 20.25;

    let index = 0;
    Object.keys(orderedClubs).forEach((clubName) => {
      const clubCode = orderedClubs[clubName];
      if (clubStats[clubCode]) {
        const dato = clubStats[clubCode];
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

        firstPage.drawText(clubName, {
          x: xClub,
          y: yPos,
          size: 8,
          font: fontBold,
        });
        firstPage.drawText(avgCarryText, {
          x: xAvgCarry,
          y: yPos,
          size: 8,
          font: fontRegular,
        });
        firstPage.drawText(maxLeftText.toString(), {
          x: xMaxLeft,
          y: yPos,
          size: 8,
          font: fontRegular,
        });
        firstPage.drawText(maxRightText.toString(), {
          x: xMaxRight,
          y: yPos,
          size: 8,
          font: fontRegular,
        });
        firstPage.drawText(variationText, {
          x: xVariation,
          y: yPos,
          size: 8,
          font: fontRegular,
        });

        firstPage.drawImage(flechaImage, {
          x: xLateralDispersion - 5,
          y: yPos - 2,
          width: 10,
          height: 10,
        });
      }
    });

    const fechaFormateada = formatearFecha(fecha);
    firstPage.drawText(`${nombre}`, {
      x: 180,
      y: 797,
      size: 13,
      font: fontRegular,
    });
    firstPage.drawText(`${fechaFormateada}`, {
      x: 180,
      y: 777,
      size: 11,
      font: fontRegular,
    });
    firstPage.drawText(`${(deviationPercentage * 100).toFixed(0)}`, {
      x: 300,
      y: 434,
      size: 5,
      font: fontBold,
    });
    firstPage.drawText(`${(lateralPerc * 100).toFixed(0)}`, {
      x: 288.5,
      y: 452,
      size: 5,
      font: fontBold,
    });

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${pdfName}_${nombre}_${fechaFormateada}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    alert(
      `No se pudo generar el PDF ${pdfName}. Revisa la consola para más detalles.`
    );
  }
}

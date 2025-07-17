// Importaciones
import { auth, db } from "../firebase.js";
import {
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";
import {
  PDFDocument,
  StandardFonts,
} from "https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.esm.js";

// ============= CONSTANTES Y CONFIGURACIÓN =============
const CLUB_CATEGORIES = {
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

const ORDERED_CLUBS = {
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

// ============= FUNCIONES DE UTILIDAD =============
function formatearFecha(fechaISO) {
  const fecha = new Date(fechaISO);
  const opciones = { day: "numeric", month: "long", year: "numeric" };
  return fecha.toLocaleDateString("es-ES", opciones);
}

// ============= SISTEMA DE MANEJO DE ERRORES =============
class YardageBookError extends Error {
  constructor(message, type, details) {
    super(message);
    this.name = "YardageBookError";
    this.type = type;
    this.details = details;
  }
}

// ============= FUNCIONES DE PROCESAMIENTO DE DATOS =============
function procesarSesion(session, sessionIndex) {
  try {
    const selectedShots = session.datos.filter(
      (shot) => shot.TiroDesactivado !== true
    );

    if (selectedShots.length === 0) {
      return { shots: [] };
    }

    const shots = selectedShots.map((shot, shotIndex) => {
      const carry = parseFloat(shot["carry (yds)"]) || 0;
      const sideSpin = parseFloat(shot["side spin (rpm l-/r+)"]) || 0;
      const backSpin = parseFloat(shot["back spin (rpm)"]) || 0;
      const offline = parseFloat(shot["offline (yds l-/r+)"]) || 0;

      return {
        club: shot["club name"] || "Unknown",
        carry: carry,
        totalDistance: parseFloat(shot["total distance (yds)"]) || carry,
        offline: offline,
        sideSpin: sideSpin,
        backSpin: backSpin,
        launchAngle: parseFloat(shot["launch angle (deg)"]) || 0,
        ballSpeed: parseFloat(shot["ball speed (mph)"]) || 0,
        clubSpeed: parseFloat(shot["club speed (mph)"]) || 0,
        efficiency: parseFloat(shot["efficiency"]) || 0,
        angleOfAttack: parseFloat(shot["angle of attack (deg)"]) || 0,
        clubPath: parseFloat(shot["club path (deg out-in-/in-out+)"]) || 0,
        peakHeight: parseFloat(shot["peak height (yds)"]) || 0,
        descentAngle: parseFloat(shot["descent angle (deg)"]) || 0,
      };
    });

    // Verificar si todos los valores de offline son 0
    const offlineValues = shots.map((s) => s.offline);
    const allZero = offlineValues.every((v) => v === 0);

    return { shots };
  } catch (error) {
    return { shots: [] };
  }
}

function agruparTirosPorPalo(sessions) {
  const shotsByClub = {};

  sessions.forEach((session, sessionIndex) => {
    const shots = Array.isArray(session.shots) ? session.shots : [];

    shots.forEach((shot, shotIndex) => {
      const clubName = shot.club;
      if (!clubName) return;
      if (!shotsByClub[clubName]) shotsByClub[clubName] = [];

      shotsByClub[clubName].push({
        carry: shot.carry,
        offline: shot.offline,
        totalDistance: shot.totalDistance,
        ballSpeed: shot.ballSpeed,
        clubSpeed: shot.clubSpeed,
        efficiency: shot.efficiency,
        launchAngle: shot.launchAngle,
        backSpin: shot.backSpin,
        sideSpin: shot.sideSpin,
      });
    });
  });

  return shotsByClub;
}

// ============= FUNCIONES DE CÁLCULO DE ESTADÍSTICAS =============
function calcularEstadisticasClub(
  shots,
  deviationPercentage = 0.75,
  lateralPerc = 0.75
) {
  let carryValues,
    variation = "-",
    maxRight = 0,
    maxLeft = 0;

  if (shots.length === 1) {
    carryValues = shots.map((s) => s.carry);
  } else if (shots.length >= 5) {
    const avgCarry = shots.reduce((sum, s) => sum + s.carry, 0) / shots.length;
    const closestShots = shots.sort(
      (a, b) => Math.abs(a.carry - avgCarry) - Math.abs(b.carry - avgCarry)
    );
    const limit = Math.floor(shots.length * deviationPercentage);
    carryValues = closestShots.slice(0, limit).map((s) => s.carry);
  } else {
    carryValues = shots.map((s) => s.carry);
  }

  if (shots.length > 1) {
    const avgCarry =
      carryValues.reduce((sum, val) => sum + val, 0) / carryValues.length;
    const minCarry = Math.min(...carryValues);
    const maxCarry = Math.max(...carryValues);
    variation = `±${((maxCarry - minCarry) / 2).toFixed(0)}`;

    // CÁLCULO DE DISPERSIÓN LATERAL

    const offlineValues = shots.map((s) => s.offline);

    const offlineValuesSorted = offlineValues.sort((a, b) => a - b);

    const lateralLimit = Math.floor(offlineValues.length * lateralPerc);

    const selectedOffline = shots
      .map((s) => s.offline)
      .sort((a, b) => Math.abs(a) - Math.abs(b))
      .slice(0, lateralLimit);

    maxLeft = Math.abs(Math.min(...selectedOffline)).toFixed(0);
    maxRight = Math.max(...selectedOffline).toFixed(0);
    if (maxRight < 0) maxRight = 0;
  } else {
  }

  const result = {
    avgCarry:
      carryValues.reduce((sum, val) => sum + val, 0) / carryValues.length,
    maxLeft,
    maxRight,
    variation,
  };

  return result;
}

function ajustarDispersion(clubStats, categoryClubs) {
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
}

// ============= FUNCIÓN DE GENERACIÓN DE PDF =============
async function rellenarPDF2(
  clubStats,
  orderedClubs,
  deviationPercentage,
  lateralPerc,
  pdfName,
  preview = false
) {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("No hay usuario autenticado");

    const userDocRef = doc(db, "Simulador", user.uid);
    const userDoc = await getDoc(userDocRef);
    if (!userDoc.exists())
      throw new Error("No se encontraron datos del usuario");

    const userData = userDoc.data();
    const nombreCompleto = `${userData.nombre} ${userData.apellido}`;
    const fecha = new Date().toISOString().slice(0, 10);

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

    let xBase = 47;
    let yBase = 313;
    const stepY = 20.25;
    let index = 0;
    Object.keys(orderedClubs).forEach((clubName) => {
      const clubCode = orderedClubs[clubName];
      if (clubStats[clubCode] || clubStats[clubName]) {
        const dato = clubStats[clubCode] || clubStats[clubName];
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
    firstPage.drawText(`${nombreCompleto}`, {
      x: 10,
      y: 385,
      size: 13,
      font: fontRegular,
    });
    firstPage.drawText(`${fechaFormateada}`, {
      x: 10,
      y: 365,
      size: 11,
      font: fontRegular,
    });
    firstPage.drawText(`${(deviationPercentage * 100).toFixed(0)}`, {
      x: 133.5,
      y: 22.5,
      size: 4.5,
      font: fontBold,
    });
    firstPage.drawText(`${(lateralPerc * 100).toFixed(0)}`, {
      x: 124,
      y: 40.5,
      size: 4.5,
      font: fontBold,
    });

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: "application/pdf" });

    if (preview) {
      const url = URL.createObjectURL(blob);
      const previewWindow = window.open(url, "_blank");
      if (previewWindow) {
        previewWindow.focus();
      } else {
        alert(
          "Por favor, permite las ventanas emergentes para previsualizar el PDF"
        );
      }
      return blob;
    } else {
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${pdfName}_${nombreCompleto.replace(
        /\s+/g,
        "_"
      )}_${fechaFormateada}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  } catch (error) {
    alert(
      `No se pudo generar el PDF ${pdfName}. Revisa la consola para más detalles.`
    );
  }
}

// ============= FUNCIÓN DE MANEJO DE ERRORES =============
export function handleYardageBookError(error) {
  if (error instanceof YardageBookError) {
    switch (error.type) {
      case "NO_VALID_SESSIONS":
        return {
          title: "No hay sesiones válidas",
          message:
            "No se encontraron sesiones válidas para crear el YardageBook. Asegúrate de tener al menos una sesión con tiros válidos.",
          suggestions: [
            "Verifica que tengas sesiones creadas",
            "Asegúrate de que las sesiones tengan tiros seleccionados",
            "Revisa que los datos de las sesiones sean válidos",
          ],
        };
      case "NO_VALID_SHOTS":
        return {
          title: "No hay tiros válidos",
          message:
            "Las sesiones seleccionadas no contienen tiros válidos para crear el YardageBook.",
          suggestions: [
            "Selecciona tiros válidos en las sesiones",
            "Verifica que los datos de los tiros sean correctos",
            "Asegúrate de que los palos estén bien identificados",
          ],
        };
      case "PDF_GENERATION_ERROR":
        return {
          title: "Error al generar PDF",
          message: "No se pudo generar el archivo PDF del YardageBook.",
          suggestions: [
            "Verifica que tengas conexión a internet",
            "Intenta generar el YardageBook nuevamente",
            "Contacta al soporte si el problema persiste",
          ],
        };
      default:
        return {
          title: "Error en YardageBook",
          message:
            error.message ||
            "Ocurrió un error inesperado al crear el YardageBook.",
          suggestions: [
            "Intenta crear el YardageBook nuevamente",
            "Verifica que todos los datos sean correctos",
            "Contacta al soporte si el problema persiste",
          ],
        };
    }
  } else {
    return {
      title: "Error inesperado",
      message:
        error.message || "Ocurrió un error inesperado al crear el YardageBook.",
      suggestions: [
        "Intenta crear el YardageBook nuevamente",
        "Verifica que todos los datos sean correctos",
        "Contacta al soporte si el problema persiste",
      ],
    };
  }
}

// ============= FUNCIÓN PRINCIPAL =============
export async function createYardageBook(
  selectedSessions,
  deviationPercentage = 0.75,
  lateralPercentage = 0.75,
  formatoAconado = true
) {
  try {
    if (!Array.isArray(selectedSessions) || selectedSessions.length === 0) {
      throw new YardageBookError(
        "No hay sesiones válidas para crear el YardageBook",
        "NO_VALID_SESSIONS",
        { selectedSessions }
      );
    }

    const processedSessions = selectedSessions.map((session, index) => {
      return procesarSesion(session, index);
    });

    const validSessions = processedSessions.filter(
      (session) => session.shots.length > 0
    );

    if (validSessions.length === 0) {
      throw new YardageBookError(
        "No hay tiros válidos en las sesiones seleccionadas",
        "NO_VALID_SHOTS",
        { processedSessions }
      );
    }

    const shotsByClub = agruparTirosPorPalo(validSessions);

    const clubStats = {};
    Object.keys(shotsByClub).forEach((club) => {
      clubStats[club] = calcularEstadisticasClub(
        shotsByClub[club],
        deviationPercentage,
        lateralPercentage
      );
    });

    if (formatoAconado) {
      Object.values(CLUB_CATEGORIES).forEach((category) => {
        ajustarDispersion(clubStats, category);
      });
    }

    delete clubStats.Putt;

    await rellenarPDF2(
      clubStats,
      ORDERED_CLUBS,
      deviationPercentage,
      lateralPercentage,
      "YardageBook",
      false
    );

    return validSessions;
  } catch (error) {
    if (error instanceof YardageBookError) {
      throw error;
    } else {
      throw new YardageBookError(error.message, "UNKNOWN_ERROR", {
        originalError: error,
      });
    }
  }
}

// Función para previsualizar el YardageBook
export async function previewYardageBook(
  selectedSessions,
  deviationPercentage = 0.75,
  lateralPercentage = 0.75,
  formatoAconado = true
) {
  try {
    if (!Array.isArray(selectedSessions) || selectedSessions.length === 0) {
      throw new YardageBookError(
        "No hay sesiones válidas para crear el YardageBook",
        "NO_VALID_SESSIONS",
        { selectedSessions }
      );
    }

    const processedSessions = selectedSessions.map((session, index) => {
      return procesarSesion(session, index);
    });

    const validSessions = processedSessions.filter(
      (session) => session.shots.length > 0
    );

    if (validSessions.length === 0) {
      throw new YardageBookError(
        "No hay tiros válidos en las sesiones seleccionadas",
        "NO_VALID_SHOTS",
        { processedSessions }
      );
    }

    const shotsByClub = agruparTirosPorPalo(validSessions);

    const clubStats = {};
    Object.keys(shotsByClub).forEach((club) => {
      clubStats[club] = calcularEstadisticasClub(
        shotsByClub[club],
        deviationPercentage,
        lateralPercentage
      );
    });

    if (formatoAconado) {
      Object.values(CLUB_CATEGORIES).forEach((category) => {
        ajustarDispersion(clubStats, category);
      });
    }

    delete clubStats.Putt;

    await rellenarPDF2(
      clubStats,
      ORDERED_CLUBS,
      deviationPercentage,
      lateralPercentage,
      "YardageBook",
      true
    );

    return validSessions;
  } catch (error) {
    if (error instanceof YardageBookError) {
      throw error;
    } else {
      throw new YardageBookError(error.message, "UNKNOWN_ERROR", {
        originalError: error,
      });
    }
  }
}

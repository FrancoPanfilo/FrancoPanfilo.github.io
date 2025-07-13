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

// ============= DOCUMENTACIÓN Y AYUDA =============
/**
 * YARDAGEBOOK - GUÍA DE CÁLCULOS
 *
 * Este sistema genera un YardageBook personalizado basado en los datos del simulador.
 *
 * CÁLCULOS PRINCIPALES:
 *
 * 1. DISTANCIA PROMEDIO (Carry):
 *    - Se calcula el promedio de carry de todos los tiros válidos por palo
 *    - Se aplica un filtro de desviación estándar para eliminar outliers
 *    - Fórmula: Σ(carry_i) / n, donde n = número de tiros válidos
 *
 * 2. DISPERSIÓN LATERAL:
 *    - Se calcula basado en el side spin y la dirección de lanzamiento
 *    - Fórmula: Efecto de dirección + Efecto del spin
 *    - Efecto de dirección = tan(ángulo_lanzamiento) × carry
 *    - Efecto del spin = (side_spin / 1000) × (carry / 100) × 1.5
 *
 * 3. VARIACIÓN LONGITUDINAL:
 *    - Se calcula la diferencia entre el tiro más largo y más corto
 *    - Se aplica un porcentaje de desviación (por defecto 75%)
 *    - Fórmula: ±((max_carry - min_carry) / 2)
 *
 * 4. FILTRADO DE TIROS:
 *    - Se eliminan tiros con datos inválidos (velocidad > 550 mph)
 *    - Se consideran solo tiros marcados como "seleccionados"
 *    - Mínimo 3 tiros por palo para estadísticas confiables
 *
 * 5. AJUSTE POR CATEGORÍAS:
 *    - Los palos de la misma categoría comparten dispersión lateral
 *    - Esto simula la consistencia del swing del jugador
 *
 * VALORES POR DEFECTO:
 * - Desviación estándar: 75% (elimina el 25% más disperso)
 * - Dispersión lateral: 75% (considera el 75% más consistente)
 * - Mínimo tiros por palo: 3
 * - Máximo tiros por palo: 20
 */

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

// ============= CONFIGURACIÓN AVANZADA =============
const YARDAGEBOOK_CONFIG = {
  dispersion: {
    deviationPercentage: 0.75, // Porcentaje de desviación estándar
    lateralPercentage: 0.75, // Porcentaje de dispersión lateral
    minShotsPerClub: 3, // Mínimo tiros por palo
    maxShotsPerClub: 20, // Máximo tiros por palo
  },

  output: {
    includePutts: false, // Incluir putts en el yardagebook
    includeWarmup: false, // Incluir tiros de calentamiento
    sortByDistance: true, // Ordenar por distancia
    includeStats: true, // Incluir estadísticas adicionales
  },

  formatting: {
    distanceUnit: "yards", // Unidad de distancia
    precision: 0, // Precisión decimal
    includeDate: true, // Incluir fecha
    includePlayerName: true, // Incluir nombre del jugador
  },
};

// Función para obtener configuración personalizada
function getYardageBookConfig() {
  const saved = localStorage.getItem("yardageBookConfig");
  return saved
    ? { ...YARDAGEBOOK_CONFIG, ...JSON.parse(saved) }
    : YARDAGEBOOK_CONFIG;
}

// Función para guardar configuración personalizada
function saveYardageBookConfig(config) {
  localStorage.setItem("yardageBookConfig", JSON.stringify(config));
}

// ============= FUNCIONES DE UTILIDAD =============
function formatearFecha(fechaISO) {
  const fecha = new Date(fechaISO);
  const opciones = { day: "numeric", month: "long", year: "numeric" };
  return fecha.toLocaleDateString("es-ES", opciones);
}

// ============= VALIDACIÓN ROBUSTA DE DATOS =============
function validateShotData(shot) {
  const errors = [];
  const warnings = [];

  // Validaciones críticas
  if (!shot["club name"]) {
    errors.push("Nombre del palo faltante");
  }

  if (!shot["carry (yds)"]) {
    errors.push("Distancia de carry faltante");
  }

  if (!shot["ball speed (mph)"]) {
    errors.push("Velocidad de bola faltante");
  }

  // Validaciones de rango
  const carry = parseFloat(shot["carry (yds)"]);
  if (carry < 10 || carry > 400) {
    warnings.push("Distancia de carry fuera de rango normal (10-400 yardas)");
  }

  const ballSpeed = parseFloat(shot["ball speed (mph)"]);
  if (ballSpeed < 50 || ballSpeed > 200) {
    warnings.push("Velocidad de bola fuera de rango normal (50-200 mph)");
  }

  const clubSpeed = parseFloat(shot["club speed (mph)"]);
  if (clubSpeed > 550) {
    errors.push("Velocidad de palo inválida (>550 mph)");
  }

  // Validaciones de consistencia
  const totalDistance = parseFloat(shot["total distance (yds)"]);
  if (carry > totalDistance) {
    errors.push("Carry mayor que distancia total");
  }

  // Validaciones de spin
  const backSpin = parseFloat(shot["back spin (rpm)"]);
  if (backSpin < 0 || backSpin > 15000) {
    warnings.push("Back spin fuera de rango normal (0-15000 rpm)");
  }

  const sideSpin = parseFloat(shot["side spin (rpm l-/r+)"]);
  if (Math.abs(sideSpin) > 5000) {
    warnings.push("Side spin muy alto (>5000 rpm)");
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    score: calculateDataQualityScore(shot),
  };
}

// Función para calcular calidad de datos
function calculateDataQualityScore(shot) {
  let score = 100;

  // Penalizar datos faltantes
  const requiredFields = [
    "club name",
    "carry (yds)",
    "ball speed (mph)",
    "club speed (mph)",
  ];
  requiredFields.forEach((field) => {
    if (!shot[field]) score -= 25;
  });

  // Penalizar valores fuera de rango
  const carry = parseFloat(shot["carry (yds)"]);
  if (carry < 10 || carry > 400) score -= 10;

  const ballSpeed = parseFloat(shot["ball speed (mph)"]);
  if (ballSpeed < 50 || ballSpeed > 200) score -= 10;

  const clubSpeed = parseFloat(shot["club speed (mph)"]);
  if (clubSpeed > 550) score -= 50;

  return Math.max(0, score);
}

// ============= FUNCIONES DE PROCESAMIENTO DE DATOS =============
async function obtenerDatosUsuario() {
  const user = auth.currentUser;
  if (!user) throw new Error("No hay usuario autenticado");

  const userDocRef = doc(db, "Simulador", user.uid);
  const userDoc = await getDoc(userDocRef);

  if (!userDoc.exists()) throw new Error("No se encontraron datos del usuario");

  const userData = userDoc.data();
  if (!userData.Sesiones?.length)
    throw new Error("No hay sesiones disponibles");

  return { user, userData };
}

function filtrarSesionesSeleccionadas(allSessions, selectedSessionIndices) {
  console.log("Filtrando sesiones seleccionadas:", {
    totalSesiones: allSessions?.length || 0,
    indicesSeleccionados: selectedSessionIndices,
  });

  if (!Array.isArray(allSessions)) {
    console.error("allSessions no es un array:", allSessions);
    throw new Error("Datos de sesiones inválidos");
  }

  // Convertir selectedSessionIndices a Set si es un array
  const selectedIndicesSet =
    selectedSessionIndices instanceof Set
      ? selectedSessionIndices
      : new Set(selectedSessionIndices);

  if (!selectedIndicesSet || selectedIndicesSet.size === 0) {
    console.error("No hay sesiones seleccionadas");
    throw new Error("No se han seleccionado sesiones");
  }

  const selectedSessions = allSessions.filter((session, index) => {
    const isSelected = selectedIndicesSet.has(index);
    if (isSelected) {
      console.log(`Sesión ${index} seleccionada:`, {
        fecha: session.fecha,
        tieneDatos: !!session.datos,
        numeroTiros: session.datos?.length || 0,
      });
    }
    return isSelected;
  });

  console.log("Sesiones filtradas:", {
    totalFiltradas: selectedSessions.length,
    fechas: selectedSessions.map((s) => s.fecha),
  });

  return selectedSessions;
}

function procesarSesion(session, sessionIndex) {
  try {
    // Filtrar tiros que no estén explícitamente deseleccionados
    const selectedShots = session.datos.filter(
      (shot) => shot.selected !== false
    );
    console.log(`Sesión ${sessionIndex}:`, {
      totalTiros: session.datos.length,
      tirosSeleccionados: selectedShots.length,
      primerTiro: selectedShots[0] || null,
    });

    if (selectedShots.length === 0) {
      console.warn(`No hay tiros seleccionados en la sesión ${sessionIndex}`);
      return { shots: [] };
    }

    // Procesar los tiros seleccionados
    const shots = selectedShots
      .map((shot) => {
        // Verificar que el tiro tenga los datos necesarios
        if (
          !shot["club name"] ||
          !shot["carry (yds)"] ||
          !shot["side spin (rpm l-/r+)"] ||
          !shot["back spin (rpm)"]
        ) {
          console.warn("Tiro sin datos necesarios:", shot);
          return null;
        }

        // Convertir valores a números y verificar que sean válidos
        const carry = parseFloat(shot["carry (yds)"]);
        const sideSpin = parseFloat(shot["side spin (rpm l-/r+)"]);
        const backSpin = parseFloat(shot["back spin (rpm)"]);

        if (isNaN(carry) || isNaN(sideSpin) || isNaN(backSpin)) {
          console.warn("Tiro con valores numéricos inválidos:", shot);
          return null;
        }

        // Mapear los datos del tiro
        return {
          club: shot["club name"],
          carry: carry,
          totalDistance: parseFloat(shot["total distance (yds)"]) || carry,
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
      })
      .filter((shot) => shot !== null);

    if (shots.length === 0) {
      console.warn(
        `No se encontraron tiros válidos en la sesión ${sessionIndex}`
      );
    } else {
      console.log(`Sesión ${sessionIndex} procesada exitosamente:`, {
        tirosProcesados: shots.length,
        palos: [...new Set(shots.map((s) => s.club))],
      });
    }

    return { shots };
  } catch (error) {
    console.error("Error al procesar sesión:", error);
    return { shots: [] };
  }
}

function agruparTirosPorPalo(sessions) {
  const shotsByClub = {};

  sessions.forEach((session) => {
    const shots = Array.isArray(session.shots) ? session.shots : [];
    shots.forEach((shot) => {
      const clubName = shot.club;
      if (!clubName) return;

      if (!shotsByClub[clubName]) shotsByClub[clubName] = [];

      // Debug: Verificar qué campos están disponibles
      console.log("🔍 Campos disponibles en el tiro:", Object.keys(shot));
      console.log("🔍 Buscando campo offline en:", {
        "offline (yds l-/r+)": shot["offline (yds l-/r+)"],
        "offline (yds)": shot["offline (yds)"],
        offline: shot.offline,
        side: shot["side"],
        "side (yds)": shot["side (yds)"],
      });

      // Usar el valor real de dispersión lateral (offline) como lo hace el heatmap
      let offline = 0;

      // Intentar diferentes nombres de campo para offline (prioridad como en heatmap)
      if (shot["offline (yds l-/r+)"] !== undefined) {
        offline = parseFloat(shot["offline (yds l-/r+)"]) || 0;
        console.log("✅ Usando offline (yds l-/r+):", offline);
      } else if (shot["offline (yds)"] !== undefined) {
        offline = parseFloat(shot["offline (yds)"]) || 0;
        console.log("✅ Usando offline (yds):", offline);
      } else if (shot.offline !== undefined) {
        offline = parseFloat(shot.offline) || 0;
        console.log("✅ Usando offline:", offline);
      } else if (shot["side"] !== undefined) {
        offline = parseFloat(shot["side"]) || 0;
        console.log("✅ Usando side:", offline);
      } else if (shot["side (yds)"] !== undefined) {
        offline = parseFloat(shot["side (yds)"]) || 0;
        console.log("✅ Usando side (yds):", offline);
      } else {
        // Fallback: usar la función calculateLateralDispersion si no existe el campo offline
        console.log(
          "⚠️ No se encontró campo offline, usando función de cálculo"
        );
        offline = calculateLateralDispersion(shot);
      }

      console.log("📊 Valor final de offline para este tiro:", offline);

      shotsByClub[clubName].push({
        carry: shot.carry,
        offline: offline, // Dispersión lateral real
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

// Función mejorada para calcular dispersión lateral
function calculateLateralDispersion(shot) {
  // Debug: Imprimir los datos del tiro para diagnosticar
  console.log("🔍 Datos del tiro para dispersión lateral:", {
    carry: shot.carry,
    sideSpin: shot.sideSpin,
    clubPath: shot.clubPath,
    club: shot.club,
  });

  // Buscar el campo offline real (como lo hace el heatmap)
  let offline = 0;

  // Intentar diferentes nombres de campo para offline
  if (shot["offline (yds l-/r+)"] !== undefined) {
    offline = parseFloat(shot["offline (yds l-/r+)"]) || 0;
    console.log("✅ Usando offline (yds l-/r+):", offline);
  } else if (shot["offline (yds)"] !== undefined) {
    offline = parseFloat(shot["offline (yds)"]) || 0;
    console.log("✅ Usando offline (yds):", offline);
  } else if (shot.offline !== undefined) {
    offline = parseFloat(shot.offline) || 0;
    console.log("✅ Usando offline:", offline);
  } else if (shot["side"] !== undefined) {
    offline = parseFloat(shot["side"]) || 0;
    console.log("✅ Usando side:", offline);
  } else if (shot["side (yds)"] !== undefined) {
    offline = parseFloat(shot["side (yds)"]) || 0;
    console.log("✅ Usando side (yds):", offline);
  } else {
    // Si no existe el campo offline, usar la fórmula del heatmap como fallback
    console.log("⚠️ No se encontró campo offline, usando fórmula del heatmap");

    const pushPullDeg = parseFloat(shot["push/pull (deg l-/r+)"]) || 0;
    const carryYds = parseFloat(shot.carry) || 0;
    const sideSpinRpm = parseFloat(shot.sideSpin) || 0;

    // Validar datos
    if (
      Math.abs(pushPullDeg) > 45 ||
      Math.abs(sideSpinRpm) > 5000 ||
      carryYds < 0
    ) {
      console.warn("Datos inválidos para el tiro:", shot);
      return 0;
    }

    // Desviación inicial por push/pull
    const initialOffline = Math.tan((pushPullDeg * Math.PI) / 180) * carryYds;

    // Curvatura por side spin (1.5 yds por 1000 RPM por 50 yds de carry)
    const curvature = (sideSpinRpm / 1000) * 1.5 * (carryYds / 50);

    offline = initialOffline + curvature;

    console.log("📊 Cálculo fallback:", {
      pushPullDeg,
      carryYds,
      sideSpinRpm,
      initialOffline,
      curvature,
      offline,
    });
  }

  console.log("📊 Valor final de dispersión lateral:", offline);
  return offline;
}

// Función para calcular dispersión longitudinal mejorada
function calculateLongitudinalDispersion(shots, percentage = 0.75) {
  const carryValues = shots
    .map((s) => parseFloat(s.carry))
    .filter((v) => !isNaN(v));

  if (carryValues.length === 0) {
    return { mean: 0, min: 0, max: 0, variation: 0, confidence: 0 };
  }

  const mean = carryValues.reduce((a, b) => a + b) / carryValues.length;

  // Usar percentiles en lugar de promedio simple
  const sorted = carryValues.sort((a, b) => a - b);
  const percentileIndex = Math.floor(sorted.length * (1 - percentage));
  const selectedShots = sorted.slice(0, percentileIndex);

  // Calcular nivel de confianza basado en número de tiros
  const confidence = Math.min(95, 50 + carryValues.length * 2);

  return {
    mean: mean,
    min: Math.min(...selectedShots),
    max: Math.max(...selectedShots),
    variation: Math.max(...selectedShots) - Math.min(...selectedShots),
    confidence: confidence,
  };
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

export function handleYardageBookError(error) {
  const errorMessages = {
    NO_SESSIONS: "No se han seleccionado sesiones para el YardageBook",
    NO_VALID_SHOTS:
      "No se encontraron tiros válidos en las sesiones seleccionadas",
    INSUFFICIENT_DATA:
      "Datos insuficientes para generar estadísticas confiables",
    PDF_GENERATION: "Error al generar el archivo PDF",
    NETWORK_ERROR: "Error de conexión al cargar datos",
    VALIDATION_ERROR: "Error en la validación de datos",
  };

  const userMessage =
    errorMessages[error.type] || "Error inesperado al crear el YardageBook";

  return {
    title: "Error en YardageBook",
    message: userMessage,
    details: error.details,
    suggestions: getErrorSuggestions(error.type),
  };
}

function getErrorSuggestions(errorType) {
  const suggestions = {
    NO_SESSIONS: [
      "Selecciona al menos una sesión de práctica",
      "Verifica que las sesiones contengan datos válidos",
    ],
    NO_VALID_SHOTS: [
      "Revisa que los tiros estén marcados como seleccionados",
      "Verifica que los datos del simulador sean correctos",
      "Asegúrate de que haya al menos 3 tiros por palo",
    ],
    INSUFFICIENT_DATA: [
      "Agrega más sesiones de práctica",
      "Incluye más tiros por palo (mínimo 3)",
      "Verifica que los datos sean consistentes",
    ],
    PDF_GENERATION: [
      "Verifica tu conexión a internet",
      "Intenta generar el PDF nuevamente",
      "Contacta soporte si el problema persiste",
    ],
  };

  return (
    suggestions[errorType] || [
      "Intenta nuevamente",
      "Contacta soporte si el problema persiste",
    ]
  );
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

  return {
    avgCarry:
      carryValues.reduce((sum, val) => sum + val, 0) / carryValues.length,
    maxLeft,
    maxRight,
    variation,
  };
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
  pdfName
) {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error("No hay usuario autenticado");

    // Obtener nombre completo del usuario
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
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${pdfName}_${nombreCompleto.replace(
      /\s+/g,
      "_"
    )}_${fechaFormateada}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    alert(
      `No se pudo generar el PDF ${pdfName}. Revisa la consola para más detalles.`
    );
  }
}

// ============= FUNCIÓN PRINCIPAL =============
export async function createYardageBook(
  selectedSessions,
  deviationPercentage = 0.75,
  lateralPercentage = 0.75
) {
  try {
    console.log(
      "Iniciando creación de YardageBook con sesiones:",
      selectedSessions,
      "Configuración:",
      { deviationPercentage, lateralPercentage }
    );

    // Verificar que tenemos sesiones válidas
    if (!Array.isArray(selectedSessions) || selectedSessions.length === 0) {
      console.error("No hay sesiones válidas proporcionadas");
      throw new YardageBookError(
        "No hay sesiones válidas para crear el YardageBook",
        "NO_VALID_SESSIONS",
        { selectedSessions }
      );
    }

    console.log(
      "Sesiones proporcionadas directamente. Número de sesiones:",
      selectedSessions.length
    );
    console.log("Sesiones seleccionadas:", selectedSessions.length);
    selectedSessions.forEach((session, index) => {
      console.log(`Sesión ${index}:`, {
        fecha: session.fecha,
        totalTiros: session.datos?.length || 0,
        tirosSeleccionados:
          session.datos?.filter((t) => t.selected !== false)?.length || 0,
      });
    });

    // 3. Procesar sesiones con validación mejorada
    const processedSessions = selectedSessions.map((session, index) => {
      console.log(`Procesando sesión ${index}...`);
      const result = procesarSesionMejorada(session, index);
      console.log(`Resultado de procesar sesión ${index}:`, {
        tirosProcesados: result.shots.length,
        tirosValidos: result.validShots,
        tirosRechazados: result.rejectedShots,
        primerTiro: result.shots[0] || null,
      });
      return result;
    });

    // 4. Filtrar sesiones válidas
    const validSessions = processedSessions.filter(
      (session) => session.shots.length > 0
    );
    console.log(
      "Sesiones válidas después del procesamiento:",
      validSessions.length
    );

    if (validSessions.length === 0) {
      console.error("No se encontraron sesiones válidas. Detalles:", {
        totalSesiones: processedSessions.length,
        sesionesConTiros: processedSessions.filter((s) => s.shots.length > 0)
          .length,
        detallesPorSesion: processedSessions.map((s, i) => ({
          sesion: i,
          tirosProcesados: s.shots.length,
          tirosValidos: s.validShots,
          tirosRechazados: s.rejectedShots,
          primerTiro: s.shots[0] || null,
        })),
      });
      throw new YardageBookError(
        "No hay tiros válidos en las sesiones seleccionadas",
        "NO_VALID_SHOTS",
        { processedSessions }
      );
    }

    // 5. Agrupar tiros por palo
    const shotsByClub = agruparTirosPorPalo(validSessions);
    console.log(
      "Tiros agrupados por palo:",
      Object.keys(shotsByClub).length,
      "palos"
    );
    Object.entries(shotsByClub).forEach(([club, shots]) => {
      console.log(`Palo ${club}:`, {
        numeroTiros: shots.length,
        primerTiro: shots[0] || null,
      });
    });

    // 6. Calcular estadísticas con configuración personalizada
    const clubStats = {};
    Object.keys(shotsByClub).forEach((club) => {
      clubStats[club] = calcularEstadisticasClubMejoradas(
        shotsByClub[club],
        deviationPercentage,
        lateralPercentage
      );
      console.log(`Estadísticas para ${club}:`, clubStats[club]);
    });

    // 7. Ajustar dispersión por categorías
    Object.values(CLUB_CATEGORIES).forEach((category) => {
      console.log("Ajustando dispersión para categoría:", category);
      ajustarDispersion(clubStats, category);
    });

    // 8. Eliminar putter y generar PDF
    delete clubStats.Putt;
    console.log(
      "Generando PDF con estadísticas finales:",
      Object.keys(clubStats).length,
      "palos"
    );

    await rellenarPDF2(
      clubStats,
      ORDERED_CLUBS,
      deviationPercentage,
      lateralPercentage,
      "YardageBook"
    );

    return validSessions;
  } catch (error) {
    console.error("Error detallado al crear el YardageBook:", error);
    if (error instanceof YardageBookError) {
      throw error;
    } else {
      throw new YardageBookError(error.message, "UNKNOWN_ERROR", {
        originalError: error,
      });
    }
  }
}

// Función mejorada para procesar sesiones
function procesarSesionMejorada(session, sessionIndex) {
  try {
    // Filtrar tiros que no estén explícitamente deseleccionados
    const selectedShots = session.datos.filter(
      (shot) => shot.selected !== false
    );

    console.log(`Sesión ${sessionIndex}:`, {
      totalTiros: session.datos.length,
      tirosSeleccionados: selectedShots.length,
      primerTiro: selectedShots[0] || null,
    });

    if (selectedShots.length === 0) {
      console.warn(`No hay tiros seleccionados en la sesión ${sessionIndex}`);
      return { shots: [], validShots: 0, rejectedShots: 0 };
    }

    // Procesar los tiros seleccionados con validación mejorada
    let validShots = 0;
    let rejectedShots = 0;

    const shots = selectedShots
      .map((shot) => {
        // Validar datos del tiro
        const validation = validateShotData(shot);

        if (!validation.isValid) {
          console.warn("Tiro rechazado por errores críticos:", {
            shot,
            errors: validation.errors,
          });
          rejectedShots++;
          return null;
        }

        if (validation.warnings.length > 0) {
          console.warn("Tiro con advertencias:", {
            shot,
            warnings: validation.warnings,
            score: validation.score,
          });
        }

        // Verificar que el tiro tenga los datos necesarios
        if (
          !shot["club name"] ||
          !shot["carry (yds)"] ||
          !shot["side spin (rpm l-/r+)"]
        ) {
          console.warn("Tiro sin datos necesarios:", shot);
          rejectedShots++;
          return null;
        }

        // Convertir valores a números y verificar que sean válidos
        const carry = parseFloat(shot["carry (yds)"]);
        const sideSpin = parseFloat(shot["side spin (rpm l-/r+)"]);
        const backSpin = parseFloat(shot["back spin (rpm)"]);

        if (isNaN(carry) || isNaN(sideSpin) || isNaN(backSpin)) {
          console.warn("Tiro con valores numéricos inválidos:", shot);
          rejectedShots++;
          return null;
        }

        validShots++;

        // Debug: Imprimir todos los campos disponibles del tiro
        console.log("🔍 Campos disponibles en el tiro:", Object.keys(shot));

        // Mapear los datos del tiro
        return {
          club: shot["club name"],
          carry: carry,
          totalDistance: parseFloat(shot["total distance (yds)"]) || carry,
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
          qualityScore: validation.score,
        };
      })
      .filter((shot) => shot !== null);

    if (shots.length === 0) {
      console.warn(
        `No se encontraron tiros válidos en la sesión ${sessionIndex}`
      );
    } else {
      console.log(`Sesión ${sessionIndex} procesada exitosamente:`, {
        tirosProcesados: shots.length,
        tirosValidos: validShots,
        tirosRechazados: rejectedShots,
        palos: [...new Set(shots.map((s) => s.club))],
      });
    }

    return { shots, validShots, rejectedShots };
  } catch (error) {
    console.error(`Error al procesar sesión ${sessionIndex}:`, error);
    return { shots: [], validShots: 0, rejectedShots: 0 };
  }
}

// Función mejorada para calcular estadísticas
function calcularEstadisticasClubMejoradas(
  shots,
  deviationPercentage = 0.75,
  lateralPerc = 0.75
) {
  let carryValues,
    variation = "-",
    maxRight = 0,
    maxLeft = 0,
    confidence = 0;

  if (shots.length === 1) {
    carryValues = shots.map((s) => s.carry);
    confidence = 30; // Baja confianza con un solo tiro
  } else if (shots.length >= 5) {
    const avgCarry = shots.reduce((sum, s) => sum + s.carry, 0) / shots.length;
    const closestShots = shots.sort(
      (a, b) => Math.abs(a.carry - avgCarry) - Math.abs(b.carry - avgCarry)
    );
    const limit = Math.floor(shots.length * deviationPercentage);
    carryValues = closestShots.slice(0, limit).map((s) => s.carry);
    confidence = Math.min(95, 50 + shots.length * 2); // Confianza basada en número de tiros
  } else {
    carryValues = shots.map((s) => s.carry);
    confidence = Math.min(80, 40 + shots.length * 10);
  }

  if (shots.length > 1) {
    const avgCarry =
      carryValues.reduce((sum, val) => sum + val, 0) / carryValues.length;
    const minCarry = Math.min(...carryValues);
    const maxCarry = Math.max(...carryValues);
    variation = `±${((maxCarry - minCarry) / 2).toFixed(0)}`;

    // Cálculo mejorado de dispersión lateral
    console.log("🎯 Calculando dispersión lateral para palo:", shots[0]?.club);
    console.log("📊 Total de tiros:", shots.length);

    // Debug: Mostrar todos los datos de los tiros
    shots.forEach((shot, index) => {
      console.log(`Tiro ${index + 1}:`, {
        carry: shot.carry,
        offline: shot.offline,
        club: shot.club,
        rawData: shot,
      });
    });

    const offlineValues = shots.map((s) => s.offline).sort((a, b) => a - b);
    console.log("📊 Valores offline ordenados:", offlineValues);

    const lateralLimit = Math.floor(offlineValues.length * lateralPerc);
    const selectedOffline = shots
      .map((s) => s.offline)
      .sort((a, b) => Math.abs(a) - Math.abs(b))
      .slice(0, lateralLimit);

    console.log("📋 Valores offline seleccionados:", selectedOffline);
    console.log("📋 Límite lateral:", lateralLimit, "de", offlineValues.length);

    // Verificar si hay valores no-cero
    const nonZeroValues = selectedOffline.filter((val) => val !== 0);
    console.log("📊 Valores no-cero:", nonZeroValues);

    if (selectedOffline.length === 0) {
      console.error("❌ No hay valores offline para calcular");
      maxLeft = "0";
      maxRight = "0";
    } else {
      maxLeft = Math.abs(Math.min(...selectedOffline)).toFixed(0);
      maxRight = Math.max(...selectedOffline).toFixed(0);
      if (maxRight < 0) maxRight = 0;
    }

    console.log("🎯 Resultados finales de dispersión:", {
      maxLeft,
      maxRight,
      totalShots: shots.length,
      lateralPercentage: lateralPerc,
      hasNonZeroValues: nonZeroValues.length > 0,
    });
  }

  return {
    avgCarry:
      carryValues.reduce((sum, val) => sum + val, 0) / carryValues.length,
    maxLeft,
    maxRight,
    variation,
    confidence,
    totalShots: shots.length,
  };
}

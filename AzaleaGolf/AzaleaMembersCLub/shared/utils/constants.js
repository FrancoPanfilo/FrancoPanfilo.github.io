// Colores para los palos en gráficos
export const clubColors = [
  "#FF6B6B", // Rojo
  "#4ECDC4", // Turquesa
  "#45B7D1", // Azul claro
  "#96CEB4", // Verde claro
  "#FFEAA7", // Amarillo
  "#DDA0DD", // Ciruela
  "#98D8C8", // Verde azulado
  "#F7DC6F", // Amarillo dorado
  "#BB8FCE", // Violeta claro
  "#85C1E9", // Azul cielo
  "#F8C471", // Naranja claro
  "#82E0AA", // Verde lima
  "#F1948A", // Rosa salmón
  "#85C1E9", // Azul claro
  "#D7BDE2", // Lavanda
  "#FAD7A0", // Melocotón
  "#A9DFBF", // Verde menta
  "#F9E79F", // Amarillo crema
  "#D5A6BD", // Rosa pálido
  "#A3E4D7", // Verde agua
];

// Constantes de golf
export const GOLF_CONSTANTS = {
  CLUBS: {
    DRIVER: {
      name: "Driver",
      shortName: "Dr",
      typicalDistance: { min: 200, max: 300 },
      typicalAccuracy: 0.6,
    },
    WOOD_1: {
      name: "Madera 1",
      shortName: "1w",
      typicalDistance: { min: 180, max: 250 },
      typicalAccuracy: 0.65,
    },
    WOOD_3: {
      name: "Madera 3",
      shortName: "3w",
      typicalDistance: { min: 160, max: 220 },
      typicalAccuracy: 0.7,
    },
    WOOD_5: {
      name: "Madera 5",
      shortName: "5w",
      typicalDistance: { min: 140, max: 200 },
      typicalAccuracy: 0.75,
    },
    HYBRID_1: {
      name: "Híbrido 1",
      shortName: "1h",
      typicalDistance: { min: 160, max: 200 },
      typicalAccuracy: 0.75,
    },
    HYBRID_2: {
      name: "Híbrido 2",
      shortName: "2h",
      typicalDistance: { min: 150, max: 190 },
      typicalAccuracy: 0.8,
    },
    IRON_1: {
      name: "Hierro 1",
      shortName: "1i",
      typicalDistance: { min: 160, max: 190 },
      typicalAccuracy: 0.8,
    },
    IRON_2: {
      name: "Hierro 2",
      shortName: "2i",
      typicalDistance: { min: 150, max: 180 },
      typicalAccuracy: 0.8,
    },
    IRON_3: {
      name: "Hierro 3",
      shortName: "3i",
      typicalDistance: { min: 140, max: 170 },
      typicalAccuracy: 0.8,
    },
    IRON_4: {
      name: "Hierro 4",
      shortName: "4i",
      typicalDistance: { min: 130, max: 160 },
      typicalAccuracy: 0.8,
    },
    IRON_5: {
      name: "Hierro 5",
      shortName: "5i",
      typicalDistance: { min: 120, max: 150 },
      typicalAccuracy: 0.8,
    },
    IRON_6: {
      name: "Hierro 6",
      shortName: "6i",
      typicalDistance: { min: 110, max: 140 },
      typicalAccuracy: 0.8,
    },
    IRON_7: {
      name: "Hierro 7",
      shortName: "7i",
      typicalDistance: { min: 100, max: 130 },
      typicalAccuracy: 0.8,
    },
    IRON_8: {
      name: "Hierro 8",
      shortName: "8i",
      typicalDistance: { min: 90, max: 120 },
      typicalAccuracy: 0.8,
    },
    IRON_9: {
      name: "Hierro 9",
      shortName: "9i",
      typicalDistance: { min: 80, max: 110 },
      typicalAccuracy: 0.8,
    },
    PITCHING_WEDGE: {
      name: "Pitching Wedge",
      shortName: "PW",
      typicalDistance: { min: 70, max: 100 },
      typicalAccuracy: 0.85,
    },
    GAP_WEDGE: {
      name: "Gap Wedge",
      shortName: "GW",
      typicalDistance: { min: 60, max: 90 },
      typicalAccuracy: 0.85,
    },
    SAND_WEDGE: {
      name: "Sand Wedge",
      shortName: "SW",
      typicalDistance: { min: 50, max: 80 },
      typicalAccuracy: 0.85,
    },
    LOB_WEDGE: {
      name: "Lob Wedge",
      shortName: "LW",
      typicalDistance: { min: 40, max: 70 },
      typicalAccuracy: 0.85,
    },
    PUTTER: {
      name: "Warm Up",
      shortName: "Putter",
      typicalDistance: { min: 0, max: 10 },
      typicalAccuracy: 0.95,
    },
  },

  METRICS: {
    BALL_SPEED: { min: 50, max: 200, unit: "mph" },
    LAUNCH_ANGLE: { min: 0, max: 90, unit: "deg" },
    BACK_SPIN: { min: 0, max: 10000, unit: "rpm" },
    SIDE_SPIN: { min: -5000, max: 5000, unit: "rpm" },
    CARRY: { min: 0, max: 400, unit: "yds" },
    TOTAL_DISTANCE: { min: 0, max: 500, unit: "yds" },
    PEAK_HEIGHT: { min: 0, max: 200, unit: "yds" },
    DESCENT_ANGLE: { min: 0, max: 90, unit: "deg" },
    CLUB_SPEED: { min: 30, max: 150, unit: "mph" },
    EFFICIENCY: { min: 0, max: 2, unit: "" },
    ANGLE_OF_ATTACK: { min: -20, max: 20, unit: "deg" },
    CLUB_PATH: { min: -20, max: 20, unit: "deg" },
  },

  YARDAGE_RANGES: [
    { min: 0, max: 50, label: "0-50 yardas" },
    { min: 50, max: 100, label: "50-100 yardas" },
    { min: 100, max: 150, label: "100-150 yardas" },
    { min: 150, max: 200, label: "150-200 yardas" },
    { min: 200, max: 250, label: "200-250 yardas" },
    { min: 250, max: 300, label: "250-300 yardas" },
    { min: 300, max: 350, label: "300+ yardas" },
  ],
};

// Rangos de handicap para comparación
export const HANDICAP_RANGES = [
  { id: "0-5", label: "Scratch (0-5)", min: 0, max: 5 },
  { id: "6-10", label: "Bajo (6-10)", min: 6, max: 10 },
  { id: "11-15", label: "Medio-Bajo (11-15)", min: 11, max: 15 },
  { id: "16-20", label: "Medio (16-20)", min: 16, max: 20 },
  { id: "21-25", label: "Medio-Alto (21-25)", min: 21, max: 25 },
  { id: "26-30", label: "Alto (26-30)", min: 26, max: 30 },
  { id: "31-35", label: "Alto+ (31-35)", min: 31, max: 35 },
  { id: "36-40", label: "Principiante (36-40)", min: 36, max: 40 },
  { id: "41-45", label: "Principiante+ (41-45)", min: 41, max: 45 },
  { id: "46-50", label: "Iniciación (46-50)", min: 46, max: 50 },
  { id: "51+", label: "Nuevo (51+)", min: 51, max: 54 },
];

// Métricas para comparación de handicap
export const COMPARISON_METRICS = [
  {
    key: "club speed (mph)",
    label: "Velocidad de Palo",
    unit: "mph",
    icon: "fa-gauge-high",
  },
  {
    key: "angle of attack (deg)",
    label: "Ángulo de Ataque",
    unit: "°",
    icon: "fa-arrow-down",
  },
  {
    key: "club path (deg out-in-/in-out+)",
    label: "Club Path",
    unit: "°",
    icon: "fa-route",
  },
];

// Obtener el rango de handicap para un valor dado
export function getHandicapRange(handicap) {
  if (handicap === null || handicap === undefined) return null;
  return HANDICAP_RANGES.find((r) => handicap >= r.min && handicap <= r.max);
}

// Validar valor de handicap
export function validateHandicap(value) {
  const num = parseFloat(value);
  if (isNaN(num)) return { valid: false, message: "Debe ser un número" };
  if (num < 0 || num > 54)
    return { valid: false, message: "Debe estar entre 0 y 54" };
  return { valid: true, value: Math.round(num * 10) / 10 };
}

// Formatear handicap para mostrar
export function formatHandicap(handicap) {
  if (handicap === null || handicap === undefined) return "No establecido";
  return handicap.toFixed(1);
}

// Funciones helper
export function formatClubName(clubCode, short = false) {
  if (!clubCode || typeof clubCode !== "string") {
    return clubCode || "Unknown";
  }

  const club = GOLF_CONSTANTS.CLUBS[clubCode.toUpperCase()];
  if (club) {
    return short ? club.shortName : club.name;
  }
  return clubCode;
}

export function getClubColor(clubCode) {
  const clubIndex = Object.keys(GOLF_CONSTANTS.CLUBS).indexOf(
    clubCode.toUpperCase()
  );
  return clubColors[clubIndex % clubColors.length];
}

// Club order hierarchy for sorting
export function getClubOrder(clubName) {
  const clubHierarchy = {
    Dr: 1,
    "1w": 2,
    "2w": 3,
    "3w": 4,
    "4w": 5,
    "5w": 6,
    "6w": 7,
    "7w": 8,
    "8w": 9,
    "9w": 10,
    "1h": 11,
    "2h": 12,
    "3h": 13,
    "4h": 14,
    "5h": 15,
    "6h": 16,
    "7h": 17,
    "8h": 18,
    "1i": 19,
    "2i": 20,
    "3i": 21,
    "4i": 22,
    "5i": 23,
    "6i": 24,
    "7i": 25,
    "8i": 26,
    "9i": 27,
    PW: 28,
    GW: 29,
    SW: 30,
    LW: 31,
    47: 32,
    48: 33,
    49: 34,
    50: 35,
    51: 36,
    52: 37,
    53: 38,
    54: 39,
    55: 40,
    56: 41,
    57: 42,
    58: 43,
    59: 44,
    60: 45,
    61: 46,
    62: 47,
    63: 48,
    64: 49,
    Putter: 1000,
  };
  return clubHierarchy[clubName] || 999;
}

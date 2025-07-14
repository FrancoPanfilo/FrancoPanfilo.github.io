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

// Enumeraciones
export const ENUMS = {
  AUTH_STATE: {
    UNKNOWN: "unknown",
    AUTHENTICATED: "authenticated",
    UNAUTHENTICATED: "unauthenticated",
    LOADING: "loading",
  },

  USER_ROLE: {
    PLAYER: "player",
    COACH: "coach",
    ADMIN: "admin",
  },

  SESSION_STATUS: {
    ACTIVE: "active",
    COMPLETED: "completed",
    CANCELLED: "cancelled",
  },

  EXPORT_TYPE: {
    PDF: "pdf",
    CSV: "csv",
    EXCEL: "excel",
  },

  LOADING_STATE: {
    IDLE: "idle",
    LOADING: "loading",
    SUCCESS: "success",
    ERROR: "error",
  },

  NOTIFICATION_TYPE: {
    SUCCESS: "success",
    ERROR: "error",
    WARNING: "warning",
    INFO: "info",
  },

  SORT_DIRECTION: {
    ASC: "asc",
    DESC: "desc",
  },

  VIEW_TYPE: {
    TABLE: "table",
    GRID: "grid",
    CHART: "chart",
    MAP: "map",
  },
};

// Configuración de columnas de datos
export const DATA_COLUMNS = {
  FIXED: [
    "ball speed (mph)",
    "launch angle (deg)",
    "back spin (rpm)",
    "side spin (rpm l-/r+)",
    "carry (yds)",
    "total distance (yds)",
    "peak height (yds)",
    "descent angle (deg)",
    "club speed (mph)",
    "efficiency",
    "angle of attack (deg)",
    "club path (deg out-in-/in-out+)",
  ],

  OPTIONAL: [
    "club name",
    "shot number",
    "timestamp",
    "session id",
    "player id",
  ],

  EXPORT: {
    PDF: {
      columns: [
        "club name",
        "ball speed (mph)",
        "launch angle (deg)",
        "carry (yds)",
        "total distance (yds)",
        "efficiency",
      ],
      headers: [
        "Palo",
        "Velocidad de Pelota (mph)",
        "Ángulo de Lanzamiento (deg)",
        "Distancia de Vuelo (yds)",
        "Distancia Total (yds)",
        "Eficiencia",
      ],
    },
    CSV: {
      includeAll: true,
      dateFormat: "YYYY-MM-DD HH:mm:ss",
    },
  },
};

// Configuración de colores
export const COLOR_PALETTE = {
  CLUB_COLORS: [
    "#FF6B6B",
    "#4ECDC4",
    "#45B7D1",
    "#96CEB4",
    "#FFEEAD",
    "#D4A5A5",
    "#9B59B6",
    "#3498DB",
    "#E74C3C",
    "#2ECC71",
    "#F1C40F",
    "#E67E22",
    "#1ABC9C",
    "#8E44AD",
    "#C0392B",
    "#27AE60",
    "#F39C12",
    "#E74C3C",
    "#9B59B6",
    "#34495E",
  ],

  STATE_COLORS: {
    success: "#27ae60",
    error: "#e74c3c",
    warning: "#f39c12",
    info: "#3498db",
    neutral: "#95a5a6",
  },

  DISTANCE_COLORS: {
    short: "#27ae60",
    medium: "#f39c12",
    long: "#e74c3c",
  },
};

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
  return COLOR_PALETTE.CLUB_COLORS[
    clubIndex % COLOR_PALETTE.CLUB_COLORS.length
  ];
}

export function validateMetricRange(value, metric) {
  const metricConfig = GOLF_CONSTANTS.METRICS[metric.toUpperCase()];
  if (!metricConfig) return true;

  return value >= metricConfig.min && value <= metricConfig.max;
}

export function formatMetric(value, metric, decimals = 1) {
  const metricConfig = GOLF_CONSTANTS.METRICS[metric.toUpperCase()];
  if (!metricConfig) return value.toString();

  const formattedValue =
    typeof value === "number" ? value.toFixed(decimals) : value;

  return `${formattedValue} ${metricConfig.unit}`;
}

export function getDistanceRange(distance) {
  const range = GOLF_CONSTANTS.YARDAGE_RANGES.find(
    (r) => distance >= r.min && distance <= r.max
  );
  return range ? range.label : "Fuera de rango";
}

export function getDistanceColor(distance) {
  if (distance < 100) return COLOR_PALETTE.DISTANCE_COLORS.short;
  if (distance < 200) return COLOR_PALETTE.DISTANCE_COLORS.medium;
  return COLOR_PALETTE.DISTANCE_COLORS.long;
}

export function formatDate(date, format = "DD/MM/YYYY HH:mm") {
  const d = new Date(date);

  if (isNaN(d.getTime())) return "Fecha inválida";

  const day = d.getDate().toString().padStart(2, "0");
  const month = (d.getMonth() + 1).toString().padStart(2, "0");
  const year = d.getFullYear();
  const hours = d.getHours().toString().padStart(2, "0");
  const minutes = d.getMinutes().toString().padStart(2, "0");

  switch (format) {
    case "DD/MM/YYYY":
      return `${day}/${month}/${year}`;
    case "DD/MM/YYYY HH:mm":
      return `${day}/${month}/${year} ${hours}:${minutes}`;
    case "YYYY-MM-DD":
      return `${year}-${month}-${day}`;
    case "relative":
      return getRelativeTime(d);
    default:
      return `${day}/${month}/${year} ${hours}:${minutes}`;
  }
}

function getRelativeTime(date) {
  const now = new Date();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return "Hace un momento";
  if (minutes < 60) return `Hace ${minutes} minutos`;
  if (hours < 24) return `Hace ${hours} horas`;
  if (days < 7) return `Hace ${days} días`;

  return formatDate(date, "DD/MM/YYYY");
}

export function generateId(prefix = "") {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 5);
  return `${prefix}${timestamp}${random}`;
}

export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export function throttle(func, limit) {
  let inThrottle;
  return function () {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

export function deepClone(obj) {
  if (obj === null || typeof obj !== "object") return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof Array) return obj.map((item) => deepClone(item));
  if (typeof obj === "object") {
    const clonedObj = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj;
  }
}

export function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function capitalize(str) {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export function formatNumber(num, locale = "es-ES") {
  return new Intl.NumberFormat(locale).format(num);
}

export function getPercentage(value, total, decimals = 1) {
  if (total === 0) return "0%";
  const percentage = (value / total) * 100;
  return `${percentage.toFixed(decimals)}%`;
}

// Configuración de localización
export const LOCALE_CONFIG = {
  "es-ES": {
    dateFormat: "DD/MM/YYYY",
    timeFormat: "HH:mm",
    decimalSeparator: ",",
    thousandsSeparator: ".",
    currency: "EUR",
    language: "Español",
  },
  "en-US": {
    dateFormat: "MM/DD/YYYY",
    timeFormat: "HH:mm",
    decimalSeparator: ".",
    thousandsSeparator: ",",
    currency: "USD",
    language: "English",
  },
};

// Configuración de exportación
export const EXPORT_CONFIG = {
  PDF: {
    pageSize: "A4",
    orientation: "portrait",
    margins: {
      top: 20,
      bottom: 20,
      left: 20,
      right: 20,
    },
    fontSize: 10,
    headerFontSize: 12,
    titleFontSize: 16,
  },
  CSV: {
    delimiter: ",",
    encoding: "UTF-8",
    includeHeaders: true,
    dateFormat: "YYYY-MM-DD HH:mm:ss",
  },
};

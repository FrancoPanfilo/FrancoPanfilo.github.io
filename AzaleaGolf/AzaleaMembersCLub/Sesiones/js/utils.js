// Funciones de utilidad para el manejo de datos de golf

/**
 * Formatea el nombre del palo para mostrar
 * @param {string} clubName - Nombre del palo
 * @param {boolean} short - Si es true, devuelve versión corta
 * @returns {string} Nombre formateado del palo
 */
export function formatClubName(clubName, short = false) {
  if (!clubName) return "Desconocido";

  const clubMap = {
    Dr: "Driver",
    "2w": "Madera 2",
    "3w": "Madera 3",
    "4w": "Madera 4",
    "5w": "Madera 5",
    "6w": "Madera 6",
    "7w": "Madera 7",
    "9w": "Madera 9",
    "2h": "Híbrido 2",
    "3h": "Híbrido 3",
    "4h": "Híbrido 4",
    "5h": "Híbrido 5",
    "6h": "Híbrido 6",
    "7h": "Híbrido 7",
    "1i": "Hierro 1",
    "2i": "Hierro 2",
    "3i": "Hierro 3",
    "4i": "Hierro 4",
    "5i": "Hierro 5",
    "6i": "Hierro 6",
    "7i": "Hierro 7",
    "8i": "Hierro 8",
    "9i": "Hierro 9",
    PW: "Pitching Wedge",
    GW: "Gap Wedge",
    SW: "Sand Wedge",
    LW: "Lob Wedge",
    50: "50°",
    52: "52°",
    54: "54°",
    56: "56°",
    58: "58°",
    60: "60°",
    62: "62°",
    64: "64°",
    Putt: "Putter",
  };

  const shortMap = {
    Dr: "Dr",
    "2w": "2W",
    "3w": "3W",
    "4w": "4W",
    "5w": "5W",
    "6w": "6W",
    "7w": "7W",
    "9w": "9W",
    "2h": "2H",
    "3h": "3H",
    "4h": "4H",
    "5h": "5H",
    "6h": "6H",
    "7h": "7H",
    "1i": "1i",
    "2i": "2i",
    "3i": "3i",
    "4i": "4i",
    "5i": "5i",
    "6i": "6i",
    "7i": "7i",
    "8i": "8i",
    "9i": "9i",
    PW: "PW",
    GW: "GW",
    SW: "SW",
    LW: "LW",
    50: "50°",
    52: "52°",
    54: "54°",
    56: "56°",
    58: "58°",
    60: "60°",
    62: "62°",
    64: "64°",
    Putt: "Putt",
  };

  return short ? shortMap[clubName] || clubName : clubMap[clubName] || clubName;
}

/**
 * Formatea el nombre de una columna para mostrar
 * @param {string} columnName - Nombre de la columna
 * @returns {string} Nombre formateado de la columna
 */
export function formatColumnName(columnName) {
  const columnMap = {
    "club speed": "Velocidad del Palo",
    "ball speed": "Velocidad de la Bola",
    "smash factor": "Factor de Impacto",
    "spin rate": "Tasa de Spin",
    carry: "Carry",
    total: "Total",
    height: "Altura",
    "landing angle": "Ángulo de Aterrizaje",
    side: "Lateral",
    "side angle": "Ángulo Lateral",
    "club path": "Trayectoria del Palo",
    "face angle": "Ángulo de la Cara",
    "face to path": "Cara a Trayectoria",
    "attack angle": "Ángulo de Ataque",
    loft: "Loft",
    "dynamic loft": "Loft Dinámico",
    "spin loft": "Loft de Spin",
    "spin axis": "Eje de Spin",
    "launch direction": "Dirección de Lanzamiento",
    "launch angle": "Ángulo de Lanzamiento",
  };

  return columnMap[columnName] || columnName;
}

/**
 * Formatea un valor para mostrar en la tabla
 * @param {number} value - Valor a formatear
 * @param {string} column - Nombre de la columna
 * @returns {string} Valor formateado
 */
export function formatValue(value, column) {
  if (value === null || value === undefined || isNaN(value)) {
    return "-";
  }

  // Formatear según el tipo de columna
  if (column.includes("speed")) {
    return value.toFixed(1) + " mph";
  } else if (column.includes("angle") || column.includes("path")) {
    return value.toFixed(1) + "°";
  } else if (column.includes("spin")) {
    return Math.round(value).toLocaleString() + " rpm";
  } else if (
    column.includes("carry") ||
    column.includes("total") ||
    column.includes("height")
  ) {
    return Math.round(value) + " yd";
  } else if (column.includes("smash")) {
    return value.toFixed(2);
  } else {
    return value.toFixed(1);
  }
}

/**
 * Obtiene el orden de los palos para ordenamiento
 * @param {string} clubName - Nombre del palo
 * @returns {number} Orden del palo
 */
export function getClubOrder(clubName) {
  const orderMap = {
    Dr: 1,
    "2w": 2,
    "3w": 3,
    "4w": 4,
    "5w": 5,
    "6w": 6,
    "7w": 7,
    "9w": 8,
    "2h": 9,
    "3h": 10,
    "4h": 11,
    "5h": 12,
    "6h": 13,
    "7h": 14,
    "1i": 15,
    "2i": 16,
    "3i": 17,
    "4i": 18,
    "5i": 19,
    "6i": 20,
    "7i": 21,
    "8i": 22,
    "9i": 23,
    PW: 24,
    GW: 25,
    SW: 26,
    LW: 27,
    50: 28,
    52: 29,
    54: 30,
    56: 31,
    58: 32,
    60: 33,
    62: 34,
    64: 35,
    Putt: 36,
  };

  return orderMap[clubName] || 999;
}

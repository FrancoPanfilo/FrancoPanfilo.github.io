// Funciones de estadísticas para el análisis de datos de golf

/**
 * Calcula los promedios de un palo específico
 * @param {string} club - Nombre del palo
 * @param {Array} shots - Array de tiros del palo
 * @returns {Object} Objeto con los promedios calculados
 */
export function calculateClubAverages(club, shots) {
  if (!shots || shots.length === 0) {
    return {};
  }

  const averages = {};
  const columns = [
    "club speed",
    "ball speed",
    "smash factor",
    "spin rate",
    "carry",
    "total",
    "height",
    "landing angle",
    "side",
    "side angle",
    "club path",
    "face angle",
    "face to path",
    "attack angle",
    "loft",
    "dynamic loft",
    "spin loft",
    "spin axis",
    "launch direction",
    "launch angle",
  ];

  columns.forEach((column) => {
    const values = shots
      .map((shot) => parseFloat(shot[column]))
      .filter((val) => !isNaN(val) && val !== null && val !== undefined);

    if (values.length > 0) {
      const sum = values.reduce((acc, val) => acc + val, 0);
      averages[column] = sum / values.length;
    } else {
      averages[column] = null;
    }
  });

  return averages;
}

/**
 * Calcula estadísticas descriptivas para un conjunto de tiros
 * @param {Array} shots - Array de tiros
 * @param {string} column - Columna a analizar
 * @returns {Object} Estadísticas descriptivas
 */
export function calculateDescriptiveStats(shots, column) {
  if (!shots || shots.length === 0) {
    return {
      count: 0,
      mean: null,
      median: null,
      min: null,
      max: null,
      stdDev: null,
    };
  }

  const values = shots
    .map((shot) => parseFloat(shot[column]))
    .filter((val) => !isNaN(val) && val !== null && val !== undefined)
    .sort((a, b) => a - b);

  if (values.length === 0) {
    return {
      count: 0,
      mean: null,
      median: null,
      min: null,
      max: null,
      stdDev: null,
    };
  }

  const count = values.length;
  const sum = values.reduce((acc, val) => acc + val, 0);
  const mean = sum / count;
  const min = values[0];
  const max = values[count - 1];

  // Calcular mediana
  let median;
  if (count % 2 === 0) {
    median = (values[count / 2 - 1] + values[count / 2]) / 2;
  } else {
    median = values[Math.floor(count / 2)];
  }

  // Calcular desviación estándar
  const variance =
    values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / count;
  const stdDev = Math.sqrt(variance);

  return {
    count,
    mean,
    median,
    min,
    max,
    stdDev,
  };
}

/**
 * Calcula la consistencia de un palo basado en la desviación estándar
 * @param {Array} shots - Array de tiros del palo
 * @param {string} column - Columna a analizar (por defecto 'carry')
 * @returns {Object} Información de consistencia
 */
export function calculateConsistency(shots, column = "carry") {
  const stats = calculateDescriptiveStats(shots, column);

  if (stats.count === 0) {
    return {
      consistency: 0,
      rating: "Sin datos",
      description: "No hay suficientes datos para calcular la consistencia",
    };
  }

  // Calcular coeficiente de variación (CV = stdDev / mean)
  const cv = stats.stdDev / stats.mean;

  // Convertir CV a porcentaje de consistencia (0-100)
  // CV más bajo = mayor consistencia
  const consistency = Math.max(0, 100 - cv * 100);

  let rating, description;
  if (consistency >= 90) {
    rating = "Excelente";
    description = "Muy consistente";
  } else if (consistency >= 80) {
    rating = "Buena";
    description = "Consistente";
  } else if (consistency >= 70) {
    rating = "Regular";
    description = "Moderadamente consistente";
  } else if (consistency >= 60) {
    rating = "Baja";
    description = "Poco consistente";
  } else {
    rating = "Muy Baja";
    description = "Muy poco consistente";
  }

  return {
    consistency: Math.round(consistency),
    rating,
    description,
    stats,
  };
}

/**
 * Calcula el rango de dispersión de un palo
 * @param {Array} shots - Array de tiros del palo
 * @returns {Object} Información de dispersión
 */
export function calculateDispersion(shots) {
  if (!shots || shots.length === 0) {
    return {
      carryRange: 0,
      sideRange: 0,
      totalRange: 0,
    };
  }

  const carryValues = shots
    .map((shot) => parseFloat(shot.carry))
    .filter((val) => !isNaN(val));

  const sideValues = shots
    .map((shot) => parseFloat(shot.side))
    .filter((val) => !isNaN(val));

  const totalValues = shots
    .map((shot) => parseFloat(shot.total))
    .filter((val) => !isNaN(val));

  return {
    carryRange:
      carryValues.length > 0
        ? Math.max(...carryValues) - Math.min(...carryValues)
        : 0,
    sideRange:
      sideValues.length > 0
        ? Math.max(...sideValues) - Math.min(...sideValues)
        : 0,
    totalRange:
      totalValues.length > 0
        ? Math.max(...totalValues) - Math.min(...totalValues)
        : 0,
  };
}

/**
 * Calcula el rendimiento general de un palo
 * @param {Array} shots - Array de tiros del palo
 * @returns {Object} Información de rendimiento
 */
export function calculatePerformance(shots) {
  if (!shots || shots.length === 0) {
    return {
      score: 0,
      rating: "Sin datos",
      description: "No hay suficientes datos para calcular el rendimiento",
    };
  }

  const carryConsistency = calculateConsistency(shots, "carry");
  const sideConsistency = calculateConsistency(shots, "side");
  const smashStats = calculateDescriptiveStats(shots, "smash factor");

  // Calcular puntuación basada en múltiples factores
  let score = 0;

  // Consistencia de carry (40% del puntaje)
  score += carryConsistency.consistency * 0.4;

  // Consistencia lateral (30% del puntaje)
  score += sideConsistency.consistency * 0.3;

  // Factor de impacto promedio (20% del puntaje)
  if (smashStats.mean) {
    const smashScore = Math.min(100, (smashStats.mean / 1.5) * 100);
    score += smashScore * 0.2;
  }

  // Número de tiros (10% del puntaje)
  const shotCountScore = Math.min(100, shots.length * 10);
  score += shotCountScore * 0.1;

  score = Math.round(score);

  let rating, description;
  if (score >= 90) {
    rating = "Excelente";
    description = "Rendimiento sobresaliente";
  } else if (score >= 80) {
    rating = "Muy Bueno";
    description = "Rendimiento muy bueno";
  } else if (score >= 70) {
    rating = "Bueno";
    description = "Rendimiento bueno";
  } else if (score >= 60) {
    rating = "Regular";
    description = "Rendimiento regular";
  } else if (score >= 50) {
    rating = "Necesita Mejora";
    description = "Necesita mejorar";
  } else {
    rating = "Requiere Atención";
    description = "Requiere atención inmediata";
  }

  return {
    score,
    rating,
    description,
    carryConsistency,
    sideConsistency,
    smashStats,
  };
}

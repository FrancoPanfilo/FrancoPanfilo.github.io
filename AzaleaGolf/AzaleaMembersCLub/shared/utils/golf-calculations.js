/**
 * Golf Calculations Module
 * Funciones compartidas para cálculos de golf
 * Utilizadas por heatmap.js y pdfExport.js
 */

/**
 * Calcula el offline carry (desviación lateral en el carry)
 * @param {Object} row - Fila de datos del tiro
 * @returns {number} - Desviación lateral calculada
 */
export function calculateOfflineCarry(row) {
  const pushPullDeg = parseFloat(row["push/pull (deg l-/r+)"]) || 0;
  const carryYds = parseFloat(row["carry (yds)"]) || 0;
  const sideSpinRpm = parseFloat(row["side spin (rpm l-/r+)"]) || 0;
  const offlineTotal = parseFloat(row["offline (yds l-/r+)"]) || 0;

  // Validar datos
  if (
    Math.abs(pushPullDeg) > 45 ||
    Math.abs(sideSpinRpm) > 5000 ||
    carryYds < 0 ||
    Math.abs(offlineTotal) > 100
  ) {
    return 0;
  }

  // Desviación inicial por push/pull
  const initialOffline = Math.tan((pushPullDeg * Math.PI) / 180) * carryYds;

  // Curvatura por side spin (1.5 yds por 1000 RPM por 50 yds de carry)
  const curvature = (sideSpinRpm / 1000) * 1.5 * (carryYds / 50);

  // Término de corrección basado en offline total
  const offlineCorrection = 0.2 * offlineTotal;

  return (initialOffline + curvature + offlineCorrection).toFixed(2);
}

/**
 * Calcula los parámetros de una elipse para un conjunto de datos
 * Utilizado para visualizar la dispersión de tiros
 * @param {Array} data - Array de puntos {x, y}
 * @returns {Object|null} - Parámetros de la elipse o null si no hay suficientes datos
 */
export function calculateEllipseParams(data) {
  if (data.length < 2) return null;

  // Calcular promedios (centro de la elipse)
  const meanX = data.reduce((sum, d) => sum + d.x, 0) / data.length;
  const meanY = data.reduce((sum, d) => sum + d.y, 0) / data.length;

  // Calcular matriz de covarianza
  const varianceX =
    data.reduce((sum, d) => sum + Math.pow(d.x - meanX, 2), 0) / data.length;
  const varianceY =
    data.reduce((sum, d) => sum + Math.pow(d.y - meanY, 2), 0) / data.length;
  const covarianceXY =
    data.reduce((sum, d) => sum + (d.x - meanX) * (d.y - meanY), 0) /
    data.length;

  // Calcular valores propios para los radios
  const a = varianceX + varianceY;
  const b = Math.sqrt(
    Math.pow(varianceX - varianceY, 2) + 4 * Math.pow(covarianceXY, 2)
  );
  const lambda1 = (a + b) / 2;
  const lambda2 = (a - b) / 2;

  // Radios: 2 * raíces de los valores propios (~95% de los puntos)
  const radiusX = Math.max(Math.sqrt(lambda1) * 2, 5);
  const radiusY = Math.max(Math.sqrt(lambda2) * 2, 5);

  // Calcular ángulo de rotación
  const rotation =
    -0.5 *
    Math.atan2(2 * covarianceXY, varianceX - varianceY) *
    (180 / Math.PI);

  return { x: meanX, y: meanY, radiusX, radiusY, rotation };
}

/**
 * Convierte color hexadecimal a RGB
 * @param {string} hex - Color en formato hexadecimal
 * @returns {Object} - Objeto con propiedades r, g, b
 */
export function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}

import { auth, db } from "../firebase.js";
import {
  doc as firestoreDoc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";

// Función para calcular promedios
function calculateAverages(clubData) {
  const averages = {
    ballSpeed: 0,
    launchAngle: 0,
    backSpin: 0,
    sideSpin: 0,
    carry: 0,
    totalDistance: 0,
    peakHeight: 0,
    descentAngle: 0,
    clubSpeed: 0,
    efficiency: 0,
    angleOfAttack: 0,
    clubPath: 0,
  };
  let validClubSpeedCount = 0;

  clubData.forEach((data) => {
    averages.ballSpeed += data.ballSpeed || 0;
    averages.launchAngle += data.launchAngle || 0;
    averages.backSpin += data.backSpin || 0;
    averages.sideSpin += data.sideSpin || 0;
    averages.carry += data.carry || 0;
    averages.totalDistance += data.totalDistance || 0;
    averages.peakHeight += data.peakHeight || 0;
    averages.descentAngle += data.descentAngle || 0;

    if (data.clubSpeed && !isNaN(data.clubSpeed)) {
      averages.clubSpeed += data.clubSpeed;
      averages.efficiency += data.efficiency || 0;
      averages.angleOfAttack += data.angleOfAttack || 0;
      averages.clubPath += data.clubPath || 0;
      validClubSpeedCount++;
    }
  });

  const dataLength = clubData.length;
  for (const key in averages) {
    if (
      ["clubSpeed", "efficiency", "angleOfAttack", "clubPath"].includes(key)
    ) {
      averages[key] =
        validClubSpeedCount > 0 ? averages[key] / validClubSpeedCount : "-";
    } else {
      averages[key] /= dataLength;
    }
  }

  return averages;
}

// Función para agregar contenido al PDF
async function addContentToPDF(
  pdfDoc,
  sessionData,
  nombreCompleto,
  fechaSesion
) {
  // Configurar fuentes usando fuentes web seguras disponibles en jsPDF
  pdfDoc.setFont("helvetica", "normal");
  pdfDoc.setFontSize(10);

  // Fondo rojo claro en la primera página
  pdfDoc.setFillColor(247, 221, 228);
  pdfDoc.rect(
    0,
    0,
    pdfDoc.internal.pageSize.getWidth(),
    pdfDoc.internal.pageSize.getHeight(),
    "F"
  );

  // Escribir nombre y fecha (moviendo hacia la derecha para evitar el logo)
  pdfDoc.text(nombreCompleto, pdfDoc.internal.pageSize.getWidth() - 10, 15, {
    align: "right",
  });
  pdfDoc.text(fechaSesion, pdfDoc.internal.pageSize.getWidth() - 10, 25, {
    align: "right",
  });

  // Agrupar datos por palo
  const clubsData = {};
  sessionData.forEach((shot) => {
    const clubName = shot["club name"];
    if (!clubsData[clubName]) clubsData[clubName] = [];

    // Mapear propiedades a los nombres esperados
    let cs =
      shot["club speed (mph)"] < 550
        ? parseFloat(shot["club speed (mph)"])
        : "";
    let ef = cs ? parseFloat(shot["efficiency"]) : "";
    let aa = cs ? parseFloat(shot["angle of attack (deg)"]) : "";
    let cp = cs ? parseFloat(shot["club path (deg out-in-/in-out+)"]) : "";

    clubsData[clubName].push({
      ballSpeed: parseFloat(shot["ball speed (mph)"]),
      launchAngle: parseFloat(shot["launch angle (deg)"]),
      backSpin: parseFloat(shot["back spin (rpm)"]),
      sideSpin: parseFloat(shot["side spin (rpm l-/r+)"]),
      carry: parseFloat(shot["carry (yds)"]),
      totalDistance: parseFloat(shot["total distance (yds)"]),
      peakHeight: parseFloat(shot["peak height (yds)"]) * 3,
      descentAngle: parseFloat(shot["descent angle (deg)"]),
      clubSpeed: cs,
      efficiency: ef,
      angleOfAttack: aa,
      clubPath: cp,
    });
  });

  const clubOrder = [
    "Dr",
    "2w",
    "3w",
    "4w",
    "5w",
    "7w",
    "9w",
    "1h",
    "2h",
    "3h",
    "4h",
    "5h",
    "6h",
    "7h",
    "8h",
    "9h",
    "1i",
    "2i",
    "3i",
    "4i",
    "5i",
    "6i",
    "7i",
    "8i",
    "9i",
    "PW",
    "GW",
    "SW",
    "LW",
    "50",
    "52",
    "54",
    "56",
    "58",
    "60",
    "62",
    "64",
    "Putt",
  ];

  let y = 40;

  // Texto introductorio
  pdfDoc.setFont("helvetica", "normal");
  pdfDoc.setFontSize(10);
  const texto = pdfDoc.splitTextToSize(
    `A continuación, encontrará una tabla detallada que presenta los datos clave de su sesión, incluyendo las métricas más importantes relacionadas con el rendimiento de sus tiros. Esta información está diseñada para brindarle una visión clara y comprensible de su rendimiento en el simulador. Más abajo, encontrará descripciones detalladas de cada uno de los atributos presentados en la tabla, con el fin de ayudarle a interpretar los resultados con precisión.`,
    200
  );
  pdfDoc.text(texto, 5, y);
  y += 2 + texto.length * 5;

  // Generar tablas por palo
  clubOrder.forEach((clubName) => {
    if (clubsData[clubName]) {
      const clubData = clubsData[clubName];
      const averages = calculateAverages(clubData);

      // Fondo de header según tipo de palo
      if (
        [
          "Dr",
          "2w",
          "3w",
          "4w",
          "5w",
          "7w",
          "9w",
          "1h",
          "2h",
          "3h",
          "4h",
          "5h",
          "6h",
          "7h",
          "8h",
          "9h",
        ].includes(clubName)
      ) {
        pdfDoc.setFillColor(255, 40, 0);
      } else if (
        ["PW", "1i", "2i", "3i", "4i", "5i", "6i", "7i", "8i", "9i"].includes(
          clubName
        )
      ) {
        pdfDoc.setFillColor(255, 102, 0);
      } else {
        pdfDoc.setFillColor(190, 161, 169);
      }
      pdfDoc.rect(0, y - 6.5, 210, 16, "F");

      pdfDoc.setFontSize(10);
      pdfDoc.setFont("helvetica", "bold");
      pdfDoc.setTextColor(0, 0, 0);
      let x = 5;
      const columnWidths = [15, 15, 15, 15, 15, 12, 16, 14, 15, 15, 17, 15, 15];
      const headers = [
        `\n${clubName}`,
        "Ball \nSpeed\n(mph)",
        "Launch \nAngle\n(deg)",
        "Backspin\n(rpm)",
        "Sidespin\n(rpm)",
        "Carry\n(yds)",
        "Total \nDistance\n(yds)",
        "Peak \nHeight\n(ft)",
        "Descent \nAngle\n(deg)",
        "Club \nSpeed\n(mph)",
        "Efficiency",
        "Angle of\nAttack\n(deg)",
        "Club Path\n(deg)",
      ];

      headers.forEach((header, index) => {
        if (header === `\n${clubName}`) {
          pdfDoc.setFontSize(10);
        } else {
          pdfDoc.setFontSize(8);
        }
        const headerLines = header.split("\n");
        headerLines.forEach((line, lineIndex) => {
          pdfDoc.text(line, x + columnWidths[index] / 2, y + lineIndex * 3, {
            align: "center",
          });
        });
        x += columnWidths[index];
      });

      y += 14;

      // Fila de promedios
      x = 5;
      pdfDoc.setFont("helvetica", "normal");
      pdfDoc.setFontSize(9);
      pdfDoc.setTextColor(103, 99, 140);
      let averageValues = [];
      if (averages.clubSpeed === "-") {
        averageValues = [
          `Average`,
          `${averages.ballSpeed.toFixed(1)}`,
          `${averages.launchAngle.toFixed(1)}`,
          `${averages.backSpin.toFixed(1)}`,
          `${averages.sideSpin.toFixed(1)}`,
          `${averages.carry.toFixed(1)}`,
          `${averages.totalDistance.toFixed(1)}`,
          `${averages.peakHeight.toFixed(1)}`,
          `${averages.descentAngle.toFixed(1)}`,
          `-`,
          `-`,
          `-`,
          `-`,
        ];
      } else {
        averageValues = [
          `Average`,
          `${averages.ballSpeed.toFixed(1)}`,
          `${averages.launchAngle.toFixed(1)}`,
          `${averages.backSpin.toFixed(1)}`,
          `${averages.sideSpin.toFixed(1)}`,
          `${averages.carry.toFixed(1)}`,
          `${averages.totalDistance.toFixed(1)}`,
          `${averages.peakHeight.toFixed(1)}`,
          `${averages.descentAngle.toFixed(1)}`,
          `${averages.clubSpeed.toFixed(1)}`,
          `${averages.efficiency.toFixed(2)}`,
          `${averages.angleOfAttack.toFixed(1)}`,
          `${averages.clubPath.toFixed(1)}`,
        ];
      }

      averageValues.forEach((value, index) => {
        pdfDoc.text(value, x + columnWidths[index] / 2, y, { align: "center" });
        x += columnWidths[index];
      });

      y += 7;

      // Filas de datos individuales
      clubData.forEach((shot) => {
        x = 5;
        pdfDoc.setFontSize(8);
        pdfDoc.setFont("helvetica", "normal");
        pdfDoc.setTextColor(0, 0, 0);

        const shotValues = [
          ` `,
          isNaN(shot.ballSpeed) ? "-" : `${shot.ballSpeed.toFixed(1)}`,
          isNaN(shot.launchAngle) ? "-" : `${shot.launchAngle.toFixed(1)}`,
          isNaN(shot.backSpin) ? "-" : `${shot.backSpin.toFixed(1)}`,
          isNaN(shot.sideSpin) ? "-" : `${shot.sideSpin.toFixed(1)}`,
          isNaN(shot.carry) ? "-" : `${shot.carry.toFixed(1)}`,
          isNaN(shot.totalDistance) ? "-" : `${shot.totalDistance.toFixed(1)}`,
          isNaN(shot.peakHeight) ? "-" : `${shot.peakHeight.toFixed(1)}`,
          isNaN(shot.descentAngle) ? "-" : `${shot.descentAngle.toFixed(1)}`,
          shot.clubSpeed === "" || isNaN(shot.clubSpeed)
            ? "-"
            : `${shot.clubSpeed.toFixed(1)}`,
          shot.efficiency === "" || isNaN(shot.efficiency)
            ? "-"
            : `${shot.efficiency.toFixed(2)}`,
          shot.angleOfAttack === "" || isNaN(shot.angleOfAttack)
            ? "-"
            : `${shot.angleOfAttack.toFixed(1)}`,
          shot.clubPath === "" || isNaN(shot.clubPath)
            ? "-"
            : `${shot.clubPath.toFixed(1)}`,
        ];

        shotValues.forEach((value, index) => {
          pdfDoc.text(value, x + columnWidths[index] / 2, y, {
            align: "center",
          });
          x += columnWidths[index];
        });

        y += 5;
        if (y > 280) {
          pdfDoc.addPage();
          pdfDoc.setFillColor(247, 221, 228);
          pdfDoc.rect(
            0,
            0,
            pdfDoc.internal.pageSize.getWidth(),
            pdfDoc.internal.pageSize.getHeight(),
            "F"
          );
          y = 10;
        }
      });

      y += 15;
      if (y > 280) {
        pdfDoc.addPage();
        pdfDoc.setFillColor(247, 221, 228);
        pdfDoc.rect(
          0,
          0,
          pdfDoc.internal.pageSize.getWidth(),
          pdfDoc.internal.pageSize.getHeight(),
          "F"
        );
        y = 10;
      }
    }
  });

  // Descripciones detalladas
  y += 10;
  const descriptions = [
    {
      value: "Ball Speed (mph)",
      description:
        "La velocidad de la pelota al momento del impacto con el palo. Cuanto mayor sea la velocidad, mayor será la distancia potencial recorrida.",
    },
    {
      value: "Launch Angle (deg)",
      description:
        "El ángulo en el que la pelota se lanza en relación con el suelo. Un ángulo de lanzamiento adecuado maximiza la distancia y control del tiro.",
    },
    {
      value: "Backspin (rpm)",
      description:
        "La rotación hacia atrás de la pelota, medida en revoluciones por minuto (rpm). Un mayor backspin puede generar más altura y control en el tiro, pero demasiado puede reducir la distancia.",
    },
    {
      value: "Sidespin (rpm)",
      description:
        "La rotación lateral de la pelota, que influye en la curvatura del tiro. Un sidespin positivo generalmente hace que la pelota curve hacia la derecha (slice), mientras que uno negativo hace que curve hacia la izquierda (hook).",
    },
    {
      value: "Carry (yds)",
      description:
        "La distancia total que la pelota recorre en el aire antes de tocar el suelo. Es un componente clave de la distancia total del tiro.",
    },
    {
      value: "Total Distance (yds)",
      description:
        "La distancia total recorrida por la pelota, incluyendo el rebote y la rodadura después de que la pelota aterriza.",
    },
    {
      value: "Peak Height (ft)",
      description:
        "La altura máxima alcanzada por la pelota durante su vuelo. Un mayor peak height generalmente se asocia con un tiro que tiene más control y frena más rápido al aterrizar.",
    },
    {
      value: "Descent Angle (deg)",
      description:
        "El ángulo en el que la pelota desciende hacia el suelo. Un ángulo de descenso más alto indica que la pelota caerá más verticalmente, lo que puede resultar en menos rodadura después del aterrizaje.",
    },
    {
      value: "Club Speed (mph)",
      description:
        "La velocidad del palo justo antes del impacto con la pelota. Una mayor velocidad del palo generalmente resulta en una mayor velocidad de la pelota y, por lo tanto, una mayor distancia.",
    },
    {
      value: "Efficiency",
      description:
        "Relación entre la velocidad de la pelota y la velocidad del palo (también conocido como smash factor). Un valor más alto indica un golpe más eficiente, donde más energía del swing se transfiere a la pelota.",
    },
    {
      value: "Angle of Attack (deg)",
      description:
        "El ángulo en el que el palo se mueve hacia arriba o hacia abajo en el momento del impacto con la pelota. Un ángulo de ataque negativo significa que el palo se está moviendo hacia abajo (más común en tiros con hierros), mientras que uno positivo indica que se mueve hacia arriba (común en tiros con el driver).",
    },
    {
      value: "Club Path (deg)",
      description:
        "Un valor positivo significa que el palo se está moviendo hacia la derecha del objetivo en el momento del impacto ('dentro hacia hacia afuera') y un valor negativo significa que se está moviendo hacia la izquierda del objetivo ('afuera hacia dentro'). Una trayectoria del palo neutral (cercana a 0) es ideal para tiros rectos.",
    },
  ];

  descriptions.forEach((desc) => {
    if (y > 280) {
      pdfDoc.addPage();
      pdfDoc.setFillColor(247, 221, 228);
      pdfDoc.rect(
        0,
        0,
        pdfDoc.internal.pageSize.getWidth(),
        pdfDoc.internal.pageSize.getHeight(),
        "F"
      );
      y = 10;
    }

    const text = `${desc.value}: ${desc.description}`;
    const lines = pdfDoc.splitTextToSize(text, 180);
    const lineHeight = 5;
    const totalTextHeight = lines.length * lineHeight;

    if (y + totalTextHeight > 280) {
      pdfDoc.addPage();
      pdfDoc.setFillColor(247, 221, 228);
      pdfDoc.rect(
        0,
        0,
        pdfDoc.internal.pageSize.getWidth(),
        pdfDoc.internal.pageSize.getHeight(),
        "F"
      );
      y = 10;
    }

    pdfDoc.text(lines, 15, y);
    y += 6 + totalTextHeight;
  });

  // Agregar heatmap al final del PDF
  try {
    // Crear heatmap directamente en el PDF con fondo blanco
    await createPDFHeatmap(pdfDoc, sessionData, y);
  } catch (error) {
    console.log("Error al agregar el heatmap:", error);
  }
}

// Función principal para exportar a PDF
async function exportSessionToPDF(sessionData, nombreCompleto, fechaSesion) {
  try {
    // Filtrar solo los tiros seleccionados
    const selectedShots = sessionData.filter((shot) => shot.selected);
    if (selectedShots.length === 0) {
      throw new Error("No hay tiros seleccionados para exportar");
    }

    // Crear el documento PDF
    const { jsPDF } = window.jspdf;
    const pdfDoc = new jsPDF();

    // Configurar fuentes usando fuentes web seguras disponibles en jsPDF
    pdfDoc.setFont("helvetica", "normal");
    pdfDoc.setFontSize(10);

    // Agregar contenido al PDF
    await addContentToPDF(pdfDoc, selectedShots, nombreCompleto, fechaSesion);

    // Insertar logo en la primera página después del contenido
    try {
      // Intentar cargar el logo usando fetch (más confiable)
      const logoResponse = await fetch("../img/logo.jpg");
      if (logoResponse.ok) {
        const logoBlob = await logoResponse.blob();
        const logoBase64 = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(logoBlob);
        });

        console.log("Logo cargado como base64");

        // Crear imagen desde base64 de forma síncrona
        const logo = new Image();

        // Esperar a que la imagen se cargue
        await new Promise((resolve, reject) => {
          logo.onload = resolve;
          logo.onerror = reject;
          logo.src = logoBase64;
        });

        console.log("Logo cargado exitosamente:", logo.width, "x", logo.height);

        // Calcular dimensiones del logo
        const maxLogoWidth = pdfDoc.internal.pageSize.getWidth() / 4;
        const maxLogoHeight = 30;

        // Mantener proporción del logo
        const logoAspectRatio = logo.width / logo.height;
        let logoWidth = maxLogoWidth;
        let logoHeight = logoWidth / logoAspectRatio;

        // Si la altura es muy grande, ajustar
        if (logoHeight > maxLogoHeight) {
          logoHeight = maxLogoHeight;
          logoWidth = logoHeight * logoAspectRatio;
        }

        console.log("Agregando logo al PDF:", logoWidth, "x", logoHeight);

        // Ir a la primera página específicamente
        pdfDoc.setPage(1);

        // Agregar el logo al PDF en la esquina superior izquierda
        pdfDoc.addImage(logo, "JPEG", 5, 5, logoWidth, logoHeight);

        console.log("Logo agregado exitosamente al PDF en la primera página");
      } else {
        console.log("No se pudo cargar el logo, continuando sin él");
      }
    } catch (error) {
      console.log("Error al cargar el logo:", error);
    }

    // Guardar el PDF
    pdfDoc.save(`${nombreCompleto}_${fechaSesion}.pdf`);
  } catch (error) {
    alert(error.message || "Error al exportar a PDF");
  }
}

// Función para calcular offline carry (copiada de heatmap.js)
function calculateOfflineCarry(row) {
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

// Función para calcular parámetros de elipse (copiada de heatmap.js)
function calculateEllipseParams(data) {
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

// Función para formatear nombre del palo
function formatClubName(clubCode) {
  const clubNames = {
    Dr: "Driver",
    "1w": "1 Wood",
    "2w": "2 Wood",
    "3w": "3 Wood",
    "4w": "4 Wood",
    "5w": "5 Wood",
    "7w": "7 Wood",
    "9w": "9 Wood",
    "1h": "1 Hybrid",
    "2h": "2 Hybrid",
    "3h": "3 Hybrid",
    "4h": "4 Hybrid",
    "5h": "5 Hybrid",
    "6h": "6 Hybrid",
    "7h": "7 Hybrid",
    "8h": "8 Hybrid",
    "9h": "9 Hybrid",
    "1i": "1 Iron",
    "2i": "2 Iron",
    "3i": "3 Iron",
    "4i": "4 Iron",
    "5i": "5 Iron",
    "6i": "6 Iron",
    "7i": "7 Iron",
    "8i": "8 Iron",
    "9i": "9 Iron",
    PW: "Pitching Wedge",
    GW: "Gap Wedge",
    SW: "Sand Wedge",
    LW: "Lob Wedge",
    50: "50° Wedge",
    52: "52° Wedge",
    54: "54° Wedge",
    56: "56° Wedge",
    58: "58° Wedge",
    60: "60° Wedge",
    62: "62° Wedge",
    64: "64° Wedge",
    Putt: "Putter",
  };
  return clubNames[clubCode] || clubCode;
}

// Colores para los palos (copiados de constants.js)
const clubColors = [
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

// Función para convertir color hex a RGB
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}

// Función para crear el heatmap en el PDF
async function createPDFHeatmap(pdfDoc, sessionData, y) {
  // Agrupar datos por palo
  const groupedData = {};
  sessionData.forEach((row) => {
    const club = row["club name"];
    if (!groupedData[club] && club !== "Putter") {
      groupedData[club] = [];
    }
    if (club !== "Putter") {
      groupedData[club].push(row);
    }
  });

  // Verificar si hay datos para mostrar
  if (Object.keys(groupedData).length === 0) {
    console.log("No hay datos de tiros para mostrar en el heatmap");
    return;
  }

  // Verificar si hay espacio en la página actual
  const heatmapHeight = 80;
  if (y + heatmapHeight + 20 > 280) {
    pdfDoc.addPage();
    pdfDoc.setFillColor(247, 221, 228);
    pdfDoc.rect(
      0,
      0,
      pdfDoc.internal.pageSize.getWidth(),
      pdfDoc.internal.pageSize.getHeight(),
      "F"
    );
    y = 10;
  }

  // Agregar título del heatmap
  pdfDoc.setFont("helvetica", "bold");
  pdfDoc.setFontSize(12);
  pdfDoc.setTextColor(0, 0, 0);
  pdfDoc.text("Mapa de Dispersión de Tiros", 10, y);
  y += 10;

  // Configurar área del gráfico
  const chartX = 10;
  const chartY = y;
  const chartWidth = pdfDoc.internal.pageSize.getWidth() - 20;
  const chartHeight = 60;

  // Dibujar fondo blanco del gráfico
  pdfDoc.setFillColor(255, 255, 255);
  pdfDoc.rect(chartX, chartY, chartWidth, chartHeight, "F");

  // Dibujar borde del gráfico
  pdfDoc.setDrawColor(0, 0, 0);
  pdfDoc.setLineWidth(0.5);
  pdfDoc.rect(chartX, chartY, chartWidth, chartHeight, "S");

  // Configurar escalas
  const xMin = 0;
  const xMax = 350;
  const yMin = -80;
  const yMax = 80;

  // Función para convertir coordenadas del mundo real a coordenadas del gráfico
  function worldToScreen(worldX, worldY) {
    const screenX = chartX + ((worldX - xMin) / (xMax - xMin)) * chartWidth;
    const screenY =
      chartY + chartHeight - ((worldY - yMin) / (yMax - yMin)) * chartHeight;
    return { x: screenX, y: screenY };
  }

  // Dibujar líneas de cuadrícula
  pdfDoc.setDrawColor(200, 200, 200);
  pdfDoc.setLineWidth(0.2);

  // Líneas verticales (distancia)
  for (let x = 50; x <= 350; x += 50) {
    const screenX = worldToScreen(x, 0).x;
    pdfDoc.line(screenX, chartY, screenX, chartY + chartHeight);
  }

  // Líneas horizontales (desviación lateral)
  for (let y = -60; y <= 60; y += 20) {
    const screenY = worldToScreen(0, y).y;
    pdfDoc.line(chartX, screenY, chartX + chartWidth, screenY);
  }

  // Dibujar ejes
  pdfDoc.setDrawColor(0, 0, 0);
  pdfDoc.setLineWidth(0.3);

  // Eje X (distancia)
  const xAxisY = worldToScreen(0, 0).y;
  pdfDoc.line(chartX, xAxisY, chartX + chartWidth, xAxisY);

  // Eje Y (desviación lateral)
  const yAxisX = worldToScreen(0, 0).x;
  pdfDoc.line(yAxisX, chartY, yAxisX, chartY + chartHeight);

  // Dibujar etiquetas de ejes
  pdfDoc.setFont("helvetica", "normal");
  pdfDoc.setFontSize(8);
  pdfDoc.setTextColor(0, 0, 0);

  // Etiquetas del eje X
  for (let x = 50; x <= 350; x += 50) {
    const screenX = worldToScreen(x, 0).x;
    pdfDoc.text(x.toString(), screenX - 5, chartY + chartHeight + 5, {
      align: "center",
    });
  }

  // Etiquetas del eje Y
  for (let y = -60; y <= 60; y += 20) {
    const screenY = worldToScreen(0, y).y;
    pdfDoc.text(y.toString(), chartX - 12, screenY + 2, { align: "right" });
  }

  // Títulos de ejes
  pdfDoc.setFont("helvetica", "bold");
  pdfDoc.setFontSize(8);
  pdfDoc.text(
    "Distancia Total (yds)",
    chartX + chartWidth / 2,
    chartY + chartHeight + 10,
    { align: "center" }
  );
  pdfDoc.text(
    "Desviación Lateral (yds)",
    chartX - 18,
    chartY + chartHeight / 2,
    { align: "center", angle: 90 }
  );

  // Dibujar puntos y elipses por cada palo
  Object.keys(groupedData).forEach((club, clubIndex) => {
    const clubData = groupedData[club];
    const color = clubColors[clubIndex % clubColors.length];
    const rgb = hexToRgb(color);

    // Preparar datos del palo
    const points = clubData.map((row) => ({
      x: parseFloat(row["total distance (yds)"]) || 0,
      y: -1 * parseFloat(row["offline (yds l-/r+)"]) || 0,
    }));

    // Filtrar puntos válidos
    const validPoints = points.filter(
      (p) => p.x >= 0 && p.x <= 350 && p.y >= -80 && p.y <= 80
    );

    if (validPoints.length === 0) return;

    // Dibujar puntos
    pdfDoc.setFillColor(rgb.r, rgb.g, rgb.b);
    validPoints.forEach((point) => {
      const screenPoint = worldToScreen(point.x, point.y);
      pdfDoc.circle(screenPoint.x, screenPoint.y, 1, "F");
    });
  });

  // Función para obtener el orden de los palos (copiada de script.js)
  function getClubOrder(clubName) {
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
    };
    return clubHierarchy[clubName] || 999;
  }

  // Dibujar leyenda ordenada
  const legendY = chartY + chartHeight + 15;
  const legendX = chartX;
  const legendItemWidth = 50;

  // Ordenar los palos de menor a mayor distancia
  const sortedClubs = Object.keys(groupedData).sort(
    (a, b) => getClubOrder(a) - getClubOrder(b)
  );

  sortedClubs.forEach((club, clubIndex) => {
    const color = clubColors[clubIndex % clubColors.length];
    const rgb = hexToRgb(color);

    const itemX = legendX + (clubIndex % 4) * legendItemWidth;
    const itemY = legendY + Math.floor(clubIndex / 4) * 12;

    // Cuadrado de color
    pdfDoc.setFillColor(rgb.r, rgb.g, rgb.b);
    pdfDoc.rect(itemX, itemY, 6, 6, "F");

    // Texto del palo
    pdfDoc.setFont("helvetica", "normal");
    pdfDoc.setFontSize(7);
    pdfDoc.setTextColor(0, 0, 0);
    pdfDoc.text(formatClubName(club), itemX + 10, itemY + 4);
  });

  console.log("Heatmap creado exitosamente en el PDF");
}

export { exportSessionToPDF };

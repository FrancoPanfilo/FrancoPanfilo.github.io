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
  // Configurar fuentes por defecto
  pdfDoc.setFont("helvetica", "normal");
  pdfDoc.setFontSize(10);

  // Fondo rojo claro
  pdfDoc.setFillColor(247, 221, 228);
  pdfDoc.rect(
    0,
    0,
    pdfDoc.internal.pageSize.getWidth(),
    pdfDoc.internal.pageSize.getHeight(),
    "F"
  );

  // Escribir nombre y fecha
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
  pdfDoc.setFont("Lato", "normal");
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
      pdfDoc.setFont("Jost", "bold");
      pdfDoc.setTextColor(0, 0, 0);
      let x = 5;
      const columnWidths = [15, 15, 15, 15, 15, 12, 16, 14, 15, 15, 17, 15, 15];
      const headers = [
        `\n${clubName}`,
        "BALL \nSPEED\n(mph)",
        "LAUNCH \nANGLE\n(deg)",
        "BACKSPIN\n(rpm)",
        "SIDESPIN\n(rpm)",
        "CARRY\n(yds)",
        "TOTAL \nDISTANCE\n(yds)",
        "PEAK \nHEIGHT\n(ft)",
        "DESCENT \nANGLE\n(deg)",
        "CLUB \nSPEED\n(mph)",
        "EFFICIENCY",
        "ANGLE OF\nATTACK\n(deg)",
        "CLUB PATH\n(deg)",
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
      pdfDoc.setFont("Lato", "normal");
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
        pdfDoc.setFont("Lato", "bold");
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

    // Configurar fuentes por defecto
    pdfDoc.setFont("helvetica", "normal");
    pdfDoc.setFontSize(10);

    // Fondo rojo claro
    pdfDoc.setFillColor(247, 221, 228);
    pdfDoc.rect(
      0,
      0,
      pdfDoc.internal.pageSize.getWidth(),
      pdfDoc.internal.pageSize.getHeight(),
      "F"
    );

    // Insertar logo
    const logo = new Image();
    logo.src = "../img/logo.jpg";

    // Usar Promise para manejar la carga del logo
    await new Promise((resolve, reject) => {
      logo.onload = () => {
        try {
          const logoWidth = pdfDoc.internal.pageSize.getWidth() / 6;
          const logoHeight = (logo.height / logo.width) * logoWidth;
          pdfDoc.addImage(logo, "JPEG", 10, 10, logoWidth, logoHeight);
          resolve();
        } catch (error) {
          reject(error);
        }
      };
      logo.onerror = () => {
        // Si hay error con el logo, continuar sin él
        resolve();
      };
    });

    // Agregar contenido al PDF
    await addContentToPDF(pdfDoc, selectedShots, nombreCompleto, fechaSesion);

    // Guardar el PDF
    pdfDoc.save(`${nombreCompleto}_${fechaSesion}.pdf`);
  } catch (error) {
    console.error("Error al exportar a PDF:", error);
    alert(error.message || "Error al exportar a PDF");
  }
}

export { exportSessionToPDF };

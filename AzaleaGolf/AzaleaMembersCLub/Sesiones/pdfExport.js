// Funciones para exportar sesiones a PDF
import { auth, db } from "../firebase.js";
import {
  doc,
  getDoc,
} from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";
import { jsPDF } from "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.4.0/jspdf.umd.min.js";

// Función para formatear la fecha
function formatearFecha(fechaISO) {
  const fecha = new Date(fechaISO);
  const opciones = { day: "numeric", month: "long", year: "numeric" };
  return fecha.toLocaleDateString("es-ES", opciones);
}

// Función para calcular promedios de los datos
function calcularPromedios(datosPalo) {
  const promedios = {
    velocidadPelota: 0,
    anguloLanzamiento: 0,
    backSpin: 0,
    sideSpin: 0,
    carry: 0,
    distanciaTotal: 0,
    alturaMaxima: 0,
    anguloDescenso: 0,
    velocidadPalo: 0.0,
    eficiencia: 0.0,
    anguloAtaque: 0.0,
    trayectoriaPalo: 0.0,
  };

  let tirosSinDatos = 0;
  datosPalo.forEach((dato) => {
    promedios.velocidadPelota += parseFloat(dato["ball speed (mph)"]) || 0;
    promedios.anguloLanzamiento += parseFloat(dato["launch angle (deg)"]) || 0;
    promedios.backSpin += parseFloat(dato["back spin (rpm)"]) || 0;
    promedios.sideSpin += parseFloat(dato["side spin (rpm l-/r+)"]) || 0;
    promedios.carry += parseFloat(dato["carry (yds)"]) || 0;
    promedios.distanciaTotal += parseFloat(dato["total distance (yds)"]) || 0;
    promedios.alturaMaxima += parseFloat(dato["peak height (yds)"]) || 0;
    promedios.anguloDescenso += parseFloat(dato["descent angle (deg)"]) || 0;

    const velocidadPalo = parseFloat(dato["club speed (mph)"]) || 0;
    if (velocidadPalo > 0.1 && velocidadPalo < 550) {
      promedios.velocidadPalo += velocidadPalo;
      promedios.eficiencia += parseFloat(dato["efficiency"]) || 0;
      promedios.anguloAtaque += parseFloat(dato["angle of attack (deg)"]) || 0;
      promedios.trayectoriaPalo +=
        parseFloat(dato["club path (deg out-in-/in-out+)"]) || 0;
    } else {
      tirosSinDatos++;
    }
  });

  const longitudDatos = datosPalo.length;

  for (const clave in promedios) {
    if (
      clave == "velocidadPalo" ||
      clave == "eficiencia" ||
      clave == "anguloAtaque" ||
      clave == "trayectoriaPalo"
    ) {
      if (longitudDatos - tirosSinDatos == 0) {
        promedios[clave] = "-";
      } else {
        promedios[clave] = promedios[clave] / (longitudDatos - tirosSinDatos);
      }
    } else {
      promedios[clave] /= longitudDatos;
    }
  }

  return promedios;
}

// Función principal para exportar a PDF
export async function exportSessionToPDF(sessionData, user) {
  try {
    // Obtener datos del usuario
    const userDocRef = doc(db, "Simulador", user.uid);
    const userDoc = await getDoc(userDocRef);
    if (!userDoc.exists()) {
      throw new Error("No se encontró el documento del usuario");
    }
    const userData = userDoc.data();

    const doc = new jsPDF();

    // Configuración de fuentes
    doc.addFileToVFS("Jost-VariableFont_wght.ttf", "");
    doc.addFont("Jost-VariableFont_wght.ttf", "Jost", "bold");

    doc.addFileToVFS("Lato-Light.ttf", "");
    doc.addFont("Lato-Light.ttf", "Lato", "normal");
    doc.addFont("Lato-Light.ttf", "Lato", "bold");

    // Fondo del documento
    doc.setFillColor(247, 221, 228);
    doc.rect(
      0,
      0,
      doc.internal.pageSize.getWidth(),
      doc.internal.pageSize.getHeight(),
      "F"
    );

    // Cargar y agregar logo
    const logo = new Image();
    logo.src = "../../logo.jpg";
    await new Promise((resolve) => {
      logo.onload = resolve;
    });

    const logoWidth = doc.internal.pageSize.getWidth() / 6;
    const logoHeight = (logo.height / logo.width) * logoWidth;
    doc.addImage(logo, "JPEG", 10, 10, logoWidth, logoHeight);

    // Información del usuario y fecha
    doc.setFontSize(10);
    doc.setFont("Lato");
    const nombreCompleto = `${userData.nombre} ${userData.apellido}`;
    doc.text(nombreCompleto, doc.internal.pageSize.getWidth() - 10, 15, {
      align: "right",
    });
    const fechaFormateada = formatearFecha(new Date().toISOString());
    doc.text(fechaFormateada, doc.internal.pageSize.getWidth() - 10, 25, {
      align: "right",
    });

    // Agregar tablas de datos
    await agregarTablasPDF(doc, sessionData, nombreCompleto, fechaFormateada);
  } catch (error) {
    console.error("Error al generar el PDF:", error);
    alert("No se pudo generar el PDF. Revisa la consola para más detalles.");
  }
}

// Función para agregar las tablas al PDF
async function agregarTablasPDF(doc, datos, nombre, fecha) {
  const datosPalos = {};
  let y = 40;

  // Procesar datos y organizar por palo
  datos.forEach((tiro) => {
    const palo = tiro["club name"];
    if (!datosPalos[palo]) datosPalos[palo] = [];
    datosPalos[palo].push(tiro);
  });

  // Orden de los palos
  const ordenPalos = [
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

  // Texto introductorio
  doc.setFont("Lato");
  doc.setFontSize(10);
  const texto = doc.splitTextToSize(
    "A continuación, encontrará una tabla detallada que presenta los datos clave de su sesión, incluyendo las métricas más importantes relacionadas con el rendimiento de sus tiros. Esta información está diseñada para brindarle una visión clara y comprensible de su rendimiento en el simulador. Más abajo, encontrará descripciones detalladas de cada uno de los atributos presentados en la tabla, con el fin de ayudarle a interpretar los resultados con precisión.",
    200
  );
  doc.text(texto, 5, y);
  y += 2 + texto.length * 5;

  // Procesar cada palo
  for (const palo of ordenPalos) {
    if (datosPalos[palo]) {
      const datosPalo = datosPalos[palo];
      const promedios = calcularPromedios(datosPalo);

      // Configurar encabezado según tipo de palo
      const anchosColumnas = [
        15, 15, 15, 15, 15, 12, 16, 14, 15, 15, 17, 15, 15,
      ];

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
        ].includes(palo)
      ) {
        doc.setFillColor(255, 40, 0);
      } else if (
        ["PW", "1i", "2i", "3i", "4i", "5i", "6i", "7i", "8i", "9i"].includes(
          palo
        )
      ) {
        doc.setFillColor(255, 102, 0);
      } else {
        doc.setFillColor(190, 161, 169);
      }

      doc.rect(0, y - 6.5, 210, 16, "F");

      // Agregar encabezados
      doc.setFontSize(10);
      doc.setFont("Jost", "bold");
      doc.setTextColor(0, 0, 0);
      let x = 5;

      const encabezados = [
        `\n${palo}`,
        "VELOCIDAD \nPELOTA\n(mph)",
        "ÁNGULO \nLANZAMIENTO\n(deg)",
        "BACKSPIN\n(rpm)",
        "SIDESPIN\n(rpm)",
        "CARRY\n(yds)",
        "DISTANCIA \nTOTAL\n(yds)",
        "ALTURA \nMÁXIMA\n(ft)",
        "ÁNGULO \nDESCENSO\n(deg)",
        "VELOCIDAD \nPALO\n(mph)",
        "EFICIENCIA",
        "ÁNGULO DE\nATAQUE\n(deg)",
        "TRAYECTORIA\nPALO\n(deg)",
      ];

      encabezados.forEach((encabezado, indice) => {
        doc.setFontSize(encabezado === `\n${palo}` ? 10 : 8);
        const lineas = encabezado.split("\n");
        lineas.forEach((linea, indiceLinea) => {
          doc.text(linea, x + anchosColumnas[indice] / 2, y + indiceLinea * 3, {
            align: "center",
          });
        });
        x += anchosColumnas[indice];
      });

      y += 14;

      // Agregar fila de promedios
      x = 5;
      doc.setFont("Lato", "normal");
      doc.setFontSize(9);
      doc.setTextColor(103, 99, 140);

      const valoresPromedio =
        promedios.velocidadPalo === "-"
          ? [
              "Promedio",
              promedios.velocidadPelota.toFixed(1),
              promedios.anguloLanzamiento.toFixed(1),
              promedios.backSpin.toFixed(1),
              promedios.sideSpin.toFixed(1),
              promedios.carry.toFixed(1),
              promedios.distanciaTotal.toFixed(1),
              promedios.alturaMaxima.toFixed(1),
              promedios.anguloDescenso.toFixed(1),
              "-",
              "-",
              "-",
              "-",
            ]
          : [
              "Promedio",
              promedios.velocidadPelota.toFixed(1),
              promedios.anguloLanzamiento.toFixed(1),
              promedios.backSpin.toFixed(1),
              promedios.sideSpin.toFixed(1),
              promedios.carry.toFixed(1),
              promedios.distanciaTotal.toFixed(1),
              promedios.alturaMaxima.toFixed(1),
              promedios.anguloDescenso.toFixed(1),
              promedios.velocidadPalo.toFixed(1),
              promedios.eficiencia.toFixed(2),
              promedios.anguloAtaque.toFixed(1),
              promedios.trayectoriaPalo.toFixed(1),
            ];

      valoresPromedio.forEach((valor, indice) => {
        doc.text(valor, x + anchosColumnas[indice] / 2, y, { align: "center" });
        x += anchosColumnas[indice];
      });

      y += 7;

      // Agregar datos individuales
      datosPalo.forEach((tiro) => {
        x = 5;
        doc.setFontSize(8);
        doc.setFont("Lato", "bold");
        doc.setTextColor(0, 0, 0);

        const valoresTiro = [
          " ",
          isNaN(parseFloat(tiro["ball speed (mph)"]))
            ? "-"
            : parseFloat(tiro["ball speed (mph)"]).toFixed(1),
          isNaN(parseFloat(tiro["launch angle (deg)"]))
            ? "-"
            : parseFloat(tiro["launch angle (deg)"]).toFixed(1),
          isNaN(parseFloat(tiro["back spin (rpm)"]))
            ? "-"
            : parseFloat(tiro["back spin (rpm)"]).toFixed(1),
          isNaN(parseFloat(tiro["side spin (rpm l-/r+)"]))
            ? "-"
            : parseFloat(tiro["side spin (rpm l-/r+)"]).toFixed(1),
          isNaN(parseFloat(tiro["carry (yds)"]))
            ? "-"
            : parseFloat(tiro["carry (yds)"]).toFixed(1),
          isNaN(parseFloat(tiro["total distance (yds)"]))
            ? "-"
            : parseFloat(tiro["total distance (yds)"]).toFixed(1),
          isNaN(parseFloat(tiro["peak height (yds)"]))
            ? "-"
            : parseFloat(tiro["peak height (yds)"]).toFixed(1),
          isNaN(parseFloat(tiro["descent angle (deg)"]))
            ? "-"
            : parseFloat(tiro["descent angle (deg)"]).toFixed(1),
          isNaN(parseFloat(tiro["club speed (mph)"])) ||
          parseFloat(tiro["club speed (mph)"]) === 0
            ? "-"
            : parseFloat(tiro["club speed (mph)"]).toFixed(1),
          isNaN(parseFloat(tiro["efficiency"])) ||
          parseFloat(tiro["efficiency"]) === 0
            ? "-"
            : parseFloat(tiro["efficiency"]).toFixed(2),
          isNaN(parseFloat(tiro["angle of attack (deg)"])) ||
          parseFloat(tiro["angle of attack (deg)"]) === 0
            ? "-"
            : parseFloat(tiro["angle of attack (deg)"]).toFixed(1),
          isNaN(parseFloat(tiro["club path (deg out-in-/in-out+)"])) ||
          parseFloat(tiro["club path (deg out-in-/in-out+)"]) === 0
            ? "-"
            : parseFloat(tiro["club path (deg out-in-/in-out+)"]).toFixed(1),
        ];

        valoresTiro.forEach((valor, indice) => {
          doc.text(valor, x + anchosColumnas[indice] / 2, y, {
            align: "center",
          });
          x += anchosColumnas[indice];
        });

        y += 5;

        // Verificar si necesitamos una nueva página
        if (y > 280) {
          doc.addPage();
          doc.setFillColor(247, 221, 228);
          doc.rect(
            0,
            0,
            doc.internal.pageSize.getWidth(),
            doc.internal.pageSize.getHeight(),
            "F"
          );
          y = 10;
        }
      });

      y += 15;

      // Verificar si necesitamos una nueva página después de cada palo
      if (y > 280) {
        doc.addPage();
        doc.setFillColor(247, 221, 228);
        doc.rect(
          0,
          0,
          doc.internal.pageSize.getWidth(),
          doc.internal.pageSize.getHeight(),
          "F"
        );
        y = 10;
      }
    }
  }

  // Agregar descripciones
  y += 10;
  const descripciones = [
    "Velocidad de la Pelota (mph);Velocidad de la Pelota (mph): La velocidad de la pelota al momento de salir del palo. Cuanto mayor sea la velocidad de la pelota, mayor será la distancia que potencialmente pueda recorrer.",
    "Ángulo de Lanzamiento (deg);Ángulo de Lanzamiento (deg): El ángulo en el que la pelota se lanza en relación al suelo. Un ángulo de lanzamiento adecuado maximiza la distancia y control del tiro.",
    "Backspin (rpm);Backspin (rpm): La rotación hacia atrás de la pelota, medida en revoluciones por minuto (rpm). Un mayor backspin puede generar más altura y control en el tiro, pero demasiado puede reducir la distancia.",
    "Sidespin (rpm);Sidespin (rpm): La rotación lateral de la pelota, que influye en la curvatura del tiro. Un sidespin positivo generalmente hace que la pelota curve hacia la derecha (slice), mientras que uno negativo hace que curve hacia la izquierda (hook).",
    "Carry (yds);Carry (yds): La distancia total que la pelota recorre en el aire antes de tocar el suelo. Es un componente clave de la distancia total del tiro.",
    "Distancia Total (yds);Distancia Total (yds): La distancia total recorrida por la pelota, incluyendo el rebote y la rodadura después de que la pelota aterriza.",
    "Altura Máxima (ft);Altura Máxima (ft): La altura máxima alcanzada por la pelota durante su vuelo. Un mayor peak height generalmente se asocia con un tiro que tiene más control y frena más rápido al aterrizar.",
    "Ángulo de Descenso (deg);Ángulo de Descenso (deg): El ángulo en el que la pelota desciende hacia el suelo. Un ángulo de descenso más alto indica que la pelota caerá más verticalmente, lo que puede resultar en menos rodadura después del aterrizaje.",
    "Velocidad del Palo (mph);Velocidad del Palo (mph): La velocidad del palo justo antes del impacto con la pelota. Una mayor velocidad del palo generalmente resulta en una mayor velocidad de la pelota y, por lo tanto, una mayor distancia.",
    "Eficiencia;Eficiencia: Relación entre la velocidad de la pelota y la velocidad del palo (también conocido como smash factor). Un valor más alto indica un golpe más eficiente, donde más energía del swing se transfiere a la pelota.",
    "Ángulo de Ataque (deg);Ángulo de Ataque (deg): El ángulo en el que el palo se mueve hacia arriba o hacia abajo en el momento del impacto con la pelota. Un ángulo de ataque negativo significa que el palo se está moviendo hacia abajo (más común en tiros con hierros), mientras que uno positivo indica que se mueve hacia arriba (común en tiros con el driver).",
    "Trayectoria del Palo (deg);Trayectoria del Palo (deg): Un valor positivo significa que el palo se está moviendo hacia la derecha del objetivo en el momento del impacto ('dentro hacia afuera') y un valor negativo significa que se está moviendo hacia la izquierda del objetivo ('afuera hacia dentro'). Una trayectoria del palo neutral (cercana a 0) es ideal para tiros rectos.",
  ];

  doc.setFont("Lato");
  doc.setFontSize(10);

  descripciones.forEach((descripcion) => {
    if (y > 280) {
      doc.addPage();
      doc.setFillColor(247, 221, 228);
      doc.rect(
        0,
        0,
        doc.internal.pageSize.getWidth(),
        doc.internal.pageSize.getHeight(),
        "F"
      );
      y = 10;
    }

    const [atributo, detalle] = descripcion.split(";");
    const lineas = doc.splitTextToSize(detalle, 180);
    doc.text(lineas, 15, y);
    y += 6 + lineas.length * 5;
  });

  // Guardar el PDF
  doc.save(`${nombre}_${fecha}.pdf`);
}

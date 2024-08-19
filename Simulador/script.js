// Configuración de Firebase (Firebase ya no está en uso en este código)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCaoKajIMiN3Y8AtPz5X2brHm0YOsFqiuo",
  authDomain: "azalea-92a39.firebaseapp.com",
  projectId: "azalea-92a39",
  storageBucket: "azalea-92a39.appspot.com",
  messagingSenderId: "564234531814",
  appId: "1:564234531814:web:ba8f9c434cd576b01e5c27",
  measurementId: "G-MX1L41XYVE",
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Manejo del formulario de renombrar palos
const renameForm = document.getElementById("renameForm");
const clubSelect = document.getElementById("clubSelect");
const newNameInput = document.getElementById("newName");
const renameButton = document.getElementById("renameClub");

const clubNames = {
  Dr: "Dr",
  "2w": "2w",
  "3w": "3w",
  "4w": "4w",
  "5w": "5w",
  "7w": "7w",
  "9w": "9w",
  "2h": "2h",
  "3h": "3h",
  "4h": "4h",
  "5h": "5h",
  "1h": "1h",
  "2h": "2h",
  "3h": "3h",
  "4h": "4h",
  "5h": "5h",
  "6h": "6h",
  "7h": "7h",
  "8h": "8h",
  "9h": "9h",
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
  50: "50",
  52: "52",
  54: "54",
  56: "56",
  58: "58",
  60: "60",
  62: "62",
  64: "64",
  Putt: "Putt",
};

renameButton.addEventListener("click", function () {
  const selectedClub = clubSelect.value;
  const newName = newNameInput.value;
  if (selectedClub && newName) {
    clubNames[selectedClub] = newName;
    newNameInput.value = "";
  }
});

document.getElementById("csvFile").addEventListener("change", function () {
  document.getElementById("generatePDF").disabled = !this.files.length;
});

document.getElementById("generatePDF").addEventListener("click", function () {
  const name = document.getElementById("name").value;
  const date = document.getElementById("date").value;
  const file = document.getElementById("csvFile").files[0];

  if (name && date && file) {
    const reader = new FileReader();
    reader.onload = function (event) {
      const csvData = event.target.result;
      generatePDF(name, date, csvData);
    };
    reader.readAsText(file);
  }
});

function generatePDF(name, date, csvData) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  // Insertar logo
  const logo = new Image();
  logo.src = "../logo.jpg";
  logo.onload = function () {
    const logoWidth = doc.internal.pageSize.getWidth() / 6; // Ajuste de tamaño del logo
    const logoHeight = (logo.height / logo.width) * logoWidth;
    doc.addImage(logo, "JPEG", 10, 10, logoWidth, logoHeight);
    doc.setFontSize(10); // Ajuste del tamaño de la fuente
    doc.setFont("helvetica", "bold"); // Ajuste del tipo de fuente
    doc.text(`${name}`, doc.internal.pageSize.getWidth() - 10, 15, {
      align: "right",
    });
    doc.text(`${date}`, doc.internal.pageSize.getWidth() - 10, 25, {
      align: "right",
    });
    addTablesToPDF(doc, csvData, name, date);
  };
}

function addTablesToPDF(doc, csvData, name, date) {
  const lines = csvData.split("\n");
  const clubsData = {};

  // Parse CSV and organize data by club
  lines.forEach((line, index) => {
    if (index === 0) return; // Skip header
    const [
      shotNumber,
      clubName,
      clubType,
      shotCreatedDate,
      ballSpeed,
      pushPull,
      launchAngle,
      backSpin,
      sideSpin,
      totalSpin,
      carry,
      totalDistance,
      offline,
      peakHeight,
      descentAngle,
      clubSpeed,
      clubSpeedAtImpact,
      efficiency,
      angleOfAttack,
      clubPath,
      faceToTarget,
      lie,
      loft,
      faceImpactHorizontal,
      faceImpactVertical,
      closureRate,
    ] = line.split(",");
    if (!clubsData[clubName]) clubsData[clubName] = [];
    let cs = "";
    let ef = parseFloat(efficiency);
    let aa = parseFloat(angleOfAttack);
    let cp = parseFloat(clubPath);
    if (parseFloat(clubSpeed) < 550) {
      cs = parseFloat(clubSpeed);
    } else {
      ef = "";
      aa = "";
      cp = "";
    }
    clubsData[clubName].push({
      ballSpeed: parseFloat(ballSpeed),
      launchAngle: parseFloat(launchAngle),
      backSpin: parseFloat(backSpin),
      sideSpin: parseFloat(sideSpin),
      carry: parseFloat(carry),
      totalDistance: parseFloat(totalDistance),
      peakHeight: parseFloat(peakHeight),
      descentAngle: parseFloat(descentAngle),
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
  let y = 50; // Ajuste de la posición inicial de 'y'

  clubOrder.forEach((clubName) => {
    if (clubsData[clubName]) {
      const clubData = clubsData[clubName];
      const averages = calculateAverages(clubData);

      // Header row
      const columnWidths = [15, 15, 15, 15, 15, 12, 16, 18, 15, 15, 15, 15, 15]; // Anchos de columna ajustados
      doc.setFillColor(220, 220, 220); // Light grey background
      doc.rect(0, y - 6.5, 210, 16, "F"); // Fill rectangle for header
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0); // Negro para el texto
      let x = 5; // Posición inicial de 'x'

      // Encabezados de las columnas
      const headers = [
        `\n${clubNames[clubName]}`,
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
        const headerLines = header.split("\n");
        doc.setFontSize(7); // Ajuste de tamaño de fuente
        doc.text(headerLines, x, y - 3, { align: "center" });
        x += columnWidths[index]; // Mueve la posición horizontal para la siguiente columna
      });

      // Data row
      x = 5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      const values = [
        "",
        averages.ballSpeed.toFixed(1),
        averages.launchAngle.toFixed(1),
        averages.backSpin.toFixed(0),
        averages.sideSpin.toFixed(0),
        averages.carry.toFixed(1),
        averages.totalDistance.toFixed(1),
        averages.peakHeight.toFixed(1),
        averages.descentAngle.toFixed(1),
        averages.clubSpeed.toFixed(1),
        averages.efficiency ? averages.efficiency.toFixed(2) : "",
        averages.angleOfAttack ? averages.angleOfAttack.toFixed(1) : "",
        averages.clubPath ? averages.clubPath.toFixed(1) : "",
      ];

      values.forEach((value, index) => {
        doc.text(`${value}`, x, y + 5, { align: "center" });
        x += columnWidths[index]; // Mueve la posición horizontal para la siguiente columna
      });

      // Actualiza la posición 'y' para la próxima fila
      y += 20;

      // Salto de página si se llega al final de la hoja
      if (y > doc.internal.pageSize.getHeight() - 20) {
        doc.addPage();
        y = 50;
      }
    }
  });

  // Descargar PDF
  doc.save(`${name}-${date}.pdf`);
}

// Función para calcular los promedios de los datos
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

  clubData.forEach((data) => {
    averages.ballSpeed += data.ballSpeed || 0;
    averages.launchAngle += data.launchAngle || 0;
    averages.backSpin += data.backSpin || 0;
    averages.sideSpin += data.sideSpin || 0;
    averages.carry += data.carry || 0;
    averages.totalDistance += data.totalDistance || 0;
    averages.peakHeight += data.peakHeight || 0;
    averages.descentAngle += data.descentAngle || 0;
    averages.clubSpeed += data.clubSpeed || 0;
    averages.efficiency += data.efficiency || 0;
    averages.angleOfAttack += data.angleOfAttack || 0;
    averages.clubPath += data.clubPath || 0;
  });

  const dataLength = clubData.length;

  for (const key in averages) {
    averages[key] /= dataLength;
  }

  return averages;
}

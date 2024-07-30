// Configuración de Firebase
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  increment,
  setDoc,
  getDoc,
  doc,
} from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";

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
  Pw: "Pw",
  Gw: "Gw",
  Sw: "Sw",
  Lw: "Lw",
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
    "Pw",
    "Gw",
    "Sw",
    "Lw",
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
        headerLines.forEach((line, lineIndex) => {
          doc.text(line, x + columnWidths[index] / 2, y + lineIndex * 3, {
            align: "center",
          });
        });
        x += columnWidths[index];
      });

      y += 14;

      // Fila de promedios
      x = 5;
      doc.setFont("helvetica", "bold");
      doc.setTextColor(103, 99, 140); // Color púrpura para los valores de promedio

      const averageValues = [
        `Average`,
        `${averages.ballSpeed}`,
        `${averages.launchAngle}`,
        `${averages.backSpin}`,
        `${averages.sideSpin}`,
        `${averages.carry}`,
        `${averages.totalDistance}`,
        `${averages.peakHeight}`,
        `${averages.descentAngle}`,
        `${averages.clubSpeed}`,
        `${averages.efficiency}`,
        `${averages.angleOfAttack}`,
        `${averages.clubPath}`,
      ];

      averageValues.forEach((value, index) => {
        doc.text(value, x + columnWidths[index] / 2, y, { align: "center" });
        x += columnWidths[index];
      });

      y += 7;

      // Filas de datos individuales
      clubData.forEach((shot, index) => {
        x = 5;
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(0, 0, 0); // Negro para los datos

        const shotValues = [
          "",
          isNaN(shot.ballSpeed) ? "-" : `${shot.ballSpeed}`,
          isNaN(shot.launchAngle) ? "-" : `${shot.launchAngle}`,
          isNaN(shot.backSpin) ? "-" : `${shot.backSpin}`,
          isNaN(shot.sideSpin) ? "-" : `${shot.sideSpin}`,
          isNaN(shot.carry) ? "-" : `${shot.carry}`,
          isNaN(shot.totalDistance) ? "-" : `${shot.totalDistance}`,
          isNaN(shot.peakHeight) ? "-" : `${shot.peakHeight}`,
          isNaN(shot.descentAngle) ? "-" : `${shot.descentAngle}`,
          isNaN(shot.clubSpeed) || shot.clubSpeed == 0
            ? "-"
            : `${shot.clubSpeed}`,
          isNaN(shot.efficiency) || shot.efficiency == 0
            ? "-"
            : `${shot.efficiency}`,
          isNaN(shot.angleOfAttack) || shot.angleOfAttack == 0
            ? "-"
            : `${shot.angleOfAttack}`,
          isNaN(shot.clubPath) || shot.clubPath == 0 ? "-" : `${shot.clubPath}`,
        ];

        shotValues.forEach((value, index) => {
          doc.text(value, x + columnWidths[index] / 2, y, { align: "center" });
          x += columnWidths[index];
        });

        y += 5;
        if (y > 280) {
          doc.addPage();
          y = 10;
        }
      });

      y += 15;

      if (y > 280) {
        doc.addPage();
        y = 10;
      }
    }
  });

  // Generar el archivo PDF y guardar en Firebase
  const fileName = `${name}_${date}.pdf`;
  doc.save(fileName);

  // Convertir el PDF a un archivo Blob para subir a Firebase
  const pdfBlob = doc.output("blob");
  uploadToFirebase(pdfBlob, fileName, name, date);
}

function calculateAverages(data) {
  const keys = Object.keys(data[0]);
  const averages = {};
  keys.forEach((key) => {
    const validValues = data
      .map((shot) => shot[key])
      .filter((value) => !isNaN(value));
    if (validValues.length > 0) {
      const sum = validValues.reduce((acc, value) => acc + value, 0);
      if (key == "efficiency") {
        averages[key] = (sum / validValues.length).toFixed(2); // Redondeo a 2 decimales
      } else {
        averages[key] = (sum / validValues.length).toFixed(1); // Redondeo a 2 decimales
      }
    } else {
      averages[key] = "-";
    }
  });
  return averages;
}

async function uploadToFirebase(pdfBlob, fileName, name, date) {
  // Aquí va el código para subir el archivo PDF a Firebase Storage
  // y guardar los detalles del documento en Firestore.
}

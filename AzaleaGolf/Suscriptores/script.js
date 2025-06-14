import {
  db,
  collection,
  addDoc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  doc,
  arrayUnion,
  query,
  orderBy,
} from "../db.js";

const mobileNav = document.querySelector(".hamburger");
const navbar = document.querySelector(".menubar");
let sessionData = []; // Almacenar datos de la sesión para la previsualización
let selectedColumns = []; // Almacenar columnas seleccionadas

const toggleNav = () => {
  navbar.classList.toggle("active");
  mobileNav.classList.toggle("hamburger-active");
};
mobileNav.addEventListener("click", () => toggleNav());

// Configurar el valor por defecto de la fecha
const today = new Date();
const year = today.getFullYear();
const month = String(today.getMonth() + 1).padStart(2, "0");
const day = String(today.getDate()).padStart(2, "0");
document.getElementById("fecha").value = `${year}-${month}-${day}`;

// Manejar la selección del archivo CSV para previsualización
document.getElementById("csvFile").addEventListener("change", async (e) => {
  const csvFile = e.target.files[0];
  const status = document.getElementById("status");

  if (!csvFile) {
    status.textContent = "Por favor, selecciona un archivo CSV.";
    return;
  }

  status.textContent = "Cargando previsualización...";

  try {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        sessionData = parseCSV(event.target.result);
        // Inicializar selectedColumns con todas las columnas, excepto las deseleccionadas
        const allColumns = Object.keys(sessionData[0] || {});
        const deselectedByDefault = [
          "lie (deg toe down-/toe up+)",
          "loft (deg)",
          "face impact horizontal (mm toe-/heel+)",
          "face impact vertical (mm low-/high+)",
          "face impact vertical (mm low-/high+)",
          "face to target (deg closed-/open+)",
          "closure rate (deg/sec)",
        ];
        selectedColumns = allColumns.filter(
          (col) => !deselectedByDefault.includes(col)
        );
        displayPreviewTable(sessionData);
        displaySessionStats(sessionData);
        status.textContent = "";
      } catch (error) {
        status.textContent = `Error al procesar el CSV: ${error.message}`;
      }
    };
    reader.onerror = () => {
      status.textContent = "Error al leer el archivo CSV.";
    };
    reader.readAsText(csvFile);
  } catch (error) {
    status.textContent = `Error: ${error.message}`;
  }
});

// Cargar usuarios al iniciar la página
async function loadUsers() {
  const status = document.getElementById("status");
  const select = document.getElementById("nombre");
  const userIdDiv = document.getElementById("userId");

  try {
    const simuladorRef = collection(db, "Simulador");
    const querySnapshot = await getDocs(simuladorRef);

    // Limpiar opciones existentes excepto la primera
    while (select.options.length > 1) {
      select.remove(1);
    }

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const option = document.createElement("option");
      option.value = doc.id;
      option.textContent = `${data.nombre} ${data.apellido}`;
      select.appendChild(option);
    });

    // Agregar evento change al select
    select.addEventListener("change", () => {
      const selectedOption = select.options[select.selectedIndex];
      userIdDiv.textContent = selectedOption.value
        ? `ID: ${selectedOption.value}`
        : "";
    });
  } catch (error) {
    status.textContent = `Error al cargar usuarios: ${error.message}`;
  }
}

// Llamar a loadUsers cuando se carga la página
document.addEventListener("DOMContentLoaded", loadUsers);

// Manejar el envío del formulario
document.getElementById("sessionForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const nombre = document.getElementById("nombre").value;
  const fecha = document.getElementById("fecha").value;
  const status = document.getElementById("status");

  if (!nombre || !fecha || !sessionData.length || !selectedColumns.length) {
    status.textContent =
      "Por favor, completa todos los campos, selecciona un archivo CSV válido y al menos una columna.";
    return;
  }

  status.textContent = "Procesando...";

  try {
    // Filtrar datos para incluir solo columnas seleccionadas
    const filteredData = sessionData.map((row) => {
      const filteredRow = {};
      selectedColumns.forEach((col) => {
        filteredRow[col] = row[col];
      });
      return filteredRow;
    });
    // Calcular estadísticas de la sesión
    const sessionStats = calculateSessionStats(sessionData);
    // Guardar en Firestore los datos filtrados con las estadísticas
    await saveToFirestore(nombre, fecha, filteredData, sessionStats);
    status.textContent = "Sesión cargada exitosamente a Firebase.";
    document.getElementById("sessionForm").reset();
    document.getElementById("fecha").value = `${year}-${month}-${day}`;
    sessionData = [];
    selectedColumns = [];
    document.getElementById("previewTable").querySelector("thead").innerHTML =
      "";
    document.getElementById("previewTable").querySelector("tbody").innerHTML =
      "";
    // document.getElementById("sessionStats").innerHTML = ""; // Limpiar estadísticas
  } catch (error) {
    status.textContent = `Error al guardar en Firebase: ${error.message}`;
  }
});

// Función para parsear el CSV
function parseCSV(csvData) {
  const lines = csvData.split("\n").filter((line) => line.trim() !== "");
  const headers = lines[0]
    .split(",")
    .map((header) => header.trim().toLowerCase());
  const data = [];

  for (let i = 1; i < lines.length; i++) {
    const columns = lines[i].split(",").map((col) => col.trim());
    if (columns.length < headers.length) continue;

    const rowData = {};
    headers.forEach((header, index) => {
      let value = columns[index];
      // Convertir valores numéricos si es posible, excepto para shot created date
      if (header !== "shot created date" && !isNaN(value) && value !== "") {
        value = parseFloat(value);
      }
      // Reemplazar valores erróneos si los primeros 5 dígitos de clubSpeed son 3.4027
      if (header === "club speed (mph)") {
        if (value > 1000) {
          rowData["club speed (mph)"] = "-";
        } else {
          rowData[header] = value;
        }
      } else {
        rowData[header] = value;
      }
    });
    data.push(rowData);
  }
  for (let i = 0; i < data.length; i++) {
    if (data[i]["club speed (mph)"] === "-") {
      data[i]["efficiency"] = "-";
      data[i]["club path (deg out-in-/in-out+)"] = "-";
      data[i]["angle of attack (deg)"] = "-";
      data[i]["loft (deg)"] = "-";
      data[i]["lie (deg toe down-/toe up+)"] = "-";
      data[i]["club speed at impact location (mph)"] = "-";
      data[i]["face impact horizontal (mm toe-/heel+)"] = "-";
      data[i]["face impact vertical (mm low-/high+)"] = "-";
      data[i]["face to target (deg closed-/open+)"] = "-";
      data[i]["closure rate (deg/sec)"] = "-";
    }
  }
  return data;
}

// Función para calcular estadísticas de la sesión
function calculateSessionStats(data) {
  const shotCount = data.length;
  let sessionTime = 0;
  let restBetweenShots = 0;
  if (shotCount > 0 && data[0]["shot created date"]) {
    // Parsear el timestamp en formato MM/DD/YYYY HH:MM:SS
    const parseTimestamp = (timestamp) => {
      const [date, time] = timestamp.split(" ");
      const [month, day, year] = date.split("/").map(Number);
      const [hours, minutes, seconds] = time.split(":").map(Number);
      return new Date(year, month - 1, day, hours, minutes, seconds);
    };

    const firstShotTime = parseTimestamp(data[0]["shot created date"]);
    const lastShotTime = parseTimestamp(
      data[data.length - 1]["shot created date"]
    );
    sessionTime = (lastShotTime - firstShotTime) / 1000; // Tiempo en segundos
    restBetweenShots = shotCount > 1 ? sessionTime / (shotCount - 1) : 0; // Promedio en segundos
  }

  // Formatear tiempo de la sesión
  const sessionTimeFormatted = formatSessionTime(sessionTime);
  // Formatear descanso entre tiros
  const restBetweenShotsFormatted = formatRestTime(restBetweenShots);
  return {
    shotCount,
    sessionTime: sessionTimeFormatted,
    restBetweenShots: restBetweenShotsFormatted,
  };
}

// Función para formatear el tiempo de la sesión (en horas y minutos)
function formatSessionTime(seconds) {
  if (seconds <= 0) return "0h 0m";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

// Función para formatear el descanso entre tiros (en segundos o minutos)
function formatRestTime(seconds) {
  if (seconds <= 0) return "0s";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);
  return `${minutes}m ${remainingSeconds}s`;
}

// Función para mostrar la tabla de previsualización
function displayPreviewTable(data) {
  const tableHead = document
    .getElementById("previewTable")
    .querySelector("thead");
  const tableBody = document
    .getElementById("previewTable")
    .querySelector("tbody");

  // Limpiar la tabla
  tableHead.innerHTML = "";
  tableBody.innerHTML = "";

  if (data.length === 0) {
    tableBody.innerHTML =
      "<tr><td colspan='100'>No hay datos para mostrar.</td></tr>";
    return;
  }

  // Generar encabezados con casillas de verificación
  const headers = Object.keys(data[0]);
  const headerRow = document.createElement("tr");
  headers.forEach((header) => {
    const th = document.createElement("th");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = selectedColumns.includes(header); // Reflejar estado de selección
    checkbox.dataset.column = header;
    checkbox.addEventListener("change", () => {
      if (checkbox.checked) {
        if (!selectedColumns.includes(header)) {
          selectedColumns.push(header);
        }
      } else {
        selectedColumns = selectedColumns.filter((col) => col !== header);
      }
      displayPreviewTable(data); // Actualizar tabla al cambiar selección
    });
    const label = document.createElement("label");
    label.textContent = header.charAt(0).toUpperCase() + header.slice(1);
    th.appendChild(checkbox);
    th.appendChild(label);
    headerRow.appendChild(th);
  });
  const thDelete = document.createElement("th");
  thDelete.textContent = "Acción";
  headerRow.appendChild(thDelete);
  tableHead.appendChild(headerRow);

  // Generar filas de datos (solo columnas seleccionadas)
  data.forEach((row, index) => {
    const tr = document.createElement("tr");
    headers.forEach((header) => {
      if (selectedColumns.includes(header)) {
        const td = document.createElement("td");
        td.textContent = row[header];
        tr.appendChild(td);
      }
    });
    const tdDelete = document.createElement("td");
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "delete-btn";
    deleteBtn.textContent = "Eliminar";
    deleteBtn.onclick = () => {
      sessionData.splice(index, 1);
      displayPreviewTable(data);
      displaySessionStats(sessionData); // Actualizar estadísticas tras eliminar
    };
    tdDelete.appendChild(deleteBtn);
    tr.appendChild(tdDelete);
    tableBody.appendChild(tr);
  });
}

// Función para mostrar estadísticas de la sesión
function displaySessionStats(data) {
  const statsContainer = document.getElementById("sessionStats");
  const stats = calculateSessionStats(data);

  statsContainer.innerHTML = `
    <div><strong>Cantidad de tiros:</strong> ${stats.shotCount}</div>
    <div><strong>Tiempo de la sesión:</strong> ${stats.sessionTime}</div>
    <div><strong>Descanso entre tiros:</strong> ${stats.restBetweenShots}</div>
  `;
}

// Función para guardar datos en Firestore
async function saveToFirestore(nombre, fecha, sessionData, sessionStats) {
  const userDocRef = doc(db, "Simulador", nombre);
  const userDoc = await getDoc(userDocRef);

  const sessionEntry = {
    fecha: fecha,
    datos: sessionData,
    stats: sessionStats, // Incluir estadísticas en la entrada
  };
  console.log(sessionEntry);
  if (userDoc.exists()) {
    // Actualizar el array Sesiones
    await setDoc(
      userDocRef,
      {
        Sesiones: [...userDoc.data().Sesiones, sessionEntry],
      },
      { merge: true }
    );
  } else {
    // Crear nuevo documento con el array Sesiones
    await setDoc(userDocRef, {
      Sesiones: [sessionEntry],
    });
  }
}

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
        displayPreviewTable(sessionData);
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

// Manejar el envío del formulario
document.getElementById("sessionForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const nombre = document.getElementById("nombre").value.trim();
  const fecha = document.getElementById("fecha").value;
  const status = document.getElementById("status");

  if (!nombre || !fecha || !sessionData.length) {
    status.textContent =
      "Por favor, completa todos los campos y selecciona un archivo CSV válido.";
    return;
  }

  status.textContent = "Procesando...";

  try {
    // Guardar en Firestore los datos de la sesión (sin los tiros eliminados)
    await saveToFirestore(nombre, fecha, sessionData);
    status.textContent = "Sesión cargada exitosamente a Firebase.";
    document.getElementById("sessionForm").reset();
    document.getElementById("fecha").value = `${year}-${month}-${day}`;
    sessionData = [];
    document.getElementById("previewTable").querySelector("thead").innerHTML =
      "";
    document.getElementById("previewTable").querySelector("tbody").innerHTML =
      "";
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
      let cs = value.clubspeed;
      // Convertir valores numéricos si es posible
      if (!isNaN(value) && value !== "") {
        value = parseFloat(value);
      }
      // Reemplazar valores erróneos si los primeros 5 dígitos de clubSpeed son 3.4027
      if (header == "club speed (mph)") {
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
    if (data[i]["club speed (mph)"] == "-") {
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

// Función para mostrar la tabla de previsualización
function displayPreviewTable(data) {
  // console.log(data);

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
  // console.log(data);
  // Generar encabezados
  const headers = Object.keys(data[0]);
  const headerRow = document.createElement("tr");
  headers.forEach((header) => {
    const th = document.createElement("th");
    th.textContent = header.charAt(0).toUpperCase() + header.slice(1);
    headerRow.appendChild(th);
  });
  const thDelete = document.createElement("th");
  thDelete.textContent = "Acción";
  headerRow.appendChild(thDelete);
  tableHead.appendChild(headerRow);

  // Generar filas de datos
  data.forEach((row, index) => {
    const tr = document.createElement("tr");
    headers.forEach((header) => {
      const td = document.createElement("td");
      td.textContent = row[header];
      tr.appendChild(td);
    });
    const tdDelete = document.createElement("td");
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "delete-btn";
    deleteBtn.textContent = "Eliminar";
    deleteBtn.onclick = () => {
      sessionData.splice(index, 1);
      displayPreviewTable(sessionData);
    };
    tdDelete.appendChild(deleteBtn);
    tr.appendChild(tdDelete);
    tableBody.appendChild(tr);
  });
}

// Función para guardar datos en Firestore
async function saveToFirestore(nombre, fecha, sessionData) {
  const userDocRef = doc(db, "Simulador", nombre);
  const userDoc = await getDoc(userDocRef);

  const sessionEntry = {
    fecha: fecha,
    datos: sessionData,
  };

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

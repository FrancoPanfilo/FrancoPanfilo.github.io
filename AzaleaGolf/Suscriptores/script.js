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

document.addEventListener("DOMContentLoaded", function () {
  const select = document.getElementById("accionSelect");
  const formSesion = document.getElementById("form-sesion-container");
  const formTarjeta = document.getElementById("form-tarjeta-container");
  const formTorneo = document.getElementById("form-torneo-container");

  function mostrarFormulario(accion) {
    formSesion.style.display = "none";
    formTarjeta.style.display = "none";
    formTorneo.style.display = "none";
    if (accion === "sesion") formSesion.style.display = "";
    if (accion === "tarjeta") formTarjeta.style.display = "";
    if (accion === "torneo") formTorneo.style.display = "";
  }

  select.addEventListener("change", function () {
    mostrarFormulario(this.value);
  });

  // Mostrar el formulario inicial
  mostrarFormulario(select.value);
});

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

// --- POBLAR SELECTS DE TORNEO Y USUARIO ---
async function poblarSelectTorneos() {
  const selectTorneo = document.getElementById("select-torneo");
  if (!selectTorneo) return;
  selectTorneo.innerHTML = '<option value="">Selecciona un torneo</option>';
  try {
    const torneosRef = collection(db, "Torneos");
    const snapshot = await getDocs(torneosRef);
    snapshot.forEach((doc) => {
      const data = doc.data();
      const option = document.createElement("option");
      option.value = doc.id;
      option.textContent = data.nombre || doc.id;
      selectTorneo.appendChild(option);
    });
  } catch (error) {
    console.error("Error al cargar torneos:", error);
  }
}

async function poblarSelectUsuarios() {
  const selectUsuario = document.getElementById("select-usuario");
  if (!selectUsuario) return;
  selectUsuario.innerHTML = '<option value="">Selecciona un usuario</option>';
  try {
    const usuariosRef = collection(db, "Simulador"); // Cambia a "Usuarios" si corresponde
    const snapshot = await getDocs(usuariosRef);
    snapshot.forEach((doc) => {
      const data = doc.data();
      const option = document.createElement("option");
      option.value = doc.id;
      option.textContent = data.nombre
        ? `${data.nombre} ${data.apellido || ""}`
        : doc.id;
      selectUsuario.appendChild(option);
    });
  } catch (error) {
    console.error("Error al cargar usuarios:", error);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  poblarSelectTorneos();
  poblarSelectUsuarios();
});

// --- GUARDAR FORMULARIO DE TORNEO ---
document.getElementById("torneoForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target;
  const datos = {
    nombre: form.nombre.value,
    fecha_inicio: form.fecha_inicio.value,
    fecha_fin: form.fecha_fin.value,
    formato: form.formato.value,
    cancha: {
      nombre: form.cancha_nombre.value,
      tee_salida: form.tee_salida.value,
      par_por_hoyo: Array.from({ length: 18 }, (_, i) =>
        parseInt(form[`par_hoyo_${i + 1}`].value)
      ),
      yardaje_por_hoyo: Array.from({ length: 18 }, (_, i) =>
        parseInt(form[`yardas_hoyo_${i + 1}`].value)
      ),
      dureza_fairways: form.dureza_fairways.value,
      velocidad_greens: parseFloat(form.velocidad_greens.value),
      dureza_greens: form.dureza_greens.value,
      velocidad_viento: parseFloat(form.velocidad_viento.value),
      direccion_viento: form.direccion_viento.value,
    },
    porcentaje_handicap: parseFloat(form.porcentaje_handicap.value),
    premio: {
      descripcion: form.premio_descripcion.value,
      distribucion: Array.from(document.querySelectorAll(".premio-item")).map(
        (row) => ({
          posicion: parseInt(row.querySelector(".premio-posicion").value),
          recompensa: row.querySelector(".premio-recompensa").value,
        })
      ),
    },
    reglas: Array.from(document.querySelectorAll(".regla-item")).map(
      (row) => row.value
    ),
    fotos: {
      portada: form.foto_portada.value,
      galeria: Array.from(document.querySelectorAll(".galeria-item")).map(
        (row) => row.value
      ),
    },
    colores: {
      primario: form.color_primario.value,
      secundario: form.color_secundario.value,
      fondo: form.color_fondo.value,
    },
    notas_admin: form.notas_admin.value,
    estado: form.estado.value,
    fecha_creacion: new Date().toISOString(),
    fecha_actualizacion: new Date().toISOString(),
    tarjetas: [],
  };
  try {
    await addDoc(collection(db, "Torneos"), datos);
    alert("Torneo guardado correctamente");
    form.reset();
    poblarSelectTorneos();
  } catch (error) {
    alert("Error al guardar torneo: " + error.message);
  }
});

// --- GUARDAR FORMULARIO DE TARJETA ---
document
  .getElementById("tarjetaForm")
  ?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    const torneoId = form.torneo.value;
    const usuarioId = form.usuario.value;
    if (!torneoId || !usuarioId) {
      alert("Selecciona torneo y usuario");
      return;
    }
    // Obtener el nombre del usuario seleccionado
    const usuarioSelect = form.usuario;
    const nombreUsuario =
      usuarioSelect.options[usuarioSelect.selectedIndex].textContent;
    const handicap = parseFloat(form.handicap.value);
    // Calcular scores
    const scores = Array.from({ length: 18 }, (_, i) => ({
      hoyo: i + 1,
      golpes: parseInt(form[`golpes_${i + 1}`].value),
      fairway: form[`fairway_${i + 1}`].checked,
      green: form[`green_${i + 1}`].checked,
    }));
    const score_bruto = scores.reduce(
      (acc, curr) => acc + (isNaN(curr.golpes) ? 0 : curr.golpes),
      0
    );
    const score_neto = score_bruto - handicap;
    const tarjeta = {
      id_usuario: usuarioId,
      nombre_usuario: nombreUsuario,
      handicap: handicap,
      scores: scores,
      score_bruto: score_bruto,
      score_neto: score_neto,
      fecha_envio: form.fecha_envio.value,
    };
    try {
      // Buscar el torneo y agregar la tarjeta al array "tarjetas"
      const torneoRef = doc(db, "Torneos", torneoId);
      const torneoSnap = await getDoc(torneoRef);
      if (!torneoSnap.exists()) throw new Error("Torneo no encontrado");
      const torneoData = torneoSnap.data();
      // Verificar si ya existe una tarjeta para ese usuario
      if ((torneoData.tarjetas || []).some((t) => t.id_usuario === usuarioId)) {
        alert("Ya existe una tarjeta para este usuario en este torneo");
        return;
      }
      await updateDoc(torneoRef, {
        tarjetas: arrayUnion(tarjeta),
        fecha_actualizacion: new Date().toISOString(),
      });
      alert("Tarjeta guardada correctamente");
      form.reset();
    } catch (error) {
      alert("Error al guardar tarjeta: " + error.message);
    }
  });

// --- FUNCIONES PARA AGREGAR FILAS DINÁMICAS EN PREMIOS, REGLAS Y GALERÍA ---
window.agregarPremio = function () {
  const lista = document.getElementById("premios-lista");
  const div = document.createElement("div");
  div.className = "premio-item";
  div.innerHTML = `Posición: <input type="number" class="premio-posicion" min="1" required style="width:50px;"> Recompensa: <input type="text" class="premio-recompensa" required> <button type="button" onclick="this.parentNode.remove()">Eliminar</button>`;
  lista.appendChild(div);
};
window.agregarRegla = function () {
  const lista = document.getElementById("reglas-lista");
  const input = document.createElement("input");
  input.type = "text";
  input.className = "regla-item";
  input.required = false;
  input.placeholder = "Regla específica";
  const btn = document.createElement("button");
  btn.type = "button";
  btn.textContent = "Eliminar";
  btn.onclick = function () {
    input.remove();
    btn.remove();
  };
  lista.appendChild(input);
  lista.appendChild(btn);
};
window.agregarFotoGaleria = function () {
  const lista = document.getElementById("galeria-lista");
  const input = document.createElement("input");
  input.type = "url";
  input.className = "galeria-item";
  input.required = false;
  input.placeholder = "URL de la foto";
  const btn = document.createElement("button");
  btn.type = "button";
  btn.textContent = "Eliminar";
  btn.onclick = function () {
    input.remove();
    btn.remove();
  };
  lista.appendChild(input);
  lista.appendChild(btn);
};

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

// --- ACTUALIZAR SCORE BRUTO Y NETO EN FORMULARIO DE TARJETA ---
function actualizarScoresTarjeta() {
  const form = document.getElementById("tarjetaForm");
  if (!form) return;
  let score_bruto = 0;
  for (let i = 1; i <= 18; i++) {
    const golpesInput = form[`golpes_${i}`];
    const val = parseInt(golpesInput?.value);
    if (!isNaN(val)) score_bruto += val;
  }
  const handicap = parseFloat(form.handicap.value) || 0;
  const score_neto = score_bruto - handicap;
  form.score_bruto.value = score_bruto;
  form.score_neto.value = score_neto;
}

// Asignar eventos a los inputs de golpes y handicap
function asignarEventosTarjeta() {
  const form = document.getElementById("tarjetaForm");
  if (!form) return;
  for (let i = 1; i <= 18; i++) {
    const golpesInput = form[`golpes_${i}`];
    if (golpesInput) {
      golpesInput.addEventListener("input", actualizarScoresTarjeta);
    }
  }
  form.handicap.addEventListener("input", actualizarScoresTarjeta);
}

document.addEventListener("DOMContentLoaded", asignarEventosTarjeta);

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
  const simulatorType = document.getElementById("simulador").value;

  if (!csvFile) {
    status.textContent = "Por favor, selecciona un archivo CSV.";
    return;
  }

  status.textContent = "Cargando previsualización...";

  try {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        sessionData = parseCSV(event.target.result, simulatorType);

        if (sessionData.length === 0) {
          status.textContent = "El archivo CSV está vacío o no se pudo procesar.";
          return;
        }

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

    // Crear array de usuarios y ordenar alfabéticamente
    const users = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      users.push({
        id: doc.id,
        nombre: data.nombre || "",
        apellido: data.apellido || "",
        fullName: `${data.nombre || ""} ${data.apellido || ""}`.trim()
      });
    });

    // Ordenar alfabéticamente por nombre completo
    users.sort((a, b) => a.fullName.localeCompare(b.fullName, 'es'));

    // Agregar opciones ordenadas al select
    users.forEach((user) => {
      const option = document.createElement("option");
      option.value = user.id;
      option.textContent = user.fullName;
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
  const formEditarTorneo = document.getElementById("form-editar-torneo-container");

  function mostrarFormulario(accion) {
    formSesion.style.display = "none";
    formTarjeta.style.display = "none";
    formTorneo.style.display = "none";
    formEditarTorneo.style.display = "none";
    if (accion === "sesion") formSesion.style.display = "";
    if (accion === "tarjeta") formTarjeta.style.display = "";
    if (accion === "torneo") formTorneo.style.display = "";
    if (accion === "editar-torneo") formEditarTorneo.style.display = "";
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
    const usuariosRef = collection(db, "Simulador");
    const snapshot = await getDocs(usuariosRef);

    // Crear array y ordenar alfabéticamente
    const users = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      users.push({
        id: doc.id,
        fullName: data.nombre
          ? `${data.nombre} ${data.apellido || ""}`.trim()
          : doc.id
      });
    });

    users.sort((a, b) => a.fullName.localeCompare(b.fullName, 'es'));

    users.forEach((user) => {
      const option = document.createElement("option");
      option.value = user.id;
      option.textContent = user.fullName;
      selectUsuario.appendChild(option);
    });
  } catch (error) {
    console.error("Error al cargar usuarios:", error);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  poblarSelectTorneos();
  poblarSelectUsuarios();

  // Cargar tees cuando se selecciona un torneo en el form de tarjeta
  const selectTorneo = document.getElementById("select-torneo");
  const selectTee = document.getElementById("select-tee-tarjeta");
  const seccionTee = document.getElementById("seccion-tee-tarjeta");
  const ajusteInfo = document.getElementById("tee-ajuste-info");
  const ajusteValor = document.getElementById("tee-ajuste-valor");

  selectTorneo?.addEventListener("change", async function () {
    const torneoId = this.value;
    selectTee.innerHTML = '<option value="">Selecciona el tee</option>';
    seccionTee.style.display = "none";
    ajusteInfo.style.display = "none";
    document.getElementById("handicap-efectivo-box").style.display = "none";

    if (!torneoId) return;

    try {
      const torneoSnap = await getDoc(doc(db, "Torneos", torneoId));
      if (!torneoSnap.exists()) return;
      const data = torneoSnap.data();

      // Tee principal
      const cancha = data.cancha || {};
      const principalColor = cancha.tee_color || TEE_COLORS.find(t => t.nombre === cancha.tee_salida)?.color || '#ffffff';
      const optPrincipal = document.createElement("option");
      optPrincipal.value = cancha.tee_salida || "Blanco";
      optPrincipal.textContent = `${cancha.tee_salida || "Blanco"} (principal)`;
      optPrincipal.dataset.ajuste = "0";
      optPrincipal.dataset.color = principalColor;
      selectTee.appendChild(optPrincipal);

      // Tees adicionales
      (data.tees_adicionales || []).forEach((tee) => {
        const teeCol = tee.color || TEE_COLORS.find(t => t.nombre === tee.nombre)?.color || '#ffffff';
        const opt = document.createElement("option");
        opt.value = tee.nombre;
        const signo = tee.ajuste_handicap >= 0 ? "+" : "";
        opt.textContent = `${tee.nombre} (${signo}${tee.ajuste_handicap} hcp)`;
        opt.dataset.ajuste = tee.ajuste_handicap;
        opt.dataset.color = teeCol;
        selectTee.appendChild(opt);
      });

      seccionTee.style.display = "";
    } catch (err) {
      console.error("Error cargando tees:", err);
    }
  });

  // Actualizar info de ajuste, color swatch y scores cuando cambia el tee
  selectTee?.addEventListener("change", function () {
    const selected = this.options[this.selectedIndex];
    const ajuste = parseFloat(selected?.dataset.ajuste) || 0;
    if (ajuste !== 0) {
      const signo = ajuste > 0 ? "+" : "";
      ajusteValor.textContent = `${signo}${ajuste}`;
      ajusteInfo.style.display = "";
    } else {
      ajusteInfo.style.display = "none";
    }
    // Mostrar swatch de color
    const preview = document.getElementById("tee-color-preview");
    if (preview && this.value) {
      const color = selected?.dataset.color || '#ffffff';
      const isWhite = color.toLowerCase() === '#ffffff';
      preview.style.background = color;
      preview.style.border = isWhite ? '2px solid #1a1a18' : '2px solid transparent';
      preview.style.display = 'inline-block';
    } else if (preview) {
      preview.style.display = 'none';
    }
    actualizarScoresTarjeta();
  });
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
      tee_color: teeColorFromSelect(form.tee_salida),
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
    if (!torneoId) {
      alert("Selecciona un torneo");
      return;
    }

    const tipoJugador = form.tipo_jugador.value;
    let usuarioId = null;
    let nombreUsuario = "";

    if (tipoJugador === "registrado") {
      usuarioId = form.usuario.value;
      if (!usuarioId) {
        alert("Selecciona un usuario registrado");
        return;
      }
      const usuarioSelect = form.usuario;
      nombreUsuario = usuarioSelect.options[usuarioSelect.selectedIndex].textContent;
    } else {
      const nombre = form.jugador_nombre.value.trim();
      const apellido = form.jugador_apellido.value.trim();
      if (!nombre || !apellido) {
        alert("Ingresa nombre y apellido del jugador");
        return;
      }
      nombreUsuario = `${nombre} ${apellido}`;
    }

    const selectTee = document.getElementById("select-tee-tarjeta");
    const teeSeleccionado = selectTee?.value || "";
    if (!teeSeleccionado) {
      alert("Selecciona el tee de salida");
      return;
    }
    const ajusteTee = parseFloat(selectTee.options[selectTee.selectedIndex]?.dataset.ajuste) || 0;
    const teeColor = selectTee.options[selectTee.selectedIndex]?.dataset.color || '#ffffff';
    const handicapBase = parseFloat(form.handicap.value);
    const handicapEfectivo = handicapBase + ajusteTee;
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
    const score_neto = score_bruto - handicapEfectivo;
    const tarjeta = {
      id_usuario: usuarioId,
      nombre_usuario: nombreUsuario,
      registrado: tipoJugador === "registrado",
      tee_salida: teeSeleccionado,
      tee_color: teeColor,
      ajuste_tee: ajusteTee,
      handicap_base: handicapBase,
      handicap: handicapEfectivo,
      scores: scores,
      score_bruto: score_bruto,
      score_neto: score_neto,
      fecha_envio: form.fecha_envio.value,
    };
    try {
      const torneoRef = doc(db, "Torneos", torneoId);
      const torneoSnap = await getDoc(torneoRef);
      if (!torneoSnap.exists()) throw new Error("Torneo no encontrado");
      const torneoData = torneoSnap.data();
      const tarjetas = torneoData.tarjetas || [];
      // Para registrados verificar por id; para nuevos verificar por nombre exacto
      const duplicado = tipoJugador === "registrado"
        ? tarjetas.some((t) => t.id_usuario === usuarioId)
        : tarjetas.some((t) => t.nombre_usuario.toLowerCase() === nombreUsuario.toLowerCase());
      if (duplicado) {
        alert("Ya existe una tarjeta para este jugador en este torneo");
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

// ============================================
// FUNCIONES DE PARSEO POR TIPO DE SIMULADOR
// ============================================

// Función principal que selecciona el parser correcto
function parseCSV(csvData, simulatorType = "fsx_live") {
  switch (simulatorType) {
    case "fsx_live":
      return parseCSVForesight(csvData);
    case "gspro":
      return parseCSVGSPro(csvData);
    default:
      return parseCSVForesight(csvData);
  }
}

// Parser para Foresight
function parseCSVForesight(csvData) {
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

// Parser para GSPro
function parseCSVGSPro(csvData) {
  const lines = csvData.split("\n").filter((line) => line.trim() !== "");
  if (lines.length < 2) return [];

  // Limpiamos el BOM (\uFEFF) oculto que suele venir en el primer caracter de los CSVs
  const headers = lines[0].split(",").map((header) => header.replace(/^[\uFEFF\xA0]+/, '').trim().toLowerCase());
  const data = [];

  // Mapeo de nombres de columnas de GSPro a FSX Live
  const gsproToFsxMap = {
    'no.': 'shot number',
    'no': 'shot number',
    'shot': 'shot number',
    'shot no': 'shot number',
    'shot no.': 'shot number',
    'carry': 'carry (yds)',
    'totaldistance': 'total distance (yds)',
    'ballspeed': 'ball speed (mph)',
    'backspin': 'back spin (rpm)',
    'sidespin': 'side spin (rpm l-/r+)',
    'vla': 'launch angle (deg)',
    'decent': 'descent angle (deg)',
    'peakheight': 'peak height (yds)',
    'offline': 'offline (yds l-/r+)',
    'club': 'club name',
    'clubspeed': 'club speed (mph)',
    'path': 'club path (deg out-in-/in-out+)',
    'aoa': 'angle of attack (deg)',
    'facetotarget': 'face to target (deg closed-/open+)',
    'smashfactor': 'efficiency'
  };

  // Traductor de palos de GSPro a formato estándar
  const mapGSProClub = (club) => {
    if (!club) return "Unknown";
    let c = club.toUpperCase().trim();
    if (c === "DR") return "Dr";
    if (c === "PT") return "Putter";
    if (c === "PW") return "PW";
    if (c === "GW") return "GW";
    if (c === "SW") return "SW";
    if (c === "LW") return "LW";
    // Maderas: W3 -> 3w
    if (c.startsWith("W") && c.length === 2) return c[1] + "w";
    // Hierros: I6 -> 6i
    if (c.startsWith("I") && c.length === 2) return c[1] + "i";
    // Híbridos: H3 -> 3h
    if (c.startsWith("H") && c.length === 2) return c[1] + "h";
    return c;
  };

  // Objeto base que contiene todas las columnas estándar de FSX Play
  const baseFsxRow = {
    "shot number": "",
    "shot created date": "",
    "club name": "Unknown",
    "ball speed (mph)": "-",
    "launch angle (deg)": "-",
    "back spin (rpm)": "-",
    "side spin (rpm l-/r+)": "-",
    "carry (yds)": "-",
    "total distance (yds)": "-",
    "peak height (yds)": "-",
    "descent angle (deg)": "-",
    "offline (yds l-/r+)": "-",
    "club speed (mph)": "-",
    "efficiency": "-",
    "club path (deg out-in-/in-out+)": "-",
    "angle of attack (deg)": "-",
    "loft (deg)": "-",
    "lie (deg toe down-/toe up+)": "-",
    "club speed at impact location (mph)": "-",
    "face impact horizontal (mm toe-/heel+)": "-",
    "face impact vertical (mm low-/high+)": "-",
    "face to target (deg closed-/open+)": "-",
    "closure rate (deg/sec)": "-"
  };

  // Para calcular estadísticas de sesión, GSPro no provee fecha/hora de cada tiro.
  // Simularemos una fecha partiendo de ahora y sumando 1 minuto por tiro.
  let currentTime = new Date();

  for (let i = 1; i < lines.length; i++) {
    const columns = lines[i].split(",").map((col) => col.trim());
    if (columns.length < headers.length) continue;

    const rowData = { ...baseFsxRow };

    headers.forEach((header, index) => {
      let value = columns[index];
      const mappedHeader = gsproToFsxMap[header];

      if (mappedHeader) {
        if (mappedHeader === 'club name') {
          rowData[mappedHeader] = mapGSProClub(value);
        } else {
          if (!isNaN(value) && value !== "") {
            value = parseFloat(value);
          }
          rowData[mappedHeader] = value;
        }
      }
    });

    // Si no hay velocidad de palo (0 o nulo), establecer como "-"
    if (rowData["club speed (mph)"] === 0 || isNaN(rowData["club speed (mph)"]) || rowData["club speed (mph)"] === "") {
      rowData["club speed (mph)"] = "-";
      rowData["efficiency"] = "-";
      rowData["club path (deg out-in-/in-out+)"] = "-";
      rowData["angle of attack (deg)"] = "-";
      rowData["loft (deg)"] = "-";
      rowData["lie (deg toe down-/toe up+)"] = "-";
      rowData["club speed at impact location (mph)"] = "-";
      rowData["face impact horizontal (mm toe-/heel+)"] = "-";
      rowData["face impact vertical (mm low-/high+)"] = "-";
      rowData["face to target (deg closed-/open+)"] = "-";
      rowData["closure rate (deg/sec)"] = "-";
    }

    // Respaldo infalible: Si el CSV derechamente no trae columna de tiro, aplicamos el secuencial
    if (rowData["shot number"] === undefined || rowData["shot number"] === "") {
      rowData["shot number"] = data.length + 1;
    }

    // Fecha simulada
    currentTime.setMinutes(currentTime.getMinutes() + 1);
    const month = String(currentTime.getMonth() + 1).padStart(2, '0');
    const day = String(currentTime.getDate()).padStart(2, '0');
    const year = currentTime.getFullYear();
    const hours = String(currentTime.getHours()).padStart(2, '0');
    const minutes = String(currentTime.getMinutes()).padStart(2, '0');
    const seconds = String(currentTime.getSeconds()).padStart(2, '0');
    rowData["shot created date"] = `${month}/${day}/${year} ${hours}:${minutes}:${seconds}`;

    data.push(rowData);
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
  const handicapBase = parseFloat(form.handicap.value) || 0;
  const ajusteTee = obtenerAjusteTeeActual();
  const handicapEfectivo = handicapBase + ajusteTee;

  // Actualizar display de handicap efectivo
  const box = document.getElementById("handicap-efectivo-box");
  const valorEl = document.getElementById("handicap-efectivo-valor");
  if (box && valorEl) {
    const signo = ajusteTee >= 0 ? "+" : "";
    valorEl.textContent = `${handicapBase} ${signo}${ajusteTee} = ${handicapEfectivo}`;
    box.style.display = "";
  }

  const score_neto = score_bruto - handicapEfectivo;
  form.score_bruto.value = score_bruto;
  form.score_neto.value = score_neto;
}

function obtenerAjusteTeeActual() {
  const selectTee = document.getElementById("select-tee-tarjeta");
  if (!selectTee || !selectTee.value) return 0;
  const selected = selectTee.options[selectTee.selectedIndex];
  return parseFloat(selected.dataset.ajuste) || 0;
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

// --- TOGGLE TIPO DE JUGADOR EN TARJETA ---
document.addEventListener("DOMContentLoaded", () => {
  const radios = document.querySelectorAll('input[name="tipo_jugador"]');
  const secRegistrado = document.getElementById("seccion-usuario-registrado");
  const secNuevo = document.getElementById("seccion-jugador-nuevo");
  const selectUsuario = document.getElementById("select-usuario");
  const inputNombre = document.getElementById("jugador-nombre");
  const inputApellido = document.getElementById("jugador-apellido");

  radios.forEach((radio) => {
    radio.addEventListener("change", () => {
      const esNuevo = radio.value === "nuevo" && radio.checked;
      secRegistrado.style.display = esNuevo ? "none" : "";
      secNuevo.style.display = esNuevo ? "" : "none";
      selectUsuario.required = !esNuevo;
      inputNombre.required = esNuevo;
      inputApellido.required = esNuevo;
    });
  });
});

// ============================================
// COLORES ESTÁNDAR DE TEES DE GOLF
// ============================================
const TEE_COLORS = [
  { nombre: 'Blanco',   color: '#ffffff' },
  { nombre: 'Amarillo', color: '#FFD700' },
  { nombre: 'Azul',     color: '#1565C0' },
  { nombre: 'Rojo',     color: '#C62828' },
  { nombre: 'Dorado',   color: '#F9A825' },
  { nombre: 'Negro',    color: '#212121' },
  { nombre: 'Verde',    color: '#2E7D32' },
  { nombre: 'Naranja',  color: '#E65100' },
];

function buildTeeOptions(selected = 'Blanco') {
  return TEE_COLORS.map(t =>
    `<option value="${t.nombre}" data-color="${t.color}"${t.nombre === selected ? ' selected' : ''}>${t.nombre}</option>`
  ).join('');
}

function teeColorFromSelect(selectEl) {
  if (!selectEl) return '#ffffff';
  return selectEl.options[selectEl.selectedIndex]?.dataset.color || '#ffffff';
}

// ============================================
// EDITAR TORNEO
// ============================================

document.addEventListener("DOMContentLoaded", () => {
  const selectEditar = document.getElementById("select-torneo-editar");
  if (!selectEditar) return;

  // Poblar selector de torneos para editar
  async function poblarSelectTorneosEditar() {
    selectEditar.innerHTML = '<option value="">Selecciona un torneo</option>';
    try {
      const snapshot = await getDocs(collection(db, "Torneos"));
      snapshot.forEach((d) => {
        const opt = document.createElement("option");
        opt.value = d.id;
        opt.textContent = d.data().nombre || d.id;
        selectEditar.appendChild(opt);
      });
    } catch (err) {
      console.error("Error cargando torneos:", err);
    }
  }
  poblarSelectTorneosEditar();

  selectEditar.addEventListener("change", async function () {
    const torneoId = this.value;
    const body = document.getElementById("editar-torneo-form-body");
    if (!torneoId) {
      body.style.display = "none";
      return;
    }
    await cargarTorneoParaEditar(torneoId);
    body.style.display = "";
  });
});

async function cargarTorneoParaEditar(torneoId) {
  const form = document.getElementById("editarTorneoForm");
  const status = document.getElementById("status-editar-torneo");
  try {
    const torneoSnap = await getDoc(doc(db, "Torneos", torneoId));
    if (!torneoSnap.exists()) {
      status.textContent = "Torneo no encontrado.";
      return;
    }
    const d = torneoSnap.data();
    document.getElementById("editar-torneo-id").value = torneoId;

    // Info general
    form.nombre.value = d.nombre || "";
    form.fecha_inicio.value = d.fecha_inicio || "";
    form.fecha_fin.value = d.fecha_fin || "";
    setSelectValue(form.formato, d.formato);
    setSelectValue(form.estado, d.estado);
    form.porcentaje_handicap.value = d.porcentaje_handicap ?? "";
    form.notas_admin.value = d.notas_admin || "";

    // Cancha principal
    const c = d.cancha || {};
    form.cancha_nombre.value = c.nombre || "";
    form.tee_salida.value = c.tee_salida || "Blanco";
    (c.par_por_hoyo || []).forEach((v, i) => {
      if (form[`par_hoyo_${i + 1}`]) form[`par_hoyo_${i + 1}`].value = v;
    });
    (c.yardaje_por_hoyo || []).forEach((v, i) => {
      if (form[`yardas_hoyo_${i + 1}`]) form[`yardas_hoyo_${i + 1}`].value = v;
    });
    setSelectValue(form.dureza_fairways, c.dureza_fairways);
    form.velocidad_greens.value = c.velocidad_greens ?? "";
    setSelectValue(form.dureza_greens, c.dureza_greens);
    form.velocidad_viento.value = c.velocidad_viento ?? "";
    form.direccion_viento.value = c.direccion_viento || "";

    // Tees adicionales
    const lista = document.getElementById("tees-adicionales-lista");
    lista.innerHTML = "";
    (d.tees_adicionales || []).forEach((tee) => agregarTeeAdicional(tee));

    // Premio
    form.premio_descripcion.value = d.premio?.descripcion || "";
    const premiosLista = document.getElementById("editar-premios-lista");
    premiosLista.innerHTML = "";
    (d.premio?.distribucion || []).forEach((p) => agregarPremioEditar(p));

    // Reglas
    const reglasLista = document.getElementById("editar-reglas-lista");
    reglasLista.innerHTML = "";
    (d.reglas || []).forEach((r) => agregarReglaEditar(r));

    // Fotos
    form.foto_portada.value = d.fotos?.portada || "";
    const galeriaLista = document.getElementById("editar-galeria-lista");
    galeriaLista.innerHTML = "";
    (d.fotos?.galeria || []).forEach((url) => agregarFotoGaleriaEditar(url));

    // Colores
    form.color_primario.value = d.colores?.primario || "#2d5a27";
    form.color_secundario.value = d.colores?.secundario || "#c9a227";
    form.color_fondo.value = d.colores?.fondo || "#f5f7fa";

    status.textContent = "";
  } catch (err) {
    status.textContent = "Error al cargar torneo: " + err.message;
  }
}

function setSelectValue(selectEl, value) {
  if (!selectEl || value === undefined || value === null) return;
  for (let opt of selectEl.options) {
    if (opt.value === value || opt.textContent === value) {
      selectEl.value = opt.value;
      return;
    }
  }
}

// Agrega un bloque de tee adicional al formulario de edición
window.agregarTeeAdicional = function (teeData = {}) {
  const lista = document.getElementById("tees-adicionales-lista");
  const idx = lista.children.length;
  const div = document.createElement("div");
  div.className = "tee-adicional-item";
  div.dataset.index = idx;

  const parInputs = Array.from({ length: 18 }, (_, i) =>
    `<input type="number" class="tee-par" data-hoyo="${i+1}" min="3" max="6" placeholder="${i+1}" value="${teeData.par_por_hoyo?.[i] ?? ""}" style="width:40px;">`
  ).join("");
  const yardasInputs = Array.from({ length: 18 }, (_, i) =>
    `<input type="number" class="tee-yardas" data-hoyo="${i+1}" min="50" max="700" placeholder="${i+1}" value="${teeData.yardaje_por_hoyo?.[i] ?? ""}" style="width:50px;">`
  ).join("");

  const ajuste = teeData.ajuste_handicap ?? 0;

  div.innerHTML = `
    <div class="tee-adicional-header">
      <strong>Tee adicional #${idx + 1}</strong>
      <button type="button" class="delete-btn" onclick="this.closest('.tee-adicional-item').remove(); renumerarTees()">Eliminar</button>
    </div>
    <label>Tee de salida*:<br />
      <select class="tee-nombre" required>${buildTeeOptions(teeData.nombre || 'Blanco')}</select>
    </label>
    <label style="margin-left:16px;">Ajuste de handicap (± golpes)*:<br />
      <input type="number" class="tee-ajuste-handicap" value="${ajuste}" placeholder="0" title="Positivo: tee más difícil (+n). Negativo: tee más fácil (-n)." style="width:80px;" />
      <span class="tee-ajuste-hint">Ej: +2 suma 2 golpes al hándicap, -2 los resta</span>
    </label><br />
    <label>Par por hoyo*:<br />
      <div style="display:flex;flex-wrap:wrap;gap:2px;">${parInputs}</div>
    </label><br />
    <label>Yardaje por hoyo*:<br />
      <div style="display:flex;flex-wrap:wrap;gap:2px;">${yardasInputs}</div>
    </label>
  `;
  lista.appendChild(div);
};

window.renumerarTees = function () {
  const items = document.querySelectorAll(".tee-adicional-item");
  items.forEach((item, i) => {
    const header = item.querySelector("strong");
    if (header) header.textContent = `Tee adicional #${i + 1}`;
  });
};

// --- Premios / reglas / galería duplicados para el form de edición ---
window.agregarPremioEditar = function (premioData = {}) {
  const lista = document.getElementById("editar-premios-lista");
  const div = document.createElement("div");
  div.className = "premio-item";
  div.innerHTML = `Posición: <input type="number" class="premio-posicion" min="1" required style="width:50px;" value="${premioData.posicion || ""}"> Recompensa: <input type="text" class="premio-recompensa" required value="${premioData.recompensa || ""}"> <button type="button" onclick="this.parentNode.remove()">Eliminar</button>`;
  lista.appendChild(div);
};

window.agregarReglaEditar = function (valor = "") {
  const lista = document.getElementById("editar-reglas-lista");
  const input = document.createElement("input");
  input.type = "text";
  input.className = "regla-item";
  input.placeholder = "Regla específica";
  input.value = typeof valor === "string" ? valor : "";
  const btn = document.createElement("button");
  btn.type = "button";
  btn.textContent = "Eliminar";
  btn.onclick = function () { input.remove(); btn.remove(); };
  lista.appendChild(input);
  lista.appendChild(btn);
};

window.agregarFotoGaleriaEditar = function (url = "") {
  const lista = document.getElementById("editar-galeria-lista");
  const input = document.createElement("input");
  input.type = "url";
  input.className = "galeria-item";
  input.placeholder = "URL de la foto";
  input.value = typeof url === "string" ? url : "";
  const btn = document.createElement("button");
  btn.type = "button";
  btn.textContent = "Eliminar";
  btn.onclick = function () { input.remove(); btn.remove(); };
  lista.appendChild(input);
  lista.appendChild(btn);
};

// --- SUBMIT de editar torneo ---
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("editarTorneoForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.target;
    const torneoId = document.getElementById("editar-torneo-id").value;
    const status = document.getElementById("status-editar-torneo");
    if (!torneoId) { status.textContent = "No hay torneo seleccionado."; return; }

    // Leer tees adicionales
    const teeItems = document.querySelectorAll(".tee-adicional-item");
    const teesAdicionales = Array.from(teeItems).map((item) => ({
      nombre: item.querySelector(".tee-nombre")?.value || "",
      color: teeColorFromSelect(item.querySelector(".tee-nombre")),
      ajuste_handicap: parseFloat(item.querySelector(".tee-ajuste-handicap")?.value) || 0,
      par_por_hoyo: Array.from(item.querySelectorAll(".tee-par")).map((inp) => parseInt(inp.value) || 0),
      yardaje_por_hoyo: Array.from(item.querySelectorAll(".tee-yardas")).map((inp) => parseInt(inp.value) || 0),
    }));

    const datos = {
      nombre: form.nombre.value,
      fecha_inicio: form.fecha_inicio.value,
      fecha_fin: form.fecha_fin.value,
      formato: form.formato.value,
      estado: form.estado.value,
      porcentaje_handicap: parseFloat(form.porcentaje_handicap.value),
      notas_admin: form.notas_admin.value,
      cancha: {
        nombre: form.cancha_nombre.value,
        tee_salida: form.tee_salida.value,
        tee_color: teeColorFromSelect(form.tee_salida),
        par_por_hoyo: Array.from({ length: 18 }, (_, i) => parseInt(form[`par_hoyo_${i + 1}`].value)),
        yardaje_por_hoyo: Array.from({ length: 18 }, (_, i) => parseInt(form[`yardas_hoyo_${i + 1}`].value)),
        dureza_fairways: form.dureza_fairways.value,
        velocidad_greens: parseFloat(form.velocidad_greens.value),
        dureza_greens: form.dureza_greens.value,
        velocidad_viento: parseFloat(form.velocidad_viento.value),
        direccion_viento: form.direccion_viento.value,
      },
      tees_adicionales: teesAdicionales,
      premio: {
        descripcion: form.premio_descripcion.value,
        distribucion: Array.from(document.querySelectorAll("#editar-premios-lista .premio-item")).map((row) => ({
          posicion: parseInt(row.querySelector(".premio-posicion").value),
          recompensa: row.querySelector(".premio-recompensa").value,
        })),
      },
      reglas: Array.from(document.querySelectorAll("#editar-reglas-lista .regla-item")).map((inp) => inp.value),
      fotos: {
        portada: form.foto_portada.value,
        galeria: Array.from(document.querySelectorAll("#editar-galeria-lista .galeria-item")).map((inp) => inp.value),
      },
      colores: {
        primario: form.color_primario.value,
        secundario: form.color_secundario.value,
        fondo: form.color_fondo.value,
      },
      fecha_actualizacion: new Date().toISOString(),
    };

    try {
      status.textContent = "Guardando...";
      await updateDoc(doc(db, "Torneos", torneoId), datos);
      status.textContent = "Torneo actualizado correctamente.";
      status.style.color = "var(--success-color)";
    } catch (err) {
      status.textContent = "Error al guardar: " + err.message;
      status.style.color = "var(--danger-color)";
    }
  });
});

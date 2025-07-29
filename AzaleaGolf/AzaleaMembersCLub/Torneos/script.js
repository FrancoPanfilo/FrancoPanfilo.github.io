import { db, collection, getDocs, getDoc, doc, query, orderBy } from "../db.js";

import { auth } from "../firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js";

// Referencias a elementos del DOM
const torneosContainer = document.getElementById("torneos-container");
const torneoTemplate = document.getElementById("torneo-template");
const leaderboardItemTemplate = document.getElementById(
  "leaderboard-item-template"
);
const estadoFilter = document.getElementById("estado-filter");
const modal = document.getElementById("torneo-modal");
const closeModal = document.querySelector(".close-modal");

// Verificar si los elementos críticos existen
console.log("Modal encontrado:", modal ? "Sí" : "No");
console.log("Close modal encontrado:", closeModal ? "Sí" : "No");
console.log("Torneo template encontrado:", torneoTemplate ? "Sí" : "No");
console.log(
  "Leaderboard template encontrado:",
  leaderboardItemTemplate ? "Sí" : "No"
);

// Variables globales
let torneos = [];
let currentUser = null;

// Función para formatear fechas
function formatDate(dateString) {
  const options = { day: "2-digit", month: "short", year: "numeric" };
  return new Date(dateString).toLocaleDateString("es-ES", options);
}

// Función para formatear fechas con hora
function formatDateTime(dateString) {
  const options = {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  };
  return new Date(dateString).toLocaleString("es-ES", options);
}

// Función para cargar los torneos desde Firebase
async function loadTorneos() {
  try {
    torneosContainer.innerHTML = `
      <div class="loading-spinner">
        <i class="fas fa-spinner fa-spin"></i>
        <p>Cargando torneos...</p>
      </div>
    `;

    const torneosRef = collection(db, "Torneos");
    const q = query(torneosRef, orderBy("fecha_inicio", "desc"));
    const querySnapshot = await getDocs(q);

    torneosContainer.innerHTML = "";

    if (querySnapshot.empty) {
      torneosContainer.innerHTML = `
        <div class="no-torneos">
          <i class="fas fa-info-circle"></i>
          <p>No hay torneos disponibles en este momento.</p>
        </div>
      `;
      return;
    }

    torneos = [];
    querySnapshot.forEach((doc) => {
      const torneoData = doc.data();
      torneos.push({
        id: doc.id,
        ...torneoData,
      });
    });

    filterTorneos();
  } catch (error) {
    console.error("Error al cargar torneos:", error);
    torneosContainer.innerHTML = `
      <div class="error-message">
        <i class="fas fa-exclamation-triangle"></i>
        <p>Error al cargar los torneos. Por favor, intenta de nuevo más tarde.</p>
      </div>
    `;
  }
}

// Función para filtrar torneos
function filterTorneos() {
  const filtroEstado = estadoFilter.value;
  torneosContainer.innerHTML = "";
  const torneosFiltrados =
    filtroEstado === "todos"
      ? torneos
      : torneos.filter((torneo) => torneo.estado === filtroEstado);

  if (torneosFiltrados.length === 0) {
    torneosContainer.innerHTML = `
      <div class="no-torneos">
        <i class="fas fa-info-circle"></i>
        <p>No hay torneos con el filtro seleccionado.</p>
      </div>
    `;
    return;
  }

  torneosFiltrados.forEach(renderTorneo);
}

// Función para renderizar un torneo
function renderTorneo(torneo) {
  const torneoCard = torneoTemplate.content.cloneNode(true);
  const torneoHeader = torneoCard.querySelector(".torneo-header");
  const torneoEstado = torneoCard.querySelector(".torneo-estado");
  const torneoNombre = torneoCard.querySelector(".torneo-nombre");
  const torneoFecha = torneoCard.querySelector(".torneo-fecha");
  const canchaNombre = torneoCard.querySelector(".cancha-nombre");
  const formatoNombre = torneoCard.querySelector(".formato-nombre");
  const leaderboardContainer = torneoCard.querySelector(
    ".leaderboard-container"
  );
  const btnVerDetalles = torneoCard.querySelector(".btn-ver-detalles");

  if (torneo.fotos && torneo.fotos.portada) {
    torneoHeader.style.backgroundImage = `url(${torneo.fotos.portada})`;
  } else {
    torneoHeader.style.backgroundImage =
      "url('../img/golf-course-default.svg')";
  }

  if (torneo.colores) {
    if (torneo.colores.primario)
      torneoHeader.style.setProperty(
        "--torneo-color-primario",
        torneo.colores.primario
      );
    if (torneo.colores.secundario)
      torneoHeader.style.setProperty(
        "--torneo-color-secundario",
        torneo.colores.secundario
      );
  }

  torneoEstado.textContent = torneo.estado || "Próximo";
  torneoEstado.classList.add(
    torneo.estado ? torneo.estado.toLowerCase() : "proximo"
  );
  torneoNombre.textContent = torneo.nombre;
  torneoFecha.textContent = `${formatDate(torneo.fecha_inicio)} - ${formatDate(
    torneo.fecha_fin
  )}`;
  canchaNombre.textContent = torneo.cancha
    ? torneo.cancha.nombre
    : "Cancha no especificada";
  formatoNombre.textContent = torneo.formato || "Formato no especificado";

  if (torneo.tarjetas && torneo.tarjetas.length > 0) {
    const tarjetasOrdenadas = [...torneo.tarjetas].sort(
      (a, b) => a.score_neto - b.score_neto
    );
    const tarjetasMostradas = tarjetasOrdenadas.slice(0, 5);

    tarjetasMostradas.forEach((tarjeta, index) => {
      console.log(tarjeta);
      const leaderboardItem = leaderboardItemTemplate.content.cloneNode(true);
      leaderboardItem.querySelector(".leaderboard-position").textContent =
        index + 1;
      leaderboardItem.querySelector(".player-name").textContent =
        tarjeta.nombre_usuario;
      leaderboardItem.querySelector(".score-bruto").textContent =
        tarjeta.score_bruto;
      leaderboardItem.querySelector(
        ".score-neto"
      ).textContent = `(${tarjeta.score_neto})`;
      leaderboardContainer.appendChild(leaderboardItem);
    });

    if (tarjetasOrdenadas.length > 5) {
      const verMasItem = document.createElement("div");
      verMasItem.className = "leaderboard-item ver-mas";
      verMasItem.innerHTML = `<div class="ver-mas-text">Ver todos (${tarjetasOrdenadas.length})</div>`;
      leaderboardContainer.appendChild(verMasItem);
    }
  } else {
    const noTarjetasItem = document.createElement("div");
    noTarjetasItem.className = "leaderboard-item no-tarjetas";
    noTarjetasItem.innerHTML = `<div class="no-tarjetas-text">No hay participantes registrados</div>`;
    leaderboardContainer.appendChild(noTarjetasItem);
  }

  btnVerDetalles.addEventListener("click", (event) => {
    console.log("Botón Ver Detalles clickeado para torneo:", torneo.nombre);
    event.preventDefault();
    event.stopPropagation();
    showTorneoDetails(torneo);
  });

  torneosContainer.appendChild(torneoCard);
}

// Función para mostrar detalles del torneo en el modal
function showTorneoDetails(torneo) {
  console.log("Intentando mostrar modal para torneo:", torneo.nombre);
  if (!modal) {
    console.error("Elemento modal no encontrado en el DOM");
    return;
  }

  // Configurar información básica
  document.getElementById("modal-torneo-nombre").textContent = torneo.nombre;
  document.getElementById("modal-fecha-inicio").textContent = formatDateTime(
    torneo.fecha_inicio
  );
  document.getElementById("modal-fecha-fin").textContent = formatDateTime(
    torneo.fecha_fin
  );
  document.getElementById("modal-formato").textContent =
    torneo.formato || "No especificado";
  document.getElementById("modal-estado").textContent =
    torneo.estado || "No especificado";

  // Configurar imagen de portada
  const modalImage = document.getElementById("modal-torneo-imagen");
  if (modalImage) {
    modalImage.style.backgroundImage =
      torneo.fotos && torneo.fotos.portada
        ? `url(${torneo.fotos.portada})`
        : "url('../img/golf-course-default.svg')";
    if (torneo.colores) {
      if (torneo.colores.primario)
        modalImage.style.setProperty(
          "--torneo-color-primario",
          torneo.colores.primario
        );
      if (torneo.colores.secundario)
        modalImage.style.setProperty(
          "--torneo-color-secundario",
          torneo.colores.secundario
        );
    }
  } else {
    console.error("Elemento modal-torneo-imagen no encontrado");
  }

  // Configurar información de la cancha
  if (torneo.cancha) {
    document.getElementById("modal-cancha-nombre").textContent =
      torneo.cancha.nombre || "No especificado";
    document.getElementById("modal-tee-salida").textContent =
      torneo.cancha.tee_salida || "No especificado";
    document.getElementById("modal-dureza-fairways").textContent =
      torneo.cancha.dureza_fairways || "No especificado";
    document.getElementById("modal-velocidad-greens").textContent = `${
      torneo.cancha.velocidad_greens || "No especificado"
    } pies`;
  }

  // Configurar reglas
  const reglasContainer = document.getElementById("modal-reglas");
  reglasContainer.innerHTML = "";
  if (torneo.reglas && torneo.reglas.length > 0) {
    torneo.reglas.forEach((regla) => {
      const li = document.createElement("li");
      li.textContent = regla;
      reglasContainer.appendChild(li);
    });
  } else {
    const li = document.createElement("li");
    li.textContent = "No hay reglas específicas definidas para este torneo.";
    reglasContainer.appendChild(li);
  }

  // Configurar leaderboard completo
  const leaderboardContainer = document.getElementById("modal-leaderboard");
  leaderboardContainer.innerHTML = "";
  if (torneo.tarjetas && torneo.tarjetas.length > 0) {
    const tarjetasOrdenadas = [...torneo.tarjetas].sort(
      (a, b) => a.score_neto - b.score_neto
    );
    tarjetasOrdenadas.forEach((tarjeta, index) => {
      const leaderboardItem = leaderboardItemTemplate.content.cloneNode(true);
      leaderboardItem.querySelector(".leaderboard-position").textContent =
        index + 1;
      leaderboardItem.querySelector(".player-name").textContent =
        tarjeta.nombre_usuario;
      leaderboardItem.querySelector(".score-bruto").textContent =
        tarjeta.score_bruto;
      leaderboardItem.querySelector(
        ".score-neto"
      ).textContent = `(${tarjeta.score_neto})`;
      leaderboardContainer.appendChild(leaderboardItem);
    });
  } else {
    const noTarjetasItem = document.createElement("div");
    noTarjetasItem.className = "leaderboard-item no-tarjetas";
    noTarjetasItem.innerHTML = `<div class="no-tarjetas-text">No hay participantes registrados</div>`;
    leaderboardContainer.appendChild(noTarjetasItem);
  }

  // Mostrar el modal
  modal.style.display = "block";
  console.log(
    "Modal debería estar visible. Estilo actual:",
    modal.style.display
  );
}

// Evento para cerrar el modal
if (closeModal) {
  closeModal.addEventListener("click", (event) => {
    console.log("Botón cerrar modal clickeado");
    event.preventDefault();
    event.stopPropagation();
    if (modal) modal.style.display = "none";
  });
} else {
  console.error("Elemento closeModal no encontrado");
}

// Cerrar modal al hacer clic fuera del contenido
window.addEventListener("click", (event) => {
  if (modal && event.target === modal) {
    console.log("Clic fuera del contenido del modal");
    modal.style.display = "none";
  }
});

// Evento para filtrar torneos
estadoFilter.addEventListener("change", filterTorneos);

// Verificar estado de autenticación
onAuthStateChanged(auth, (user) => {
  currentUser = user;
  const authButton = document.querySelector(".auth-button");
  if (user) {
    authButton.innerHTML = `
      <i class="fas fa-sign-out-alt"></i>
      <span>Cerrar Sesión</span>
    `;
    authButton.href = "#";
    authButton.addEventListener("click", (e) => {
      e.preventDefault();
      auth.signOut();
    });
  } else {
    authButton.innerHTML = `
      <i class="fas fa-sign-in-alt"></i>
      <span>Iniciar Sesión</span>
    `;
    authButton.href = "../login.html";
  }
  loadTorneos();
});

// Manejar el menú móvil
const mobileMenuToggle = document.querySelector(".mobile-menu-toggle");
const navMenu = document.querySelector(".nav-menu");
mobileMenuToggle.addEventListener("click", () => {
  mobileMenuToggle.classList.toggle("active");
  navMenu.classList.toggle("active");
});

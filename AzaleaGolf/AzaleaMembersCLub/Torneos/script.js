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

// Variables globales
let torneos = [];
let currentUser = null;

// Formateo de fechas
function formatDate(dateString) {
  const options = { day: "2-digit", month: "short", year: "numeric" };
  return new Date(dateString).toLocaleDateString("es-ES", options);
}
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

// Cargar torneos desde Firebase
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

// Filtrar torneos
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

// Renderizar un torneo
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
    event.preventDefault();
    event.stopPropagation();
    showTorneoDetails(torneo);
  });

  torneosContainer.appendChild(torneoCard);
}

// Mostrar detalles del torneo en el modal (Leaderboard formato tabla Masters)
function showTorneoDetails(torneo) {
  if (!modal) {
    console.error("Elemento modal no encontrado en el DOM");
    return;
  }

  // Info básica
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
  }

  // Info de la cancha
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

  // Reglas
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

  // Leaderboard como tabla tipo Masters
  const leaderboardContainer = document.getElementById("modal-leaderboard");
  leaderboardContainer.innerHTML = "";
  if (torneo.tarjetas && torneo.tarjetas.length > 0) {
    // Ordena por score neto
    const tarjetasOrdenadas = [...torneo.tarjetas].sort(
      (a, b) => a.score_neto - b.score_neto
    );
    let tabla = `<table class="w-full border-collapse shadow-lg leaderboard-table" role="grid" aria-label="Leaderboard de golf">
      <thead>
          <tr class="bg-green-900 text-white">
              <th class="py-3 px-6">Pos</th>
              <th class="py-3 px-6">Nombre</th>
              <th class="py-3 px-6">Handicap</th>
              <th class="py-3 px-6">Score Bruto</th>
              <th class="py-3 px-6">Score Neto</th>
              <th class="py-3 px-6" aria-hidden="true"></th>
          </tr>
      </thead>
      <tbody>`;
    tarjetasOrdenadas.forEach((tarjeta, index) => {
      let colorClass = "text-yellow-600";
      if (tarjeta.score_neto < 0) colorClass = "text-green-600";
      if (tarjeta.score_neto > 0) colorClass = "text-red-600";
      const leaderClass =
        index === 0
          ? "leader"
          : index % 2 === 0
          ? "bg-gray-100 hover:bg-gray-200"
          : "bg-white hover:bg-gray-50";
      tabla += `
        <tr class="${leaderClass}">
          <td class="py-3 px-6">${index + 1}</td>
          <td class="py-3 px-6">${tarjeta.nombre_usuario}</td>
          <td class="py-3 px-6 text-center">${tarjeta.handicap ?? ""}</td>
          <td class="py-3 px-6 text-center">${tarjeta.score_bruto ?? ""}</td>
          <td class="py-3 px-6 text-center ${colorClass}">${tarjeta.score_neto ?? ""}</td>
          <td class="py-3 px-6 text-center">
            <a href="#" class="scorecard-icon" aria-label="Ver tarjeta de score de ${tarjeta.nombre_usuario}" onclick="mostrarTarjetaDetalle('${encodeURIComponent(
              torneo.id
            )}', ${index});return false;">
              <i class="fas fa-clipboard-list"></i>
            </a>
          </td>
        </tr>
      `;
    });
    tabla += "</tbody></table>";
    leaderboardContainer.innerHTML = tabla;
  } else {
    leaderboardContainer.innerHTML =
      '<div class="no-tarjetas-text">No hay participantes registrados</div>';
  }

  modal.style.display = "block";
}

// Mostrar detalle de la tarjeta de score (scorecard) en modal aparte
window.mostrarTarjetaDetalle = function (torneoId, tarjetaIndex) {
  const torneo = torneos.find((t) => t.id === decodeURIComponent(torneoId));
  if (!torneo || !torneo.tarjetas || !torneo.tarjetas[tarjetaIndex]) return;
  const tarjeta = torneo.tarjetas[tarjetaIndex];

  let html = `<h3>Tarjeta de ${tarjeta.nombre_usuario}</h3>
    <table border="1" style="margin:10px 0;width:100%;text-align:center">
      <tr>
        <th>Hoyo</th>
        <th>Golpes</th>
        <th>Fairway</th>
        <th>Green</th>
      </tr>`;
  (tarjeta.scores || []).forEach((s) => {
    html += `<tr>
      <td>${s.hoyo}</td>
      <td>${s.golpes}</td>
      <td>${s.fairway ? "✔️" : "❌"}</td>
      <td>${s.green ? "✔️" : "❌"}</td>
    </tr>`;
  });
  html += "</table>";
  html += `<button onclick="document.getElementById('scorecard-modal').style.display='none'" class="btn btn-secondary" style="margin-top:10px">Cerrar</button>`;

  let scorecardModal = document.getElementById("scorecard-modal");
  if (!scorecardModal) {
    scorecardModal = document.createElement("div");
    scorecardModal.id = "scorecard-modal";
    scorecardModal.style =
      "position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.7);z-index:9999;display:flex;align-items:center;justify-content:center;";
    document.body.appendChild(scorecardModal);
  }
  scorecardModal.innerHTML = `<div style="background:#fff;padding:30px;max-width:400px;border-radius:10px;text-align:center;position:relative;">${html}</div>`;
  scorecardModal.style.display = "flex";
  scorecardModal.onclick = function (e) {
    if (e.target === scorecardModal) scorecardModal.style.display = "none";
  };
};

// Cerrar modal torneo
if (closeModal) {
  closeModal.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (modal) modal.style.display = "none";
  });
}
window.addEventListener("click", (event) => {
  if (modal && event.target === modal) modal.style.display = "none";
});

// Evento filtro
estadoFilter.addEventListener("change", filterTorneos);

// Estado de autenticación
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

// Menú móvil
const mobileMenuToggle = document.querySelector(".mobile-menu-toggle");
const navMenu = document.querySelector(".nav-menu");
mobileMenuToggle.addEventListener("click", () => {
  mobileMenuToggle.classList.toggle("active");
  navMenu.classList.toggle("active");
});

import { db, collection, getDocs, getDoc, doc, query, orderBy } from "../db.js";
import { auth } from "../firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js";

const torneosContainer = document.getElementById("torneos-container");
const torneoTemplate = document.getElementById("torneo-template");
const estadoFilter = document.getElementById("estado-filter");
const modal = document.getElementById("torneo-modal");
const closeModal = document.querySelector(".close-modal");

let torneos = [];
let currentUser = null;

function formatDate(dateString) {
  const options = { day: "2-digit", month: "short", year: "numeric" };
  return new Date(dateString).toLocaleDateString("es-ES", options);
}
function formatDateTime(dateString) {
  const options = {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit"
  };
  return new Date(dateString).toLocaleString("es-ES", options);
}
function formatNetoRelativo(scoreNeto, parTotal) {
  const diff = scoreNeto - parTotal;
  if (diff === 0) return "Par";
  if (diff > 0) return `+${diff}`;
  return `${diff}`;
}

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

function renderTorneo(torneo) {
  const torneoCard = torneoTemplate.content.cloneNode(true);
  const torneoHeader = torneoCard.querySelector(".torneo-header");
  const torneoEstado = torneoCard.querySelector(".torneo-estado");
  const torneoNombre = torneoCard.querySelector(".torneo-nombre");
  const torneoFecha = torneoCard.querySelector(".torneo-fecha");
  const canchaNombre = torneoCard.querySelector(".cancha-nombre");
  const formatoNombre = torneoCard.querySelector(".formato-nombre");
  const btnVerDetalles = torneoCard.querySelector(".btn-ver-detalles");

  if (torneo.fotos && torneo.fotos.portada) {
    torneoHeader.style.backgroundImage = `url(${torneo.fotos.portada})`;
  } else {
    torneoHeader.style.backgroundImage =
      "url('../img/golf-course-default.svg')";
  }

  if (torneo.colores) {
    torneoCard.firstElementChild.style.setProperty('--torneo-color-primario', torneo.colores.primario || "#1a3a1a");
    torneoCard.firstElementChild.style.setProperty('--torneo-color-secundario', torneo.colores.secundario || "#fff");
    torneoCard.firstElementChild.style.setProperty('--torneo-color-fondo', torneo.colores.fondo || "#e6ffe6");
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

  btnVerDetalles.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    showTorneoDetails(torneo);
  });

  torneosContainer.appendChild(torneoCard);
}

// Leaderboard tipo Masters (score neto relativo al par y colores personalizados)
function showTorneoDetails(torneo) {
  if (!modal) {
    console.error("Elemento modal no encontrado en el DOM");
    return;
  }

  // Colores personalizados
  const colores = torneo.colores || {};
  const colorPrimario = colores.primario || '#1a3a1a';
  const colorSecundario = colores.secundario || '#fff';
  const colorFondo = colores.fondo || '#e6ffe6';

  modal.style.setProperty('--torneo-color-primario', colorPrimario);
  modal.style.setProperty('--torneo-color-secundario', colorSecundario);
  modal.style.setProperty('--torneo-color-fondo', colorFondo);

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

  // Leaderboard tipo tabla Masters (único leaderboard)
  const leaderboardContainer = document.getElementById("modal-leaderboard");
  leaderboardContainer.innerHTML = "";
  if (torneo.tarjetas && torneo.tarjetas.length > 0) {
    // Par total de la cancha
    const parTotal = torneo.cancha && torneo.cancha.par_por_hoyo
      ? torneo.cancha.par_por_hoyo.reduce((acc, v) => acc + v, 0)
      : 0;

    const tarjetasOrdenadas = [...torneo.tarjetas].sort(
      (a, b) => a.score_neto - b.score_neto
    );
    let tabla = `<div class="leaderboard-table-wrapper" style="--color-primario:${colorPrimario};--color-secundario:${colorSecundario};--color-fondo:${colorFondo};">
      <table class="leaderboard-table" role="grid" aria-label="Leaderboard de golf">
      <thead>
          <tr>
              <th>Pos</th>
              <th>Nombre</th>
              <th>Handicap</th>
              <th>Score Bruto</th>
              <th>Score Neto</th>
              <th aria-hidden="true"></th>
          </tr>
      </thead>
      <tbody>`;
    tarjetasOrdenadas.forEach((tarjeta, index) => {
      const netoRelativo = formatNetoRelativo(tarjeta.score_neto, parTotal);
      let colorClass = "par";
      if (netoRelativo === "Par") colorClass = "par";
      else if(netoRelativo.startsWith("-")) colorClass = "menos";
      else colorClass = "mas";
      const leaderClass = index === 0 ? "leader" : "";
      tabla += `
        <tr class="${leaderClass}">
          <td>${index + 1}</td>
          <td>${tarjeta.nombre_usuario}</td>
          <td>${tarjeta.handicap ?? ""}</td>
          <td>${tarjeta.score_bruto ?? ""}</td>
          <td class="${colorClass}">${netoRelativo}</td>
          <td>
  <a href="#" class="scorecard-icon" aria-label="Ver tarjeta de score de ${tarjeta.nombre_usuario}"
     onclick="mostrarTarjetaDetalle('${encodeURIComponent(torneo.id)}', '${encodeURIComponent(tarjeta.id_usuario)}');return false;">
    <i class="fas fa-clipboard-list"></i>
  </a>
</td>
        </tr>
      `;
    });
    tabla += "</tbody></table></div>";
    leaderboardContainer.innerHTML = tabla;
  } else {
    leaderboardContainer.innerHTML =
      '<div class="no-tarjetas-text">No hay participantes registrados</div>';
  }

  modal.style.display = "block";
}

// Tarjeta horizontal por jugador (scorecard)
window.mostrarTarjetaDetalle = function (torneoId, tarjetaIndex) {
  const torneo = torneos.find((t) => t.id === decodeURIComponent(torneoId));
  if (!torneo || !torneo.tarjetas) return;
  // Busca la tarjeta por id, ajusta el campo si usas otro identificador
  const tarjeta = torneo.tarjetas.find(t => t.id == decodeURIComponent(tarjetaId));
  if (!tarjeta) return;
  const scores = tarjeta.scores || [];
  const yardas = torneo.cancha ? torneo.cancha.yardaje_por_hoyo || [] : [];
  const pares = torneo.cancha ? torneo.cancha.par_por_hoyo || [] : [];

  let html = `<h3>Tarjeta de ${tarjeta.nombre_usuario}</h3>
    <div style="overflow-x:auto">
    <table class="scorecard-horizontal">
      <tr>
        <th>Hoyo</th>
        ${scores.map(s => `<td>${s.hoyo}</td>`).join("")}
      </tr>
      <tr>
        <th>Yardas</th>
        ${scores.map(s => `<td>${yardas[s.hoyo-1] ?? ""}</td>`).join("")}
      </tr>
      <tr>
        <th>Par</th>
        ${scores.map(s => `<td>${pares[s.hoyo-1] ?? ""}</td>`).join("")}
      </tr>
<tr>
  <th>Golpes</th>
  ${scores.map((s, idx) => {
    const par = pares[s.hoyo-1] ?? null;
    if (par === null) return `<td>${s.golpes ?? ""}</td>`;
    let contenido = s.golpes ?? "";
    if (typeof s.golpes !== "number") return `<td>${contenido}</td>`;
    const diff = s.golpes - par;
    // Máximo de 3 círculos o cuadrados
    if (diff < 0) {
      // Bajo par
      const level = Math.max(diff, -3) * -1; // 1, 2, 3
      contenido = `<span class="score-circulo score-circulo-${level}">${contenido}</span>`;
    } else if (diff > 0) {
      // Sobre par
      const level = Math.min(diff, 3); // 1, 2, 3
      contenido = `<span class="score-cuadrado score-cuadrado-${level}">${contenido}</span>`;
    }
    return `<td>${contenido}</td>`;
  }).join("")}
</tr>
      <tr>
        <th>Fairway</th>
        ${scores.map(s => `<td>${s.fairway ? "✔️" : "❌"}</td>`).join("")}
      </tr>
      <tr>
        <th>Green Reg.</th>
        ${scores.map(s => `<td>${s.green ? "✔️" : "❌"}</td>`).join("")}
      </tr>
    </table>
    </div>
    <button onclick="document.getElementById('scorecard-modal').style.display='none'" class="btn btn-secondary" style="margin-top:10px">Cerrar</button>`;

  let scorecardModal = document.getElementById("scorecard-modal");
  if (!scorecardModal) {
    scorecardModal = document.createElement("div");
    scorecardModal.id = "scorecard-modal";
    scorecardModal.style =
      "position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.7);z-index:9999;display:flex;align-items:center;justify-content:center;";
    document.body.appendChild(scorecardModal);
  }
  scorecardModal.innerHTML = `<div style="background:#fff;padding:30px;border-radius:10px;text-align:center;position:relative;">${html}</div>`;
  scorecardModal.style.display = "flex";
  scorecardModal.onclick = function (e) {
    if (e.target === scorecardModal) scorecardModal.style.display = "none";
  };
};

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

estadoFilter.addEventListener("change", filterTorneos);

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

const mobileMenuToggle = document.querySelector(".mobile-menu-toggle");
const navMenu = document.querySelector(".nav-menu");
mobileMenuToggle.addEventListener("click", () => {
  mobileMenuToggle.classList.toggle("active");
  navMenu.classList.toggle("active");
});

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
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  };
  return new Date(dateString).toLocaleString("es-ES", options);
}
function formatNetoRelativo(scoreNeto, parTotal) {
  const diff = scoreNeto - parTotal;
  if (diff === 0) return "Par";
  if (diff > 0) return `+${diff}`;
  return `${diff}`;
}

function calcularDistanciaTotal(cancha) {
  if (
    !cancha ||
    !cancha.yardaje_por_hoyo ||
    !Array.isArray(cancha.yardaje_por_hoyo)
  ) {
    return "N/A";
  }

  const distanciaTotal = cancha.yardaje_por_hoyo.reduce((total, yardas) => {
    return total + (parseInt(yardas) || 0);
  }, 0);

  return distanciaTotal > 0 ? `${distanciaTotal.toLocaleString()} yds` : "N/A";
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
  const canchaDistancia = torneoCard.querySelector(".cancha-distancia");
  const formatoNombre = torneoCard.querySelector(".formato-nombre");
  const btnVerDetalles = torneoCard.querySelector(".btn-ver-detalles");

  if (torneo.fotos && torneo.fotos.portada) {
    torneoHeader.style.backgroundImage = `url(${torneo.fotos.portada})`;
  } else {
    torneoHeader.style.backgroundImage =
      "url('../img/golf-course-default.svg')";
  }

  if (torneo.colores) {
    torneoCard.firstElementChild.style.setProperty(
      "--torneo-color-primario",
      torneo.colores.primario || "#1a3a1a"
    );
    torneoCard.firstElementChild.style.setProperty(
      "--torneo-color-secundario",
      torneo.colores.secundario || "#fff"
    );
    torneoCard.firstElementChild.style.setProperty(
      "--torneo-color-fondo",
      torneo.colores.fondo || "#e6ffe6"
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
  canchaDistancia.textContent = calcularDistanciaTotal(torneo.cancha);
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
  const colorPrimario = colores.primario || "#1a3a1a";
  const colorSecundario = colores.secundario || "#fff";
  const colorFondo = colores.fondo || "#e6ffe6";

  modal.style.setProperty("--torneo-color-primario", colorPrimario);
  modal.style.setProperty("--torneo-color-secundario", colorSecundario);
  modal.style.setProperty("--torneo-color-fondo", colorFondo);

  // Info básica
  document.getElementById("modal-torneo-nombre").textContent = torneo.nombre;
  document.getElementById("modal-fecha-inicio").textContent = formatDate(
    torneo.fecha_inicio
  );
  document.getElementById("modal-fecha-fin").textContent = formatDate(
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
    document.getElementById("modal-distancia-total").textContent =
      calcularDistanciaTotal(torneo.cancha);
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
    const parTotal =
      torneo.cancha && torneo.cancha.par_por_hoyo
        ? torneo.cancha.par_por_hoyo.reduce((acc, v) => acc + v, 0)
        : 0;

    const tarjetasOrdenadas = [...torneo.tarjetas].sort(
      (a, b) => a.score_neto - b.score_neto
    );
    let tabla = `<div class="leaderboard-table-wrapper" style="--color-primario:${colorPrimario};--color-secundario:${colorSecundario};--color-fondo:${colorFondo};">
      <table class="leaderboard-table" role="grid" aria-label="Leaderboard de golf">
      <thead>
          <tr>
              <th>#</th>
              <th>Nombre</th>
              <th>Hcp</th>
              <th>Score</th>
              <th>Neto</th>
              <th aria-hidden="true"></th>
          </tr>
      </thead>
      <tbody>`;
    tarjetasOrdenadas.forEach((tarjeta, index) => {
      const netoRelativo = formatNetoRelativo(tarjeta.score_neto, parTotal);
      let colorClass = "par";
      if (netoRelativo === "Par") colorClass = "par";
      else if (netoRelativo.startsWith("-")) colorClass = "menos";
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
  <a href="#" class="scorecard-icon" aria-label="Ver tarjeta de score de ${
    tarjeta.nombre_usuario
  }"
     onclick="mostrarTarjetaDetalle('${encodeURIComponent(
       torneo.id
     )}', '${encodeURIComponent(tarjeta.id_usuario)}');return false;">
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

  // Agregar funcionalidad de colapso para móviles
  initializeCollapsibleSections();

  // Mostrar el modal
  modal.style.display = "block";
  modal.style.visibility = "visible";
  modal.style.opacity = "1";
  modal.style.zIndex = "99999";
  modal.style.position = "fixed";
  modal.style.top = "0";
  modal.style.left = "0";
  modal.style.width = "100%";
  modal.style.height = "100%";
  modal.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
}

// Función para inicializar las secciones colapsables
function initializeCollapsibleSections() {
  const collapsibleHeaders = document.querySelectorAll(".collapsible-header");

  // Remover event listeners anteriores para evitar duplicados
  collapsibleHeaders.forEach((header) => {
    const newHeader = header.cloneNode(true);
    header.parentNode.replaceChild(newHeader, header);
  });

  // Obtener headers actualizados después del clonado
  const updatedHeaders = document.querySelectorAll(".collapsible-header");

  updatedHeaders.forEach((header) => {
    header.addEventListener("click", function () {
      const section = this.closest(".collapsible-section");
      const isExpanded = section.classList.contains("expanded");

      // En móviles, alternar la clase expanded
      if (window.innerWidth <= 768) {
        if (isExpanded) {
          section.classList.remove("expanded");
        } else {
          section.classList.add("expanded");
        }
      }
    });
  });

  // Configurar estado inicial basado en el tamaño de pantalla
  handleResponsiveCollapse();
}

// Función para manejar el colapso responsivo
function handleResponsiveCollapse() {
  const allSections = document.querySelectorAll(".collapsible-section");

  if (window.innerWidth > 768) {
    // En desktop, siempre expandir todas las secciones
    allSections.forEach((section) => {
      section.classList.add("expanded");
    });
  } else {
    // En móviles, colapsar todas por defecto
    allSections.forEach((section) => {
      section.classList.remove("expanded");
    });
  }
}

// Tarjeta horizontal por jugador (scorecard)
window.mostrarTarjetaDetalle = function (torneoId, idUsuario) {
  const torneo = torneos.find((t) => t.id === decodeURIComponent(torneoId));
  if (!torneo || !torneo.tarjetas) return;
  const tarjeta = torneo.tarjetas.find(
    (t) => t.id_usuario == decodeURIComponent(idUsuario)
  );
  if (!tarjeta) return;
  const scores = tarjeta.scores || [];
  const yardas = torneo.cancha ? torneo.cancha.yardaje_por_hoyo || [] : [];
  const pares = torneo.cancha ? torneo.cancha.par_por_hoyo || [] : [];

  // Dividir scores en dos mitades: hoyos 1-9 y 10-18
  const firstHalf = scores.slice(0, 9);
  const secondHalf = scores.slice(9, 18);

  // Función para generar una tabla de 9 hoyos
  const generateHalfTable = (holeScores, startHole) => {
    const yardasHalf = holeScores.map((s) => yardas[s.hoyo - 1] ?? 0);
    const paresHalf = holeScores.map((s) => pares[s.hoyo - 1] ?? 0);
    const totalYardas = yardasHalf.reduce((a, b) => a + b, 0);
    const totalPar = paresHalf.reduce((a, b) => a + b, 0);
    const totalGolpes = holeScores.reduce(
      (total, s) => total + (s.golpes ?? 0),
      0
    );

    return `
      <div class="scorecard-half-section">
        <div class="scorecard-horizontal-wrapper">
          <table class="scorecard-horizontal">
            <thead>
              <tr>
                <th>Hoyo</th>
                ${holeScores
                  .map((s, i) => `<th>${startHole + i}</th>`)
                  .join("")}
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th>Yardas</th>
                ${holeScores
                  .map((s) => `<td>${yardas[s.hoyo - 1] ?? "-"}</td>`)
                  .join("")}
                <td><strong>${totalYardas.toLocaleString()}</strong></td>
              </tr>
              <tr>
                <th>Par</th>
                ${holeScores
                  .map((s) => `<td>${pares[s.hoyo - 1] ?? "-"}</td>`)
                  .join("")}
                <td><strong>${totalPar}</strong></td>
              </tr>
              <tr>
                <th>Golpes</th>
                ${holeScores
                  .map((s, idx) => {
                    const par = pares[s.hoyo - 1] ?? null;
                    if (par === null) return `<td>${s.golpes ?? "-"}</td>`;
                    let contenido = s.golpes ?? "-";
                    if (typeof s.golpes !== "number")
                      return `<td>${contenido}</td>`;
                    const diff = s.golpes - par;
                    let scoreClass = "";
                    if (diff < 0)
                      scoreClass =
                        "score-circulo score-circulo-" + Math.abs(diff);
                    if (diff > 0)
                      scoreClass = "score-cuadrado score-cuadrado-" + diff;
                    return `<td><span class="${scoreClass}">${contenido}</span></td>`;
                  })
                  .join("")}
                <td><strong>${totalGolpes}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    `;
  };

  let html = `
    <div class="scorecard-modal-header">
      <h3>Tarjeta de ${tarjeta.nombre_usuario}</h3>
      <div class="scorecard-player-info">
        <span>Handicap: <strong>${tarjeta.handicap ?? "N/A"}</strong></span>
        <span>Score Neto: <strong>${tarjeta.score_neto ?? "N/A"}</strong></span>
        <span>Score Bruto: <strong>${
          tarjeta.score_bruto ?? "N/A"
        }</strong></span>
      </div>
    </div>
    
    <div class="scorecard-tables-container">
      ${generateHalfTable(firstHalf, 1)}
      ${generateHalfTable(secondHalf, 10)}
    </div>
    
    <button id="scorecard-modal-close" class="btn">Cerrar</button>
  `;

  let scorecardModal = document.getElementById("scorecard-modal");
  if (!scorecardModal) {
    scorecardModal = document.createElement("div");
    scorecardModal.id = "scorecard-modal";
    scorecardModal.className = "scorecard-modal";
    document.body.appendChild(scorecardModal);
  }

  scorecardModal.innerHTML = `<div class="scorecard-modal-content">${html}</div>`;
  scorecardModal.style.display = "flex";

  const closeBtn = document.getElementById("scorecard-modal-close");
  if (closeBtn) {
    closeBtn.onclick = () => {
      scorecardModal.style.display = "none";
    };
  }

  scorecardModal.onclick = (e) => {
    if (e.target === scorecardModal) {
      scorecardModal.style.display = "none";
    }
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

// Menú móvil
const mobileMenuToggle = document.querySelector(".mobile-menu-toggle");
const nav = document.querySelector(".nav");

function toggleMobileMenu() {
  mobileMenuToggle.classList.toggle("active");
  nav.classList.toggle("active");
  document.body.style.overflow = nav.classList.contains("active")
    ? "hidden"
    : "";
}

function closeMobileMenu() {
  mobileMenuToggle.classList.remove("active");
  nav.classList.remove("active");
  document.body.style.overflow = "";
}

mobileMenuToggle.addEventListener("click", toggleMobileMenu);

// Cerrar menú al hacer clic en un enlace
document.querySelectorAll(".nav-link").forEach((link) => {
  link.addEventListener("click", () => {
    if (window.innerWidth <= 768) {
      closeMobileMenu();
    }
  });
});

// Cerrar menú al redimensionar la ventana
window.addEventListener("resize", () => {
  if (window.innerWidth > 768) {
    closeMobileMenu();
  }
});

// Header scroll effect
window.addEventListener("scroll", () => {
  const header = document.querySelector(".header");
  if (window.scrollY > 50) {
    header.classList.add("scrolled");
  } else {
    header.classList.remove("scrolled");
  }
});

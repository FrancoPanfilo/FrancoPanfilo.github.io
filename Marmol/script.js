// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCuPx9ysr0pmqITB0wAAWHtdSu5Xn3phVE",
  authDomain: "viajes-40b4f.firebaseapp.com",
  projectId: "viajes-40b4f",
  storageBucket: "viajes-40b4f.firebasestorage.app",
  messagingSenderId: "936557590711",
  appId: "1:936557590711:web:fe564b2430b47b82d43532",
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const vinculosCollection = db.collection("marmol_vinculos");
const noCargadosCollection = db.collection("marmol_no_cargados");

const mesesEspañol = [
  "",
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const API_KEY = "AIzaSyAdAD-0wA3r5MATfIxvT3zuMljrL9mC76g";
const PLAYLIST_ID = "PLaZKQ80cBgOhD3HU_KoZgAa1l2WEAexNS";

let videos = [];
let partidosOficiales = [];
let vinculosManuales = {};
let partidosVinculados = new Set();
let videosUsados = new Set();
let noCargados = new Set();
let conVideo = 0;
let allRows = [];

function normalize(str) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\./g, "")
    .replace(/[^a-z0-9]/g, "");
}

function cleanRivalName(name) {
  let cleaned = name.replace(/\([^)]*\)/g, "");
  cleaned = cleaned.replace(/[()]/g, "");
  cleaned = cleaned.replace(/\s+/g, " ").trim();
  return cleaned;
}

function extraerVideoInfo(title) {
  title = title.replace(/\|.*/i, "").trim();
  const patterns = [
    /(.+?)\s*\((\d+)\)\s*(vs|-)\s*\((\d+)\)\s*(.+)/i,
    /(.+?)\s*(\d+)\s*(vs|-)\s*(\d+)\s*(.+)/i,
    /(.+?)\s*\((\d+)\)\s*-\s*(\d+)\s*(.+)/i,
    /(.+?)\s*(\d+)\s*-\s*(\d+)\s*(.+)/i,
    /(.+?)\s*\((\d+)-(\d+)\)\s*(.+)/i,
    /(.+?)\s*(\d+)-(\d+)\s*(.+)/i,
  ];

  for (let regex of patterns) {
    const match = title.match(regex);
    if (match) {
      let equipo1 = match[1].trim();
      let goles1 = parseInt(match[2]);
      let goles2 = parseInt(match[3] || match[4]);
      let equipo2 = match[match.length - 1].trim();

      let marmolEs1 = normalize(equipo1).includes("marmol");
      let marmolEs2 = normalize(equipo2).includes("marmol");

      if (marmolEs1 || marmolEs2) {
        let golesMarmol = marmolEs1 ? goles1 : goles2;
        let golesRival = marmolEs1 ? goles2 : goles1;
        let rivalRaw = marmolEs1 ? equipo2 : equipo1;

        let rival = cleanRivalName(rivalRaw);

        return {
          rival: rival || "No detectado",
          normalizedRival: normalize(rival),
          resultado: `${golesMarmol}-${golesRival}`,
        };
      }
    }
  }

  return { rival: "No detectado", normalizedRival: "", resultado: "" };
}

function formatUploadDate(isoDate) {
  const [year, month, day] = isoDate.split("T")[0].split("-");
  return `${day}-${month}-${year}`;
}

async function cargarVinculosManuales() {
  try {
    const snapshot = await vinculosCollection.get();
    snapshot.forEach((doc) => {
      const index = doc.data().partidoIndex;
      vinculosManuales[doc.id] = index;
      partidosVinculados.add(index);
      videosUsados.add(decodeURIComponent(doc.id));
    });

    const noSnapshot = await noCargadosCollection.get();
    noSnapshot.forEach((doc) => {
      noCargados.add(decodeURIComponent(doc.id));
    });
  } catch (error) {
    console.error("Error cargando datos:", error);
  }
}

function fetchYouTubeVideos(pageToken = "") {
  const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${PLAYLIST_ID}&key=${API_KEY}${
    pageToken ? "&pageToken=" + pageToken : ""
  }`;

  fetch(url)
    .then((res) => res.json())
    .then((data) => {
      data.items.forEach((item) => {
        const s = item.snippet;
        if (
          s.resourceId.kind === "youtube#video" &&
          !["Deleted video", "Private video"].includes(s.title)
        ) {
          const info = extraerVideoInfo(s.title);
          videos.push({
            title: s.title,
            description: s.description || "(sin descripción)",
            url: `https://www.youtube.com/watch?v=${s.resourceId.videoId}`,
            publishedAt: s.publishedAt.split("T")[0],
            uploadDateFormatted: formatUploadDate(s.publishedAt),
            rivalExtraido: info.rival,
            normalizedRival: info.normalizedRival,
            resultado: info.resultado,
          });
        }
      });

      if (data.nextPageToken) {
        fetchYouTubeVideos(data.nextPageToken);
      } else {
        cargarVinculosManuales().then(() => fetchPartidosOficiales());
      }
    })
    .catch((err) => console.error("Error cargando YouTube:", err));
}

async function fetchPartidosOficiales() {
  const proxyUrl = "https://corsproxy.io/?";
  const apiUrl = "https://ligadelrey.org/api/equipos/partidos/110";

  fetch(proxyUrl + encodeURIComponent(apiUrl))
    .then((res) => res.json())
    .then((data) => {
      partidosOficiales = data.pasados || [];

      let rows = [];
      let years = new Set();

      partidosOficiales.forEach((p, index) => {
        const isLocal = p.equipo_local.id === 110;
        const rivalRaw = isLocal
          ? p.equipo_visitante.nombre
          : p.equipo_local.nombre;
        const rival = cleanRivalName(rivalRaw);
        const golesMarmol = isLocal ? p.goles_local : p.goles_visitante;
        const golesRival = isLocal ? p.goles_visitante : p.goles_local;
        const resultado = `${golesMarmol}-${golesRival}`;
        const tipoResultado =
          golesMarmol > golesRival
            ? "ganado"
            : golesMarmol === golesRival
            ? "empatado"
            : "perdido";

        let videoCell = '<span class="no">No</span>';
        let videoUrl = null;

        for (let url in vinculosManuales) {
          if (vinculosManuales[url] === index) {
            videoUrl = decodeURIComponent(url);
            const videoId = new URL(videoUrl).searchParams.get("v");
            videoCell = `
                    
                        <span class="video-icon" onclick="abrirModal('${videoId}')" title="Ver video completo">📺</span>
                        <button class="unlink-btn" onclick="desvincular('${encodeURIComponent(
                          videoUrl
                        )}', ${index})" title="Desvincular video">✎</button>
                    `;
            conVideo++;
            break;
          }
        }

        const [day, month, year] = p.fecha.split("-");
        years.add(year);

        rows.push({
          fecha: p.fecha,
          sortDate: p.fecha.split("-").reverse().join("-"),
          resultado,
          tipoResultado,
          rival,
          normalizedRival: normalize(rival),
          video: videoCell,
          tieneVideo: !!videoUrl,
          year,
          partidoIndex: index,
        });
      });

      allRows = rows.sort((a, b) => b.sortDate.localeCompare(a.sortDate));

      renderTabla(allRows);
      llenarFiltroAnio(years);

      const videosSinVincular = videos.filter(
        (v) => !videosUsados.has(v.url) && !noCargados.has(v.url)
      );

      if (videosSinVincular.length > 0) {
        renderSeccionProvisoria(videosSinVincular, rows);
        document.getElementById("videos-sin-vincular").style.display = "block";
      } else {
        document.getElementById("videos-sin-vincular").style.display = "none";
      }
    })
    .catch((err) => console.error("Error cargando partidos:", err));
}

function renderTabla(rows) {
  let html = "";
  let currentYear = null;
  let currentMonth = null;

  // Agrupamos por año y mes para verificar visibilidad
  const visibleYears = new Set();
  const visibleMonths = new Set();

  rows.forEach((row) => {
    if (row.rowElement && row.rowElement.classList.contains("hidden-row")) {
      return; // Saltar filas ocultas
    }

    const [day, month, year] = row.fecha.split("-");
    visibleYears.add(year);
    visibleMonths.add(`${year}-${month}`);
  });

  rows.forEach((row) => {
    // Si la fila está oculta, no la renderizamos
    if (row.rowElement && row.rowElement.classList.contains("hidden-row")) {
      return;
    }

    const [day, month, year] = row.fecha.split("-");
    const monthName = mesesEspañol[parseInt(month)];

    // Mostrar título de año solo si hay partidos visibles en ese año
    if (year !== currentYear && visibleYears.has(year)) {
      html += `<tr><td colspan="4"><h2>${year}</h2></td></tr>`;
      currentYear = year;
      currentMonth = null;
    }

    // Mostrar subtítulo de mes solo si hay partidos visibles en ese mes
    const monthKey = `${year}-${month}`;
    if (month !== currentMonth && visibleMonths.has(monthKey)) {
      html += `<tr><td colspan="4"><h3>${monthName} ${year}</h3></td></tr>`;
      currentMonth = month;
    }

    html += `
            <tr data-partido-index="${row.partidoIndex}" class="partido-row" data-rival="${row.normalizedRival}" data-resultado="${row.tipoResultado}" data-video="${row.tieneVideo}" data-year="${row.year}">
                <td>${row.fecha}</td>
                <td>${row.resultado}</td>
                <td>${row.rival}</td>
                <td>${row.video}</td>
            </tr>
        `;
  });

  document.getElementById("tabla-partidos").innerHTML =
    html ||
    '<tr><td colspan="4" class="loading">No hay partidos que coincidan con los filtros</td></tr>';
}

function llenarFiltroAnio(years) {
  const select = document.getElementById("filtro-anio");
  select.innerHTML = '<option value="todos">Todos</option>';
  Array.from(years)
    .sort((a, b) => b - a)
    .forEach((y) => {
      const opt = document.createElement("option");
      opt.value = y;
      opt.textContent = y;
      select.appendChild(opt);
    });
}

function aplicarFiltros() {
  const rivalFiltro = normalize(document.getElementById("filtro-rival").value);
  const resultadoFiltro = document.getElementById("filtro-resultado").value;
  const videoFiltro = document.getElementById("filtro-video").value;
  const anioFiltro = document.getElementById("filtro-anio").value;

  const filas = document.querySelectorAll(".partido-row");

  filas.forEach((fila) => {
    const rival = fila.dataset.rival;
    const resultado = fila.dataset.resultado;
    const tieneVideo = fila.dataset.video === "true";
    const year = fila.dataset.year;

    let mostrar = true;

    if (rivalFiltro && !rival.includes(rivalFiltro)) mostrar = false;
    if (resultadoFiltro !== "todos" && resultado !== resultadoFiltro)
      mostrar = false;
    if (videoFiltro === "si" && !tieneVideo) mostrar = false;
    if (videoFiltro === "no" && tieneVideo) mostrar = false;
    if (anioFiltro !== "todos" && year !== anioFiltro) mostrar = false;

    fila.classList.toggle("hidden-row", !mostrar);
  });
}

function renderSeccionProvisoria(videosSinVincular, rows) {
  let html =
    "<table><thead><tr><th>Título del Video</th><th>Partido sugerido</th><th>Acción</th></tr></thead><tbody>";

  videosSinVincular.forEach((v) => {
    const rivalDetectado = v.rivalExtraido || "No detectado";

    let opcionesHtml = '<option value="">-- Seleccionar partido --</option>';
    rows.forEach((row) => {
      if (partidosVinculados.has(row.partidoIndex)) return;
      opcionesHtml += `<option value="${row.partidoIndex}">${row.fecha} | ${row.resultado} vs ${row.rival}</option>`;
    });
    opcionesHtml += `<option value="no_cargado">Partido no cargado en la API</option>`;

    html += `
            <tr id="row-${encodeURIComponent(v.url)}">
                <td>
                    <a href="${v.url}" target="_blank">${v.title}</a>
                    <span class="video-date"> (subido el ${
                      v.uploadDateFormatted
                    })</span>
                    <div class="video-description">${v.description.replace(
                      /\n/g,
                      "<br>"
                    )}</div>
                </td>
                <td>
                    <div class="info-rival">Rival detectado: <strong>${rivalDetectado}</strong></div>
                    <select class="select-partido" data-video-url="${v.url}">
                        ${opcionesHtml}
                    </select>
                </td>
                <td><button onclick="vincularManual(this)">Vincular / Guardar</button></td>
            </tr>
        `;
  });

  html += "</tbody></table>";
  document.getElementById("provisional-table-container").innerHTML = html;
}

window.vincularManual = async function (button) {
  const row = button.closest("tr");
  const select = row.querySelector(".select-partido");
  const videoUrl = select.dataset.videoUrl;
  const partidoIndex = select.value;

  if (!partidoIndex) {
    alert("Por favor selecciona una opción");
    return;
  }

  if (partidoIndex === "no_cargado") {
    try {
      await noCargadosCollection.doc(encodeURIComponent(videoUrl)).set({
        url: videoUrl,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      });
      noCargados.add(videoUrl);
      row.remove();
      alert('Video guardado como "Partido no cargado"');
    } catch (error) {
      alert("Error al guardar: " + error.message);
    }
    return;
  }

  try {
    await vinculosCollection.doc(encodeURIComponent(videoUrl)).set({
      partidoIndex: parseInt(partidoIndex),
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
    });

    vinculosManuales[encodeURIComponent(videoUrl)] = parseInt(partidoIndex);
    partidosVinculados.add(parseInt(partidoIndex));
    videosUsados.add(videoUrl);
    conVideo++;

    const targetRow = document.querySelector(
      `tr[data-partido-index="${partidoIndex}"]`
    );
    if (targetRow) {
      const tds = targetRow.querySelectorAll("td");
      tds[3].innerHTML = `<a href="${videoUrl}" target="_blank" class="yes">Sí (manual)</a> <button class="unlink-btn" onclick="desvincular('${encodeURIComponent(
        videoUrl
      )}', ${partidoIndex})" title="Desvincular video">✎</button>`;
    }

    row.remove();

    alert("¡Vínculo guardado y aplicado correctamente!");
  } catch (error) {
    alert("Error al guardar: " + error.message);
  }
};

window.desvincular = async function (encodedUrl, partidoIndex) {
  if (!confirm("¿Desvincular este video del partido?")) return;

  try {
    await vinculosCollection.doc(encodedUrl).delete();

    delete vinculosManuales[encodedUrl];
    partidosVinculados.delete(partidoIndex);
    videosUsados.delete(decodeURIComponent(encodedUrl));
    conVideo--;

    const targetRow = document.querySelector(
      `tr[data-partido-index="${partidoIndex}"]`
    );
    if (targetRow) {
      const tds = targetRow.querySelectorAll("td");
      tds[3].innerHTML = '<span class="no">No</span>';
    }

    alert("Video desvinculado correctamente");
  } catch (error) {
    alert("Error al desvincular: " + error.message);
  }
};

// Eventos
document
  .getElementById("filtro-rival")
  .addEventListener("input", aplicarFiltros);
document
  .getElementById("filtro-resultado")
  .addEventListener("change", aplicarFiltros);
document
  .getElementById("filtro-video")
  .addEventListener("change", aplicarFiltros);
document
  .getElementById("filtro-anio")
  .addEventListener("change", aplicarFiltros);
document.getElementById("clear-filters").addEventListener("click", () => {
  document.getElementById("filtro-rival").value = "";
  document.getElementById("filtro-resultado").value = "todos";
  document.getElementById("filtro-video").value = "todos";
  document.getElementById("filtro-anio").value = "todos";
  aplicarFiltros();
});

fetchYouTubeVideos();
// Abrir modal con video de YouTube
function abrirModal(videoId) {
  const player = document.getElementById("youtube-player");
  player.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
  document.getElementById("video-modal").style.display = "flex";
}

// Cerrar modal
document.querySelector(".modal-close").addEventListener("click", () => {
  document.getElementById("video-modal").style.display = "none";
  document.getElementById("youtube-player").src = "";
});

// Cerrar al hacer click fuera del video
document.getElementById("video-modal").addEventListener("click", (e) => {
  if (e.target === document.getElementById("video-modal")) {
    document.querySelector(".modal-close").click();
  }
});

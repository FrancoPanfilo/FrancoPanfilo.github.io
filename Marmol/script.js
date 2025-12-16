// Firebase
firebase.initializeApp({
  apiKey: "AIzaSyCuPx9ysr0pmqITB0wAAWHtdSu5Xn3phVE",
  authDomain: "viajes-40b4f.firebaseapp.com",
  projectId: "viajes-40b4f",
  storageBucket: "viajes-40b4f.firebasestorage.app",
  messagingSenderId: "936557590711",
  appId: "1:936557590711:web:fe564b2430b47b82d43532",
});
const db = firebase.firestore();
const vinculos = db.collection("marmol_vinculos");

const meses = [
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

let vinculosManuales = {};
let allRows = [];

function normalize(s) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\./g, "")
    .replace(/[^a-z0-9]/g, "");
}
function cleanRival(n) {
  return n
    .replace(/\([^)]*\)/g, "")
    .replace(/[()]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

async function cargarVinculos() {
  const snap = await vinculos.get();
  snap.forEach((doc) => {
    vinculosManuales[doc.id] = doc.data().partidoIndex;
  });
}

async function cargarPartidos() {
  await cargarVinculos();
  fetch(
    "https://corsproxy.io/?" +
      encodeURIComponent("https://ligadelrey.org/api/equipos/partidos/110")
  )
    .then((r) => r.json())
    .then((data) => {
      const pasados = data.pasados || [];
      let rows = [];

      pasados.forEach((p, idx) => {
        const local = p.equipo_local.id === 110;
        const rival = cleanRival(
          local ? p.equipo_visitante.nombre : p.equipo_local.nombre
        );
        const golesM = local ? p.goles_local : p.goles_visitante;
        const golesR = local ? p.goles_visitante : p.goles_local;
        const resultado = `${golesM}-${golesR}`;
        const tipo =
          golesM > golesR
            ? "ganado"
            : golesM === golesR
            ? "empatado"
            : "perdido";

        let videoCell = '<span class="no">No</span>';
        let videoUrl = null;

        for (let u in vinculosManuales) {
          if (vinculosManuales[u] === idx) {
            videoUrl = decodeURIComponent(u);
            const vid = new URL(videoUrl).searchParams.get("v");
            videoCell = `<span class="video-icon" onclick="abrirVideo('${vid}')" title="Ver video completo">📺</span>
            <button class="unlink-btn" onclick="desvincular('${encodeURIComponent(
              videoUrl
            )}',${idx})" title="Desvincular video">✎</button>`;
            break;
          }
        }

        const [d, m, y] = p.fecha.split("-");
        rows.push({
          fecha: p.fecha,
          sortDate: p.fecha.split("-").reverse().join("-"),
          resultado,
          tipo,
          rival,
          normalizedRival: normalize(rival),
          video: videoCell,
          tieneVideo: !!videoUrl,
          year: y,
          partidoId: p.id,
        });
      });

      rows.sort((a, b) => b.sortDate.localeCompare(a.sortDate));
      allRows = rows;
      renderTabla(allRows);
      llenarAnios(new Set(allRows.map((r) => r.year)));
    });
}

function renderTabla(rows) {
  let html = "";
  let curYear = null,
    curMonth = null;

  rows.forEach((r) => {
    const [d, m, y] = r.fecha.split("-");
    const monthName = meses[parseInt(m)];

    if (y !== curYear) {
      html += `<tr><td colspan="4"><h2>${y}</h2></td></tr>`;
      curYear = y;
      curMonth = null;
    }
    if (m !== curMonth) {
      html += `<tr><td colspan="4"><h3>${monthName} ${y}</h3></td></tr>`;
      curMonth = m;
    }

    // En la celda de fecha solo mostramos el día; mes y año ya están en los encabezados
    html += `<tr class="partido-row clickable-row" data-id="${r.partidoId}"
    data-rival="${r.normalizedRival}" data-tipo="${r.tipo}"
    data-video="${r.tieneVideo}" data-year="${r.year}">
    <td class="col-fecha">${d}</td>
    <td>${r.resultado}</td>
    <td>${r.rival}</td>
    <td>${r.video}</td>
  </tr>`;
  });

  document.getElementById("tabla-partidos").innerHTML =
    html || "<tr><td colspan='4'>No hay resultados</td></tr>";

  document.querySelectorAll(".clickable-row").forEach((row) => {
    row.onclick = (e) => {
      if (e.target.tagName === "SPAN" || e.target.tagName === "BUTTON") return;
      // Abre la página oficial del partido en nueva pestaña
      window.open(`https://ligadelrey.org/partido/${row.dataset.id}`, "_blank");
    };
  });
}

function llenarAnios(yearsSet) {
  const sel = document.getElementById("filtro-anio");
  sel.innerHTML = "<option value='todos'>Todos</option>";
  Array.from(yearsSet)
    .sort((a, b) => b - a)
    .forEach((y) => {
      const opt = document.createElement("option");
      opt.value = y;
      opt.textContent = y;
      sel.appendChild(opt);
    });
}

function aplicarFiltros() {
  const rival = normalize(document.getElementById("filtro-rival").value);
  const res = document.getElementById("filtro-resultado").value;
  const vid = document.getElementById("filtro-video").value;
  const año = document.getElementById("filtro-anio").value;

  if (!allRows || allRows.length === 0) {
    return;
  }

  const filtrados = allRows.filter((r) => {
    if (rival && !r.normalizedRival.includes(rival)) return false;
    if (res !== "todos" && r.tipo !== res) return false;

    if (vid === "si" && !r.tieneVideo) return false;
    if (vid === "no" && r.tieneVideo) return false;

    if (año !== "todos" && r.year !== año) return false;

    return true;
  });

  renderTabla(filtrados);
}

function abrirVideo(vid) {
  document.getElementById(
    "youtube-player"
  ).src = `https://www.youtube.com/embed/${vid}?autoplay=1`;
  document.getElementById("modal").style.display = "flex";
}

async function desvincular(encodedUrl, idx) {
  if (!confirm("¿Desvincular video?")) return;
  await vinculos.doc(encodedUrl).delete();
  location.reload();
}

function cerrarModal() {
  document.getElementById("modal").style.display = "none";
  document.getElementById("youtube-player").src = "";
}

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
document.getElementById("clear-filters").onclick = () => {
  document.getElementById("filtro-rival").value = "";
  document.getElementById("filtro-resultado").value = "todos";
  document.getElementById("filtro-video").value = "todos";
  document.getElementById("filtro-anio").value = "todos";
  aplicarFiltros();
};

cargarPartidos();

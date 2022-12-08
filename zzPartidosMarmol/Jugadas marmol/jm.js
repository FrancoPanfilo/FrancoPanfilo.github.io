// clases

class NuestrosPartidos {
  constructor() {
    this.partidos = [];
  }
}

class Partidos {
  constructor(rival) {
    (this.rival = rival), (this.jugadas = []);
  }
  ingresarJugada(momento, estilo, exito) {
    let nuevoP = new Jugada(momento, estilo, exito);
    this.jugadas.push(nuevoP);
  }
}

class Jugada {
  constructor(momento, estilo, exito) {
    this.momento = momento;
    (this.estilo = estilo), (this.exito = exito);
  }
}
// "https://www.youtube.com/watch?v=OpyHfJWBA8w&feature=emb_title"
function nuevoIframe(link) {
  let i = 0;
  let video = "";
  while (link[i] != "=" && i < 100) {
    i = i + 1;
  }
  let p = i + 1;
  while (link[p] != "&" && p < 100) {
    video = video + link[p];
    p = p + 1;
  }
  link = "https://www.youtube.com/embed/" + video;
  return link;
}

// tabla que se va a modificar
let pantalla = document.getElementById("pantalla");
let video = document.getElementById("video1");
let fijarVideo = document.getElementById("fijarLink");
let tabla = document.getElementById("Fixture");
let titulo = document.getElementById("tituloTabla");
let mostrarId = document.getElementById("idMostrar");

//inputs
let rival = document.getElementById("rivalInput");
let momento = document.getElementById("momento");

let porArriba = document.getElementById("flexRadioDefault1");
let porAbajo = document.getElementById("flexRadioDefault2");

let exitosa = document.getElementById("flexRadioDefault3");
let sinExito = document.getElementById("flexRadioDefault4");

// botones

let botonRival = document.getElementById("fijarId");
let crearJugada = document.getElementById("crearJugada");

let NOhayRival = true;

/* let partido;
botonRival.addEventListener("click", () => {
  if (rival.value == "") {
    alert("ingrese un rival");
  } else {
    partido = new Partidos(rival.value);
    titulo.innerHTML = `<h3>${rival.value}</h3>`;
    mostrarId.innerHTML = `<h3>${rival.value}</h3>`;
    NOhayRival = false;
  }
}); */

/* let u = 0;
crearJugada.addEventListener("click", () => {
  if (NOhayRival) {
    alert("Ingrese el rival");
  } else {
    // necesito imprimir esos datos en la tabla
    u++;
    let est = "Por abajo";
    if (porArriba.checked) {
      est = "Por arriba";
    }
    let resultado = "Sin exito";
    if (exitosa.checked) {
      resultado = "Exitosa";
    }
    let agregarElemento = document.createElement("tr");
    agregarElemento.innerHTML = `<tr>
                                        <td>${u + 1}</td>
                                        <td>${momento.value}</td>
                                        <td>${est}</td>
                                        <td>${resultado}</td>
                                    </tr>`;
    tabla.appendChild(agregarElemento);
    partido.ingresarJugada(momento.value, est, resultado);
    momento.value = "";
    porArriba.checked = false;
    porAbajo.checked = false;
    exitosa.checked = false;
    sinExito.checked = false;
  }
}); */

let guardarPartido = JSON.parse(localStorage.getItem("Partidos Marmol"));
let guardar = document.getElementById("GuardarPartido");

guardar.addEventListener("click", () => {
  if (localStorage.getItem("Partidos Marmol")) {
    guardarPartido.partidos.push(partido);
    localStorage.setItem("Partidos Marmol", JSON.stringify(guardarPartido));
  } else {
    guardarPartido = new NuestrosPartidos();
    guardarPartido.partidos.push(partido);
    localStorage.setItem("Partidos Marmol", JSON.stringify(guardarPartido));
  }
  location.reload();
});
fijarVideo.addEventListener("click", () => {
  let link = document.getElementById("link");
  let iframe = nuevoIframe(link.value);
  pantalla.innerHTML = `
  <iframe id="video" width="560" height="315"  src="${iframe}" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
  <div id="estadisticas">
        <div class="iconoCont">
            <img id="golAFavor" src="iconosStat/golAFavor.png">
        </div>
        <div class="iconoCont">
            <img id="golEnContra" src="iconosStat/golEnContra.png">
        </div>
        <div class="iconoCont">
            <img id="tiroErradoAFavor" src="iconosStat/tiroErradoa favor.png">
        </div>
        <div class="iconoCont">
            <img id="tiroErradoEnContra"src="iconosStat/tiroErradoaEnContra.png">
        </div>
        <div class="iconoCont">
            <img id="novedadAFavor"src="iconosStat/novedadAFavor.png">
        </div>
        <div class="iconoCont">
            <img id="novedadEnContra" src="iconosStat/novedadEnContra.png">
        </div>
        </div>
  `;
  setTimeout(() => {
    let pantallaCompleta = document.getElementsByClassName(
      "ytp-fullscreen-button"
    );
    console.log(pantallaCompleta);
    pantallaCompleta.addEventListener("click", () => {
      let botonesFS = document.getElementsByClassName(
        "annotation annotation-type-custom iv-branding"
      );
      console.log(botonesFS);
    });
  }, 7000);

  let GF = document.getElementById("golAFavor");
  let GC = document.getElementById("golEnContra");
  let TF = document.getElementById("tiroErradoAFavor");
  let TC = document.getElementById("tiroErradoEnContra");
  let NF = document.getElementById("novedadAFavor");
  let NC = document.getElementById("novedadEnContra");

  GF.addEventListener("click", () => {});
});

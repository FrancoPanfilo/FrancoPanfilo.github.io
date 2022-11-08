// clases

class NuestrosPartidos {
    constructor() {
        this.partidos = []
    }
}

class Partidos {
    constructor(rival) {
        this.rival = rival,
            this.jugadas = []
    }
    ingresarJugada(momento, estilo, exito) {
        let nuevoP = new Jugada(momento, estilo, exito)
        this.jugadas.push(nuevoP)
    }
}

class Jugada {
    constructor(momento, estilo, exito) {
        this.momento = momento
        this.estilo = estilo,
            this.exito = exito
    }
}
let tabla = document.getElementById("Fixture")
let selector = document.getElementById("select")
let partidos = (JSON.parse(localStorage.getItem("Partidos Marmol"))).partidos
if (localStorage.getItem("Partidos Marmol")) {
    for (let i = 0; i < partidos.length; i++) {
        let agregarElemento = document.createElement("option")
        agregarElemento.innerHTML = `<option value="${i}">${partidos[i].rival}</option>`
        selector.appendChild(agregarElemento)
    }
}

let boton = document.getElementById("MostrarJugadas")

boton.addEventListener("click", () => {
    if (selector.value == "Seleccionar Partido") {
        alert("Seleccione partido a mostrar")
    } else {
        for (let i = 0; i < partidos.length; i++) {
            if (partidos[i].rival == selector.value){
                mostrarPartido = partidos[i]
                //mostrar el partido
                tabla.innerHTML='\n\n            '
                for (let p=0;p<mostrarPartido.jugadas.length;p++){

                    let agregarElemento = document.createElement("tr")
                    agregarElemento.innerHTML = ` <tr>
                                                                            <td>${p+1}</td>
                                                                            <td>${mostrarPartido.jugadas[p].momento}</td>
                                                                            <td>${mostrarPartido.jugadas[p].estilo}</td>
                                                                            <td>${mostrarPartido.jugadas[p].exito}</td>
                                                                        </tr>`
                    tabla.appendChild(agregarElemento)}
}
            }
        }
    }
)
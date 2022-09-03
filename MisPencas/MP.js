let servidor = JSON.parse(localStorage.getItem("Usuario"))

let tabla = document.getElementById("tabla")

let misPencas = servidor.pencasActivas

// si se borraron pencas en la sesion anterior , mis pencas tiene elementos que se llaman pencaBorrada , hay que forrar esos elementos

// se hace de arriba a abajo para que no se altere el array y se revisen todos los lugares, para que se entienda pongo un ej
// si el [2] se borra ,entonces el [3] pasa a ser el [2] y nunca se revisa porque i sigue aumentando
// si reviso los mayores antes solo se cambia el lugar en el array de los que son mayores al elemento borrado y estos ya fueron revisados
for (let i = misPencas.length; i >= 0; i--) {
    if (misPencas[i] == "pencaBorrada") {
        misPencas.splice(i, 1)
    }
}

// actualizo las pencas activas en el ls y el usuario en la lista de usuarios
let aULS = JSON.parse(localStorage.getItem("Usuario"))
aULS.pencasActivas = misPencas
actualizarUsuario(aULS)
aULS = JSON.stringify(aULS)
localStorage.setItem("Usuario", aULS)

// FETCH 


let paises = []
let datos
const cargarBanderas = async () => {
    await fetch("https://restcountries.com/v3.1/all")
        .then(resp => resp.json())
        .then((data) => {
            datos = data

            // esta lista tiene los nombre para encontrarlos en la api
            let equiposMundial = [
                "Senegal",
                "Netherlands",
                "Qatar",
                "Ecuador",
                "United Kingdom",
                "Iran",
                "United States",
                "Gales",
                "Argentina",
                "Saudi Arabia",
                "Mexico",
                "Poland",
                "Denmark",
                "Tunisia",
                "France",
                "Australia",
                "Germany",
                "Japan",
                "Spain",
                "Costa Rica",
                "Morocco",
                "Croatia",
                "Belgium",
                "Canada",
                "Switzerland",
                "Cameroon",
                "Brazil",
                "Serbia",
                "Uruguay",
                "South Korea",
                "Portugal",
                "Ghana"

            ]
            for (let i = 0; i < datos.length; i++) {
                let pais = new Pais(datos[i].name.common, datos[i].flags.svg)
                paises.push(pais)
            }
            let paisesMundial = []
            for (let i = 0; i < equiposMundial.length; i++) {
                for (let p = 0; p < paises.length; p++) {
                    if (equiposMundial[i] == paises[p].nombre) {
                        let nuevoPais = new Pais(paises[p].nombre, paises[p].bandera)
                        paisesMundial.push(nuevoPais)
                    }
                }
            }
            let nombresPaisesEspañol = [
                "Senegal",
                "Holanda",
                "Catar",
                "Ecuador",
                "Inglaterra",
                "Iran",
                "Estados Unidos",
                //           "Gales", Excluyo a gales porque no tiene bandera en la api, se la codeo yo
                "Argentina",
                "Arabia Saudita",
                "Mexico",
                "Polonia",
                "Dinamarca",
                "Tunez",
                "Francia",
                "Australia",
                "Alemania",
                "Japon",
                "España",
                "Costa Rica",
                "Marruecos",
                "Croacia",
                "Belgica",
                "Canada",
                "Suiza",
                "Camerun",
                "Brasil",
                "Serbia",
                "Uruguay",
                "Corea del Sur",
                "Portugal",
                "Ghana"
            ]
            for (let i = 0; i < paisesMundial.length; i++) {
                paisesMundial[i].nombre = nombresPaisesEspañol[i]
            }
            let Gales = new Pais("Gales", "https://upload.wikimedia.org/wikipedia/commons/d/dc/Flag_of_Wales.svg")
            paisesMundial.push(Gales)
            paises = paisesMundial
        })
}
cargarBanderas()
// FIN DEL FETCH
// pareciera que funciona

for (let i = 0; i < misPencas.length; i++) {
    let agregarElemento = document.createElement("tr")
    agregarElemento.innerHTML = `<tr>
                                    <td>${misPencas[i].identificador}</td>
                                    <td>${misPencas[i].fixture.length}</td>
                                    <td>${misPencas[i].puntos}</td>
                                    <td><button id="abandonar${i}" type="button" class="btn cancelar" >Abandonar</button></td>
                                    <td><button id="abrirPenca${i}" type="button" class="btn" >Ver Penca</button></td>
                                </tr>
                                
                                <dialog id="modalPenca${i}" class="verPenca">
                                    <div class="opciones">
                                        <div class="volver"><h3><i class="bi bi-arrow-left-square"></i></h3></div>
                                        <div id="tabla${i}" class="infoPenca" ><h3>Tabla</h3></div>
                                        <div id="fixture${i}" class="infoPenca" ><h3>Fixture</h3></div>
                                        <div id="mipenca${i}" class="infoPenca" ><h3>Mi Penca</h3></div> 
                                    </div>
                                    <div id="pantalla${i}">

                                    </div>
                                </dialog>
                                `

    agregarElemento.setAttribute("id", `filaDePencas${i}`)
    tabla.appendChild(agregarElemento)


    // la primera penca se borra bien , la segunda borra el elemento siguiente , el tercer el 5to , el 4to el 6to. Esto se debe a que l aumenta , pero la posicion de la penca en la tabla no cambia, 
    // la solucion es agregar un contador que equilibre esa diferencia mientras la pagina no se recargue, es una solucion provisorua pero funcional que permite no tener que recargar la pagina cada vez que borramos una penca


    let elboton = document.getElementById(`abandonar${i}`)
    elboton.addEventListener("click", () => {
        let l = i
        let usuario = JSON.parse(localStorage.getItem("Usuario"))
        usuario.pencasActivas[l] = "pencaBorrada"
        // borrar el usuario y su penca de la penca ( tmb borrar la unaPenca de la listaPenca)
        let server = JSON.parse(localStorage.getItem("Pencas Predefinidas"))
        server.pencas.forEach(penca => {
            if (penca.identificador == misPencas[l].identificador) {
                for (let indice = 0; indice < penca.usuarios.length; indice++) {
                    if (penca.usuarios[indice] == usuario.id) {
                        penca.usuarios.splice(indice, 1)
                        localStorage.setItem("Pencas Predefinidas", JSON.stringify(server))

                    }
                }
                for (let r = 0; r < penca.listaPencas.length; r++) {
                    if (penca.listaPencas[r].usuario == usuario.id) {
                        penca.listaPencas.splice(r, 1)
                        localStorage.setItem("Pencas Predefinidas", JSON.stringify(server))
                    }
                }
            }
        })
        let fila = document.getElementById(`filaDePencas${i}`)
        fila.className = "Esconder"
        Toastify({
            text: `Abandonaste la penca ${misPencas[l].identificador} `,
            duration: 3000,
            newWindow: true,
            close: true,
            gravity: "top",
            position: "right",
            stopOnFocus: true,
            style: {
                background: "linear-gradient(to right, #FF937C , #FF2D00)",
            },
        }).showToast()
        user = JSON.parse(localStorage.getItem("Usuario"))
        let misPencas2 = document.getElementById("MisPencas2")
        usuario.pencasActivas.length == 0 ? misPencas2.classList = "Esconder" : misPencas2.classList = "enlace"
        //si se borraron todas las pencas
        let noHayPencas = true
        for (let g = 0; g < usuario.pencasActivas.length; g++) {
            if (usuario.pencasActivas[g] != "pencaBorrada") {
                noHayPencas = false
            }
        }
        noHayPencas ? misPencas2.classList = "Esconder" : misPencas2.classList = "enlace"
        localStorage.removeItem("Usuario")
        actualizarUsuario(usuario)
        usuario = JSON.stringify(usuario)
        localStorage.setItem("Usuario", usuario)
        elboton.className = "Esconder"
    })

    // Sistema para Abrir y cerrar modal de cada tabla

    let verPenca = document.getElementById(`abrirPenca${i}`)
    let btnCerrarModal = document.getElementsByClassName("volver")


    let modal = document.getElementById(`modalPenca${i}`)
    for (let l = 0; l < btnCerrarModal.length; l++) {
        btnCerrarModal[l].addEventListener("click", () => {
            modal.close()
        })
    }
    verPenca.addEventListener("click", () => {
        modal.showModal();

    })
    // Sistema para mostrar info de las pencas
    let tablaPenca
    let fixturePenca
    let mipenca
    tablaPenca = document.getElementById(`tabla${i}`)
    fixturePenca = document.getElementById(`fixture${i}`)
    mipenca = document.getElementById(`mipenca${i}`)

    let pantalla = document.getElementById(`pantalla${i}`)

    tablaPenca.addEventListener("click", () => {
        pantalla.innerHTML = `
    <table id="Puestos${i}"class="tablaPantalla table-hover table-dark">
    <thead>
      <tr>
        <th scope="col">Puesto</th>
        <th scope="col">Participante</th>
        <th scope="col">Puntos</th>
        <th scope="col">Ver Predicciones</th>
      </tr>
    </thead>
        <tbody>

        </tbody>
    </table>
    `

        // Busco la Penca
        let RPenca = JSON.parse(localStorage.getItem("Pencas Predefinidas"))
        let resultados
        for (let q = 0; q < RPenca.pencas.length; q++) {
            if (misPencas[i].identificador == RPenca.pencas[q].identificador) {
                resultados = RPenca.pencas[q].listaPencas
            }
        }
        let Resultados = document.getElementById(`Puestos${i}`)
        let indice = 1
        resultados.forEach((users) => {
            let agregarElemento = document.createElement("tr")
            agregarElemento.innerHTML = `<tr>
                                        <td>${indice}</td>
                                        <td>${users.usuario}</td>
                                        <td>${users.puntos}</td>
                                        <td><button type="button" class="btn" id="${i}botonVer${indice}">Ver Predicciones</button></td>
                                    </tr>`
            //agregarElemento.setAttribute("id",`Puestos${indice}`)
            Resultados.appendChild(agregarElemento)
            indice++
        })

    })


    // Que se inicialice en la pestaña tablas
    tablaPenca.click()

    fixturePenca.addEventListener("click", () => {
        pantalla.innerHTML = `
                            <table id="Resultados${i}"class="tablaPantalla table-hover table-dark">
                            <thead>
                              <tr>
                                <th scope="col">N°</th>
                                <th scope="col">Local</th>
                                <th scope="col"></th>
                                <th scope="col"></th>
                                <th scope="col"></th>
                                <th scope="col">Visitante</th>
                              </tr>
                            </thead>
                                <tbody>

                                </tbody>
                            </table>
                            `

        // Busco la Penca
        let RPenca = JSON.parse(localStorage.getItem("Pencas Predefinidas"))
        let resultados

        //en la entrega 2 meti un for que estaba mal, volvia a recorrer misPencas y siempre devolvia el ultimo 
        for (let q = 0; q < RPenca.pencas.length; q++) {
            if (misPencas[i].identificador == RPenca.pencas[q].identificador) {
                resultados = RPenca.pencas[q].resultados

            }
        }
        let indice = 1
        let Resultados = document.getElementById(`Resultados${i}`)
        resultados.forEach((users) => {
            let agregarElemento = document.createElement("tr")
            agregarElemento.innerHTML = `<tr>
                                                                <td>${indice}</td>
                                                                <td><img src="${banderaPais(users.team1)}"> ${users.team1} </td>
                                                                <td>${users.goles1}</td>
                                                                <td>VS</td>
                                                                <td>${users.goles2}</td>
                                                                <td>${users.team2}<img src="${banderaPais(users.team2)}"></td>
                                                            </tr>`
            //   agregarElemento.setAttribute("id",`${i}filaTabla${indice}`)
            Resultados.appendChild(agregarElemento)
            indice++
        })
    })


    mipenca.addEventListener("click", () => {
        pantalla.innerHTML = `<table id="tablaFixture${i}"class="tablaPantalla mipenca table-hover table-dark">
                            <thead>
                              <tr>
                                <th scope="col">N°</th>
                                <th scope="col">Local</th>
                                <th scope="col"></th>
                                <th scope="col"></th>
                                <th scope="col"></th>
                                <th scope="col">Visitante</th>
                                <th scope="col"></th>
                              </tr>
                            </thead>
                            <tbody>

                            </tbody>
                        </table>`


        // Mostrar mi fixture en la tabla
        let tablaFixture = document.getElementById(`tablaFixture${i}`)
        let indice = 1
        misPencas[i].fixture.forEach((users) => {
            let agregarElemento = document.createElement("tr")
            agregarElemento.innerHTML = `<tr>
                                        <td>${indice}</td>
                                        <td><img src="${banderaPais(users.team1)}">${users.team1}</td>
                                        <td>${users.goles1}</td>
                                        <td>VS</td>
                                        <td>${users.goles2}</td>
                                        <td>${users.team2}<img src="${banderaPais(users.team2)}"></td>
                                        <td ><button type="button" class="btn" id="${i}botonPrediccion${indice}">Hacer Prediccion</button><p id="${i}puntosPartido${indice}"></p></td>
                                    </tr>`
            agregarElemento.setAttribute("id", `${i}filaTabla${indice}`)
            tablaFixture.appendChild(agregarElemento)

            // Funcionalidad para cambiar los resultados
            let hacerPrediccion = document.getElementById(`${i}botonPrediccion${indice}`)
            let puntos = document.getElementById(`${i}puntosPartido${indice}`)
            // Si el resultado del partido ya esta fijado no se deberian poder hacer resultados
            let pencass = (JSON.parse(localStorage.getItem("Pencas Predefinidas"))).pencas
            for (let k = 0; k < pencass.length; k++) {
                if (pencass[k].identificador == misPencas[i].identificador) {
                    for (let y = 0; y < pencass[k].resultados.length; y++) {
                        if (pencass[k].resultados[y].team1 == users.team1 && pencass[k].resultados[y].team2 == users.team2) {
                            if (pencass[k].resultados[y].goles1 != "-") {
                                hacerPrediccion.className = "Esconder"
                                puntos.innerText = `${puntoss(pencass[k].resultados[y].goles1, pencass[k].resultados[y].goles2, users.goles1, users.goles2)} puntos`
                            }
                        }
                    }
                }
            }
            let partidoACambiar = document.getElementById(`${i}filaTabla${indice}`)
            let indice2 = indice


            // BUG si hago prediccion en el primer elemento de la tabla , osea el ultimo elemento de mipENCA se buguean los botones de otras pencas
            hacerPrediccion.addEventListener("click", () => {
                partidoACambiar.innerHTML = `
                                        <td>${indice2}</td>
                                        <td><img src="${banderaPais(users.team1)}">${users.team1}</td>
                                        <td><input  class="inputs" placeholder="${users.goles1}" id="${i}inputGoles1${indice2}"></td>
                                        <td>VS</td>
                                        <td><input class="inputs" placeholder="${users.goles2}" id="${i}inputGoles2${indice2}"></td>
                                        <td>${users.team2}<img src="${banderaPais(users.team2)}"></td>
                                        <td ><button type="button" class="btn" id="${i}botonGuardar${indice2}">Guardar Prediccion</button></td>
                                        `
                let botonGuardar = document.getElementById(`${i}botonGuardar${indice2}`)
                botonGuardar.addEventListener("click", () => {
                    let inputGoles1 = document.getElementById(`${i}inputGoles1${indice2}`).value;
                    let inputGoles2 = document.getElementById(`${i}inputGoles2${indice2}`).value;
                    users.goles1 = inputGoles1
                    users.goles2 = inputGoles2
                    if (((!(users.goles1 < 100 && users.goles1 > -1)) || users.goles1 == "") || ((!(users.goles2 < 100 && users.goles2 > -1)) || users.goles2 == "")) {
                        alert("Prediccion erronea")
                        users.goles1 = "-"
                        users.goles2 = "-"
                    }
                    partidoACambiar.innerHTML = `<tr>
                                                <td>${indice2}</td>
                                                <td><img src="${banderaPais(users.team1)}">${users.team1}</td>
                                                <td>${users.goles1}</td>
                                                <td>VS</td>
                                                <td>${users.goles2}</td>
                                                <td>${users.team2}<img src="${banderaPais(users.team2)}"></td>
                                                <td ><button type="button" class="btn" id="${i}botonPrediccion${indice2}">Hacer Prediccion</button></td>
                                            </tr>`
                    let click = document.getElementById(`mipenca${i}`)
                    // con esto redrescamos el modal
                    click.click()
                    actualizarLS = JSON.parse(localStorage.getItem("Usuario"))
                    actualizarLS.pencasActivas = misPencas
                    actualizarUsuario(actualizarLS)
                    actualizarLS = JSON.stringify(actualizarLS)
                    localStorage.setItem("Usuario", actualizarLS)
                    actualizarLS = JSON.parse(localStorage.getItem("Pencas Predefinidas"))
                    for (let n = 0; n < actualizarLS.pencas.length; n++) {
                        if (misPencas[i].identificador == actualizarLS.pencas[n].identificador) {
                            for (let m = 0; m < actualizarLS.pencas[n].listaPencas.length; m++) {
                                if (actualizarLS.pencas[n].listaPencas[m].usuario == servidor.id) {
                                    actualizarLS.pencas[n].listaPencas[m] = misPencas[i]
                                    localStorage.setItem("Pencas Predefinidas", JSON.stringify(actualizarLS))
                                }
                            }
                        }
                    }
                })
            })

            indice = indice + 1


        })
    })
}

//identificador Penca
let identificador = document.getElementById("identificador")
let botonFijar = document.getElementById("fijarId")
// equipos
let equipo1 = document.getElementById("equipo1")
let equipo2 = document.getElementById("equipo2")
let crearPartido = document.getElementById("crearPartido")

// Lista pencas
let pencasExistentes = JSON.parse(localStorage.getItem("Pencas Predefinidas"))

// La penca que se va a crear

let nuevaPenca 
let idDisponible

// tabla que se va a modificar

let tabla = document.getElementById("Fixture")
let titulo = document.getElementById("tituloTabla")

botonFijar.addEventListener("click",()=>{
    let i=0
    idDisponible = true
    while ((i<pencasExistentes.pencas.length)&&(idDisponible==true)){
        let id=identificador.value
        if ((pencasExistentes.pencas[i].identificador==id)||(id=="")){
            idDisponible=false
        }
        i++
    }
    if (idDisponible==true){
            let idPenca=identificador.value
            let idMostrar = document.getElementById("idMostrar")
            idMostrar.innerHTML=`<br><h3>${idPenca}</h3>`
            botonFijar.className="Esconder"
            nuevaPenca = new Penca(idPenca,(JSON.parse(localStorage.getItem("Usuario"))).id)
            titulo.innerHTML=`<h3>${idPenca}</h3>`
    }else{
        if (identificador.value==""){
            Swal.fire({
                icon: 'error',
                text: "Ingrese un identificador para su penca"
              })
        }else{
            Swal.fire({
                icon: 'error',
                text: "Identificador en uso"
              })
        }
        identificador.value=""
    }
})

// Agregar partido

crearPartido.addEventListener("click",()=>{
    if (idDisponible){
        let team1 = equipo1.value
    let team2 = equipo2.value
    if ((team1=="")||(team2=="")){
        Swal.fire({
            icon: 'error',
            text: "Ingrese el nombre de los equipos"
          })
    }else if (team2==team1){
        Swal.fire({
            icon: 'error',
            text: "Los equipos no pueden ser iguales"
          })
    }else{
        nuevaPenca.IngresarPartido(team1,team2)
        Toastify({
            text: `Se agrego correctamente el partidio entre ${team1} y ${team2} `,
            duration: 2000,
            close: true,
            gravity: "top", // `top` or `bottom`
            position: "right", // `left`, `center` or `right`
            stopOnFocus: true, // Prevents dismissing of toast on hover
            style: {
            background: "linear-gradient(to right, #00b09b, #96c93d)",
            },
      }).showToast();
        equipo1.value=""
        equipo2.value=""
        // necesito imprimir esos datos en la tabla
        let u = nuevaPenca.fixture.length -1
        ultimoPartido = nuevaPenca.fixture[u]
        let agregarElemento = document.createElement("tr")
        agregarElemento.innerHTML= `<tr>
                                        <td>${u+1}</td>
                                        <td>${ultimoPartido.team1}</td>
                                        <td>${ultimoPartido.goles1}</td>
                                        <td>VS</td>
                                        <td>${ultimoPartido.goles2}</td>
                                        <td>${ultimoPartido.team2}</td>
                                    </tr>`
        tabla.appendChild(agregarElemento)
    }
    }else {
        Swal.fire({
            icon: 'error',
            text: "Fije el identificador de la Penca"
          })
    }
    
})

// Crear la penca

let crearPenca = document.getElementById("crearPenca")

crearPenca.addEventListener("click",()=>{
    if (nuevaPenca.fixture.length<6){
        Swal.fire({
            icon: 'error',
            title: 'Partidos insuficientes',
            text: "Agregue al menos 6 partidos"
          })
    }else{
        pencasExistentes.pencas.push(nuevaPenca)
        localStorage.setItem("Pencas Predefinidas",JSON.stringify(pencasExistentes))
        location.reload()
    }
})
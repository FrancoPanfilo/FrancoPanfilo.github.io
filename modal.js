// Inicializo el array lista de usuarios
let servidorUsuarios = JSON.parse(localStorage.getItem("Servidor Usuarios"))
if (servidorUsuarios == null) {
    servidorUsuarios = new ServidorUsuarios
    servidorUsuarios.usuarios = []
    localStorage.setItem("Servidor Usuarios", JSON.stringify(servidorUsuarios))
}


const btnAbrirModal = document.querySelector("#btn-abrir-modal")
const btnAbrirModal2 = document.querySelector("#btn-abrir-modal2")

const modal = document.querySelector("#modal")
const modal2 = document.querySelector("#modal2")

btnAbrirModal.addEventListener("click", () => {
    modal.showModal();
})

btnAbrirModal2.addEventListener("click", () => {
    modal2.showModal();
})

let cuenta = document.getElementById("sesionCerrada")
let botonIS = document.getElementById("botonIS")
let cerrarSesion = document.getElementById("cerrarSesion")
let botonRegistro = document.getElementById("btn-abrir-modal2")
let botonReg = document.getElementById("botonReg")
let nuevaContraseña = document.getElementById("nuevaContraseña")
let nuevoUsuario = document.getElementById("nuevoUsuario")
let contraseñaIS = document.getElementById("contraseñaIS")
let usuarioIS = document.getElementById("usuarioIS")
let sesionIniciada = document.getElementById("sesionIniciada")



botonIS.addEventListener("click", () => {
    user.contraseña = contraseñaIS.value
    user.id = usuarioIS.value
    let listaUsuarios = JSON.parse(localStorage.getItem("Servidor Usuarios"))
    let usuarioExiste = false
    let contraseñaVerdadera
    let indice
    for (let i = 0; i < listaUsuarios.usuarios.length; i++) {
        if (listaUsuarios.usuarios[i].id == user.id) {
            usuarioExiste = true
            contraseñaVerdadera = listaUsuarios.usuarios[i].contraseña
            indice = i
        }
    }
    if (usuarioExiste && (user.contraseña == contraseñaVerdadera)) {
        localStorage.setItem("Usuario", JSON.stringify(listaUsuarios.usuarios[indice]))

    } else {
        alert("Contraseña Incorrecta, vuelva a intentarlo")
    }
    let inicio = document.getElementById("volverInicio")
    inicio.click()
})

botonReg.addEventListener("click", () => {
    user.contraseña = nuevaContraseña.value
    user.id = nuevoUsuario.value
    let listaUsuarios = JSON.parse(localStorage.getItem("Servidor Usuarios"))
    let usuarioExiste = false
    for (let i = 0; i < listaUsuarios.usuarios.length; i++) {
        if (listaUsuarios.usuarios[i].id == user.id) {
            usuarioExiste = true
        }
    }
    if (usuarioExiste) {
        alert("Nombre de usuario no disponible")
    } else {
        // si no esta en la lista de usuarios

        listaUsuarios.usuarios.push(user)
        localStorage.setItem("Servidor Usuarios", JSON.stringify(listaUsuarios))
        localStorage.setItem("Usuario", JSON.stringify(user))

    }
    let inicio = document.getElementById("volverInicio")
    inicio.click()
}
)

cerrarSesion.addEventListener("click", () => {
    user = new Usuarios("invitado", "invitado")
    localStorage.setItem("Usuario", JSON.stringify(user))
    cuenta.className = "Mostrar btn btn-primary"
    sesionIniciada.className = "Esconder"
    let inicio = document.getElementById("volverInicio")
    inicio.click()
})


let user = JSON.parse(localStorage.getItem("Usuario"))
if (user == null) {
    user = new Usuarios("invitado", "invitado")
    localStorage.setItem("Usuario", JSON.stringify(user))
}


// si se borraron pencas en la sesion anterior , mis pencas tiene elementos que se llaman pencaBorrada , hay que forrar esos elementos

// se hace de arriba a abajo para que no se altere el array y se revisen todos los lugares, para que se entienda pongo un ej
// si el [2] se borra ,entonces el [3] pasa a ser el [2] y nunca se revisa porque i sigue aumentando
// si reviso los mayores antes solo se cambia el lugar en el array de los que son mayores al elemento borrado y estos ya fueron revisados
for (let i = user.pencasActivas.length; i >= 0; i--) {
    if (user.pencasActivas[i] == "pencaBorrada") {
        user.pencasActivas.splice(i, 1)
    }
}
let misPencas2 = document.getElementById("MisPencas2")
user.pencasActivas.length == 0 ? misPencas2.classList = "Esconder" : misPencas2.classList = "enlace"
actualizarUsuario(user)
localStorage.setItem("Usuario", JSON.stringify(user))
if (user.id != "invitado") {
    cuenta.className = ("Esconder")
    sesionIniciada.className = "Mostrar"
}




function copiarArr(arreglo) {
    let copiaFix = []
    for (let i = 0; i < arreglo.length; i++) {
        let copiaPar = new Partidos
        copiaPar = Object.assign({}, arreglo[i])
        let copia = new Partidos(copiaPar.team1, copiaPar.goles1, copiaPar.team2, copiaPar.goles2)
        copiaFix.push(copia)
    }
    return copiaFix
}


function puntoss(a1, b1, a2, b2) {
    if ((a1 != "-") && (b1 != "-") && (a2 != "-") && (b2 != "-")) {
        if ((a1 == a2) && (b1 == b2)) {
            return 8
        } else if ((a1 - b1) == (a2 - b2)) {
            return 5
        } else if (((a1 < b1) && (a2 < b2)) || ((a1 > b1) && (a2 > b2))) {
            return 3
        } else {
            return 0
        }
    } else {
        return 0
    }
}


function conteoPuntos(penca) {
for (let m = 0; m < penca.listaPencas.length; m++) {
    let contador=0
    for (let i = 0; i < penca.fixture.length; i++) {
        contador = contador + puntoss(penca.resultados[i].goles1, penca.resultados[i].goles2, penca.listaPencas[m].fixture[i].goles1, penca.listaPencas[m].fixture[i].goles2)
    }
    let usuario= penca.listaPencas[m].usuario
    let listaUsuarios= JSON.parse(localStorage.getItem("Servidor Usuarios"))
    for (let i=0 ;i<listaUsuarios.usuarios.length;i++){
        if (usuario == listaUsuarios.usuarios[i].id){
            usuario=listaUsuarios.usuarios[i]
            for (let p=0 ; p<usuario.pencasActivas.length;p++){
                if (usuario.pencasActivas[p].identificador==penca.listaPencas[m].identificador){
                    usuario.pencasActivas[p]=penca.listaPencas[m]
                    listaUsuarios.usuarios[i]=usuario
                    localStorage.setItem("Servidor Pencas",listaUsuarios)
                }
            }
        }
    }
    penca.listaPencas[m].puntos=contador
}
}

function unirsePenca(penca, usuarioo) {
    let usuario = usuarioo.id
    let unaPenca = new UnaPenca(penca, usuario)
    let user = JSON.parse(localStorage.getItem("Usuario"))
    user.pencasActivas.push(unaPenca)
    localStorage.setItem("Usuario", JSON.stringify(user))
    penca.listaPencas.push(unaPenca)
    penca.usuarios.push(usuario)
    let servidor = JSON.parse(localStorage.getItem("Pencas Predefinidas"))
    servidor.pencas.forEach(penc => {
        if (penc.identificador == penca.identificador) {
            penc.usuarios = [...penca.usuarios]
            penc.listaPencas = [...penca.listaPencas]
            localStorage.setItem("Pencas Predefinidas", JSON.stringify(servidor))
            actualizarUsuario(user)
        }
    });
}

// Actualizar usuario y en particular sus pencas en la base de datos LS

function actualizarUsuario(usuario) {
    let servidor = JSON.parse(localStorage.getItem("Servidor Usuarios"))
    for (let i = 0; i < servidor.usuarios.length; i++) {
        if (usuario.id == servidor.usuarios[i].id) {
            servidor.usuarios[i].pencasActivas = usuario.pencasActivas
        }
    }
    localStorage.setItem("Servidor Usuarios", JSON.stringify(servidor))
}

function usuarioEnPenca(usuario, penca) {
    // si por alguna razon intentamos unirnos a una penca de la cual ya formamos parte , esta funcion lo impide
    let condicion = false
    for (let i = 0; i < penca.usuarios.length; i++) {
        if (penca.usuarios[i] == usuario.id) {
            condicion = true
        }
    }
    return condicion
}


function banderaPais(pais) {
    let escudo = 0
    let url = 0
    for (let i = 0; i < paises.length; i++) {
        if (paises[i].nombre == pais) {
            url = paises[i].bandera
            escudo = url
        }
    }
    if (url == 0) {
        url = "https://w7.pngwing.com/pngs/302/473/png-transparent-gray-and-black-shield-shield-drawing-logo-black-shield-angle-rectangle-photography.png"
    }
    return url
}
class ServidorPencas {
    constructor() {
        this.pencas = []
    }
}

class ServidorUsuarios {
    constructor() {
        this.usuarios = []
    }
}

class Penca {
    constructor(identificador, creador) {
        this.identificador = identificador,
            this.fixture = [],
            this.resultados = [],
            this.usuarios = ["invitado"],
        this.creador = creador,
        this.listaPencas = []
    }
    IngresarPartido(a, b) {
        let partido = new Partidos
        let partido2 = new Partidos
        partido.team1 = a
        partido.team2 = b
        partido.goles1 = "-"
        partido.goles2 = "-"
        partido2.team1 = a
        partido2.team2 = b
        partido2.goles1 = "-"
        partido2.goles2 = "-"
        this.fixture.push(partido)
        this.resultados.push(partido2)
    }

    IngresarResultado(a, b) {
        let i = 0
        while (((this.resultados[i].goles1 != "-") && (this.resultados[i].goles2 != "-")) || i > this.resultados.length) {
            i = i + 1
        }
        let partido = new Partidos
        partido = this.resultados[i]
        partido.goles1 = a
        partido.goles2 = b
        this.resultados[i] = partido
    }
    AgregarUsuario(usuario) {
        this.usuarios.push(usuario)
        usuario.pencasActivas.push(this.identificador)
    }
}

class UnaPenca {
    constructor(penca, usuario) {
        this.identificador = penca.identificador,
            this.usuario = usuario,
            this.fixture = copiarArr(penca.fixture),
            this.puntos = 0

    }
    ConteoPuntos(penca) {
        this.puntos = contarPuntos(penca, this)
    }
}

class Partidos {
    constructor(team1, goles1, team2, goles2) {
        this.team1 = team1,
            this.goles1 = goles1,
            this.team2 = team2,
            this.goles2 = goles2
    }
}

class Usuarios {
    constructor(nombre, contraseña) {
        this.id = nombre,
            this.contraseña = contraseña,
            this.pencasActivas = []
    }
}

class Pais {
    constructor(nombre, bandera) {
        this.nombre = nombre,
            this.bandera = bandera
    }
}
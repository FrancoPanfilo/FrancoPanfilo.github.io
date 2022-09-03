
let misPencas = document.getElementById("MisPencas")
misPencas.classList="Esconder"
let usua = JSON.parse(localStorage.getItem("Usuario"))
if (usua){
    usua.pencasActivas.length>0 ? misPencas.classList="opcion mispencas" : misPencas.classList="Esconder"
}

let creadas = document.getElementById("AdministrarPencas")
let penc = JSON.parse(localStorage.getItem("Pencas Predefinidas"))
let noCreoPencas= true
let i=0
while (noCreoPencas && (i<penc.pencas.length)){
    if (penc.pencas[i].creador==usua.id){
        noCreoPencas=false
    }
    i++
}
if (noCreoPencas){
    creadas.classList="Esconder"
}


// FETCH 


let paises = []
let datos
const cargarBanderas =async ()=>{
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
    })}
cargarBanderas()
// FIN DEL FETCH
// pareciera que funciona
let selector = document.getElementById("select")
let penc = (JSON.parse(localStorage.getItem("Pencas Predefinidas"))).pencas
let usua = JSON.parse(localStorage.getItem("Usuario"))
for (let i = 0; i < penc.length; i++) {
  if (penc[i].creador == usua.id) {
    let agregarElemento = document.createElement("option")
    agregarElemento.innerHTML = `<option value="${i}">${penc[i].identificador}</option>`
    selector.appendChild(agregarElemento)
  }
}

let tabla = document.getElementById("Fixture")
let boton = document.getElementById("MostrarPenca")

boton.addEventListener("click", () => {
  tabla.innerHTML = `        <thead>
    <tr>
      <th scope="col">N°</th>
      <th scope="col">Local</th>
      <th scope="col"></th>
      <th scope="col"></th>
      <th scope="col"></th>
      <th scope="col">Visitante</th>
      <th></th>
    </tr>
  </thead>
  <tbody id="partidos">

  </tbody>`

  let nombrePenca = selector.value
  // busco en las pencas 
  let todasLasPencas = (JSON.parse(localStorage.getItem("Pencas Predefinidas"))).pencas
  let pencaACambiar=""
  // el inice H se usa luego para guardar los resultados en LS
  let h 
  for (let p = 0; p < todasLasPencas.length; p++) {
    if (todasLasPencas[p].identificador == nombrePenca) {
      pencaACambiar = todasLasPencas[p].resultados
      h=p
    }
  }
  let lista = document.getElementById("partidos")
  // en esta tabla agrego las filas correspondientes a cada partido del fixture
  for (let i = 0; i < pencaACambiar.length; i++) {
    let nuevaFila = document.createElement("tr")
    nuevaFila.innerHTML=`<tr>
    <td>${i+1}</td>
    <td><img src="${banderaPais(pencaACambiar[i].team1)}">${pencaACambiar[i].team1}</td>
    <td>${pencaACambiar[i].goles1}</td>
    <td>VS</td>
    <td>${pencaACambiar[i].goles2}</td>
    <td>${pencaACambiar[i].team2}<img src="${banderaPais(pencaACambiar[i].team2)}"></td>
    <td ><button type="button" class="btn" id="botonRes${i}">Establecer Reslutado</button></td>
</tr>`
nuevaFila.setAttribute("id",`fila${i}`)
lista.appendChild(nuevaFila)
let indice=i
let asignar= document.getElementById(`botonRes${i}`)
asignar.addEventListener("click",()=>{
  let fila = document.getElementById(`fila${indice}`)
  fila.innerHTML=`<tr>
  <td>${i+1}</td>
  <td><img src="${banderaPais(pencaACambiar[indice].team1)}">${pencaACambiar[indice].team1}</td>
  <td><input  class="inputs" placeholder="${pencaACambiar[indice].goles1}" id="inputGoles1${indice}"></td>
  <td>VS</td>
  <td><input  class="inputs" placeholder="${pencaACambiar[indice].goles2}" id="inputGoles2${indice}"></td>
  <td>${pencaACambiar[indice].team2}<img src="${banderaPais(pencaACambiar[indice].team2)}"></td>
  <td ><button type="button" class="btn" id="guardarRes${indice}">Guardar Reslutado</button></td>
</tr>`
let guardar = document.getElementById(`guardarRes${indice}`)
let indice2=indice
guardar.addEventListener("click",()=>{
  let goles1=(document.getElementById(`inputGoles1${indice2}`)).value
  let goles2=(document.getElementById(`inputGoles2${indice2}`)).value
  if (((!(goles1 < 100 && goles1 > -1)) || goles1 == "") || ((!(goles2 < 100 && goles2 > -1)) || goles2 == "")) {
    alert("Reslutado erroneo")
}else{
  pencaACambiar[indice2].goles1=goles1
  pencaACambiar[indice2].goles2=goles2
  let penca = JSON.parse(localStorage.getItem("Pencas Predefinidas"))
  penca.pencas[h].resultados=pencaACambiar
  conteoPuntos(penca.pencas[h])
  localStorage.setItem("Pencas Predefinidas",JSON.stringify(penca))
}
let penca = JSON.parse(localStorage.getItem("Pencas Predefinidas"))
selector.value=penca.pencas[h].identificador
boton.click()
})
})
  }
})


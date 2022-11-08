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
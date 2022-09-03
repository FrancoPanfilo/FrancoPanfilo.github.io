let servidorLS
if (servidorLS = localStorage.getItem("Pencas Predefinidas")){
    
}else{
servidorLS = new ServidorPencas()

let  grupoA= new Penca("Penca Mundial - Grupo A","FrancoPanfilo")

grupoA.IngresarPartido("Senegal","Holanda")
grupoA.IngresarPartido("Catar","Ecuador")
grupoA.IngresarPartido("Catar","Senegal")
grupoA.IngresarPartido("Holanda","Ecuador")
grupoA.IngresarPartido("Ecuador","Senegal")
grupoA.IngresarPartido("Holanda","Catar")


let  grupoB= new Penca("Penca Mundial - Grupo B","FrancoPanfilo")

grupoB.IngresarPartido("Inglaterra","Iran")
grupoB.IngresarPartido("Estados Unidos","Gales")
grupoB.IngresarPartido("Gales","Iran")
grupoB.IngresarPartido("Inglaterra","Estados Unidos")
grupoB.IngresarPartido("Iran","Estados Unidos")
grupoB.IngresarPartido("Gales","Inglaterra")


let  grupoC= new Penca("Penca Mundial - Grupo C","FrancoPanfilo")

grupoC.IngresarPartido("Argentina","Arabia Saudita")
grupoC.IngresarPartido("Mexico","Polonia")
grupoC.IngresarPartido("Polonia","Arabia Saudita")
grupoC.IngresarPartido("Argentina","Mexico")
grupoC.IngresarPartido("Polonia","Argentina")
grupoC.IngresarPartido("Arabia Saudita","Mexico")


let  grupoD= new Penca("Penca Mundial - Grupo D","FrancoPanfilo")

grupoD.IngresarPartido("Dinamarca","Tunez")
grupoD.IngresarPartido("Francia","Australia")
grupoD.IngresarPartido("Tunez","Australia")
grupoD.IngresarPartido("Francia","Dinamarca")
grupoD.IngresarPartido("Tunez","Francia")
grupoD.IngresarPartido("Australia","Dinamarca")


let  grupoE= new Penca("Penca Mundial - Grupo E","FrancoPanfilo")

grupoE.IngresarPartido("Alemania","Japon")
grupoE.IngresarPartido("España","Costa Rica")
grupoE.IngresarPartido("Japon","Costa Rica")
grupoE.IngresarPartido("España","Alemania")
grupoE.IngresarPartido("Japon","España")
grupoE.IngresarPartido("Costa Rica","Alemania")


let  grupoF= new Penca("Penca Mundial - Grupo F","FrancoPanfilo")

grupoF.IngresarPartido("Marruecos","Croacia")
grupoF.IngresarPartido("Belgica","Canada")
grupoF.IngresarPartido("Belgica","Marruecos")
grupoF.IngresarPartido("Croacia","Canada")
grupoF.IngresarPartido("Croacia","Belgica")
grupoF.IngresarPartido("Canada","Marruecos")


let  grupoG= new Penca("Penca Mundial - Grupo G","FrancoPanfilo")

grupoG.IngresarPartido("Suiza","Camerun")
grupoG.IngresarPartido("Brasil","Serbia")
grupoG.IngresarPartido("Camerun","Serbia")
grupoG.IngresarPartido("Brasil","Suiza")
grupoG.IngresarPartido("Serbia","Suiza")
grupoG.IngresarPartido("Camerun","Brasil")


let  grupoH= new Penca("Penca Mundial - Grupo H","FrancoPanfilo")

grupoH.IngresarPartido("Uruguay","Corea del Sur")
grupoH.IngresarPartido("Portugal","Ghana")
grupoH.IngresarPartido("Corea del Sur","Ghana")
grupoH.IngresarPartido("Portugal","Uruguay")
grupoH.IngresarPartido("Corea del Sur","Portugal")
grupoH.IngresarPartido("Ghana","Uruguay")

//cargar pencas al servidor de pencas 
servidorLS.pencas.push(grupoA)
servidorLS.pencas.push(grupoB)
servidorLS.pencas.push(grupoC)
servidorLS.pencas.push(grupoD)
servidorLS.pencas.push(grupoE)
servidorLS.pencas.push(grupoF)
servidorLS.pencas.push(grupoG)
servidorLS.pencas.push(grupoH)

servidorLS.pencas.sort((a, b) => {
    return b.identificador + a.identificador;
});

servidorLS = JSON.stringify(servidorLS)
localStorage.setItem("Pencas Predefinidas",servidorLS)
}

// Sugar sintax (por las dudas no borro lo demas) (no funco jajajajaj)

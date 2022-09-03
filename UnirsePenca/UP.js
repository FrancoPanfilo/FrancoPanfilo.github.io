
let servidor = JSON.parse(localStorage.getItem("Pencas Predefinidas"))
let tabla = document.getElementById("tabla")


for (let i=0;i<servidor.pencas.length;i++){
    let agregarElemento = document.createElement("tr")
    agregarElemento.innerHTML= `<tr>
                                    <td>${servidor.pencas[i].identificador}</td>
                                    <td>${servidor.pencas[i].fixture.length}</td>
                                    <td>${servidor.pencas[i].usuarios.length-1}</td>
                                    <td><button id="boton${i}" type="button" class="btn">Unirme</button></td>
                                </tr>`
    // verifico que la penca no este activa
        let user = JSON.parse(localStorage.getItem("Usuario"))
        for (let n=0; n<user.pencasActivas.length; n++){
            if (servidor.pencas[i].identificador==user.pencasActivas[n].identificador){
                agregarElemento.className = "Esconder"
                }
        }
    agregarElemento.setAttribute("id",`penca${i}`)
    tabla.appendChild(agregarElemento)
    let elboton = document.getElementById(`boton${i}`)
    elboton.addEventListener("click",()=>{
        if (user.id =="invitado"){
            Swal.fire({
                icon: 'error',
                title: 'Oops...',
                text: 'Antes tienes que Registrarte!',
                footer: '<a href="">Registrarme</a>'
              })
        }else if(usuarioEnPenca(user,servidor.pencas[i])){
            Swal.fire({
                icon: 'error',
                title: 'Oops...',
                text: 'Ya estas unido a esta penca',
              })
        } else{
            unirsePenca(servidor.pencas[i],user)
            elboton.className="Esconder"
            let fila= document.getElementById(`penca${i}`)
            fila.className="Esconder"
            Toastify({
                text: `Te uniste a la penca ${servidor.pencas[i].identificador} `,
                duration: 3000,
                destination: "../MisPencas/MP.html",
                newWindow: true,
                close: true,
                gravity: "top",
                position: "right",
                stopOnFocus: true,
                style: {
                background: "linear-gradient(to right, #00b09b, #96c93d)",
                },
          }).showToast()
          user=JSON.parse(localStorage.getItem("Usuario"))
          let misPencas2 = document.getElementById("MisPencas2")
          user.pencasActivas.length==0 ? misPencas2.classList="Esconder" : misPencas2.classList="enlace"
    }}
)}
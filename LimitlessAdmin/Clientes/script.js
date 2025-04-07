import {
  db,
  getFirestore,
  collection,
  getDocs,
  updateDoc,
  increment,
  doc,
  addDoc,
  arrayUnion,
  getDoc,
  query,
  where,
  deleteDoc,
  setDoc,
} from "./../db.js";
async function agregarCliente(nombre) {
  let codigo = 0;
  const snapshot = await getDocs(collection(db, "Contadores"));

  snapshot.forEach((doc) => {
    const client = { id: doc.id, ...doc.data() };
    codigo = `C${client.clientes.toString().padStart(3, "0")}`;
  });
  try {
    const docRef = await addDoc(collection(db, "Clientes"), {
      nombre: nombre,
      compras: [],
      cantCompras: 0,
      codigo: codigo,
    });
    cargarClientes();
    alert("Cliente cargado correctamente");
    document.getElementById("link").value = "";
  } catch (err) {
    console.error("Error", err);
  }
  try {
    const clientDoc = doc(db, "Contadores", "Contadores");
    await updateDoc(clientDoc, { clientes: increment(1) });
  } catch (error) {
    console.error("Error actualizando el contador: ", error);
  }
}

async function cargarClientes() {
  const qrCollection = collection(db, "Clientes");
  const qrSnapshot = await getDocs(qrCollection);
  const qrList = qrSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  qrList.sort((a, b) => a.codigo.localeCompare(b.codigo));

  const tableBody = document.querySelector("#qrTable tbody");
  tableBody.innerHTML = ""; // Limpiar la tabla antes de llenar

  qrList.forEach((qr) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${qr.nombre}</td>
      <td>${qr.codigo}</td>
      <td>${qr.cantCompras}</td>
      <td><a class="verCompras" id="${qr.codigo}Compras">Ver Compras</a></td>
    `;
    let parametro = qr.codigo + "-" + qr.nombre;
    tableBody.appendChild(row);
    document
      .getElementById(`${qr.codigo}Compras`)
      .addEventListener("click", () => mostrarModal(parametro));
  });
}

async function mostrarModal(clienteCodigo) {
  document.getElementById(
    "comprasCliente"
  ).innerText = `Compras de ${clienteCodigo}`;
  const modal = document.getElementById("comprasModal");
  const tableBody = document.querySelector("#comprasTable tbody");
  const closeBtn = document.querySelector(".close");

  // Limpiar la tabla del modal
  tableBody.innerHTML = "";

  // Mostrar el modal
  modal.style.display = "block";

  // Buscar las compras del cliente en la colección "Ventas"
  try {
    const ventasCollection = collection(db, "Ventas");
    const querySnapshot = await getDocs(ventasCollection);

    let ventasFiltradas = [];
    querySnapshot.forEach((doc) => {
      const venta = doc.data();
      if (venta.cliente && venta.cliente.toString().includes(clienteCodigo)) {
        ventasFiltradas.push({ id: doc.id, ...venta });
      }
    });

    if (ventasFiltradas.length > 0) {
      ventasFiltradas.forEach((venta) => {
        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${venta.codigo}</td>
          <td>${venta.producto || "N/A"}</td>
          <td>${venta.talle || "N/A"}</td>
          <td>
            ${venta.vinculo || "Sin vínculo"}
            ${
              venta.vinculo
                ? `<span class="tooltip" data-id="${venta.vinculo}">?</span>`
                : ""
            }
          </td>
          <td><input type="checkbox" class="pagado-checkbox" ${
            venta.pagado ? "checked disabled" : "disabled"
          }></td>
        `;
        tableBody.appendChild(row);
      });
    } else {
      const row = document.createElement("tr");
      row.innerHTML = `<td colspan="5">No se encontraron compras para este cliente</td>`;
      tableBody.appendChild(row);
    }

    // Agregar tooltips después de renderizar la tabla
    addQrTooltips();
  } catch (error) {
    console.error("Error al cargar compras:", error);
    const row = document.createElement("tr");
    row.innerHTML = `<td colspan="5">Error al cargar las compras</td>`;
    tableBody.appendChild(row);
  }

  // Cerrar el modal al hacer clic en la "X"
  closeBtn.onclick = () => {
    modal.style.display = "none";
  };

  // Cerrar el modal al hacer clic fuera de él
  window.onclick = (event) => {
    if (event.target === modal) {
      modal.style.display = "none";
    }
  };
}
async function addQrTooltips() {
  const tooltips = document.querySelectorAll(".tooltip");
  tooltips.forEach((tooltip) => {
    const qrNombre = tooltip.getAttribute("data-id");

    if (!qrNombre) return;

    const fetchQrData = async () => {
      try {
        // Buscar en "QRs" donde el campo "nombre" coincida con qrNombre
        const qrQuery = query(
          collection(db, "QRs"),
          where("nombre", "==", qrNombre)
        );
        const querySnapshot = await getDocs(qrQuery);

        if (!querySnapshot.empty) {
          // Tomamos el primer documento (asumiendo que "nombre" es único)
          const qrData = querySnapshot.docs[0].data();
          const tooltipText = `
           \nNombre: ${qrData.nombre || "N/A"}
           \nLink: ${qrData.link || "N/A"}
          `;
          tooltip.setAttribute("data-tooltip", tooltipText);
        } else {
          tooltip.setAttribute("data-tooltip", "QR no encontrado");
        }
      } catch (error) {
        console.error("Error al cargar datos del QR:", error);
        tooltip.setAttribute("data-tooltip", "Error al cargar datos");
      }
    };

    tooltip.addEventListener("mouseenter", fetchQrData);
  });
}
// Cargar los clientes al iniciar la página
cargarClientes();

document.getElementById("boton").addEventListener("click", () => {
  const link = document.getElementById("link").value;
  if (link) {
    agregarCliente(link);
  } else {
    alert("Por favor ingresa un nombre para el cliente");
  }
});

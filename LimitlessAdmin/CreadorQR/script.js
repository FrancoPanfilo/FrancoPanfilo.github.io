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
const colorPicker = document.getElementById("colorPicker");
const preview = document.getElementById("preview");
const colorPicker1 = document.getElementById("colorPicker1");
const preview1 = document.getElementById("preview1");
preview1.style.backgroundColor = colorPicker1.value;
preview.style.backgroundColor = colorPicker.value;
colorPicker.addEventListener("input", () => {
  preview.style.backgroundColor = colorPicker.value;
});
colorPicker1.addEventListener("input", () => {
  preview1.style.backgroundColor = colorPicker1.value;
});

async function agregarQR() {
  let codigo = 0;
  const snapshot = await getDocs(collection(db, "Contadores"));

  snapshot.forEach((doc) => {
    const client = { id: doc.id, ...doc.data() };
    codigo = `Qr${client.qr.toString().padStart(3, "0")}`;
  });
  let nombre = codigo;
  let link = nombre + ".com";
  let qrLink;
  try {
    // Crea un nuevo documento en la colección 'QRs' con los datos proporcionados
    const docRef = await addDoc(collection(db, "QRs"), {
      nombre: nombre,
      link: link,
      vinculado: "",
    });
    qrLink = `www.scanyourstyle.com/Redirigiendo/?id=${docRef.id}`;
    const copiarContenido = async () => {
      try {
        await navigator.clipboard.writeText(
          `www.scanyourstyle.com/Redirigiendo/?id=${docRef.id}`
        );
        alert("Link copiado en portapapeles");
      } catch (err) {
        console.error("Error al copiar: ", err);
      }
    };
    copiarContenido();
    // Retornar el ID generado para asociarlo con el QR dinámico
  } catch (e) {
    console.error("Error al agregar el documento: ", e);
  }
  try {
    const clientDoc = doc(db, "Contadores", "Contadores");
    await updateDoc(clientDoc, { qr: increment(1) });
  } catch (error) {
    console.error("Error actualizando el email: ", error);
  }
  // descaragar imagen rapidamente

  const specificity = document.getElementById("specificity").value;

  // Limpiar el código QR anterior
  document.getElementById("qr-code").innerHTML = "";
  let color = document.getElementById("colorPicker").value;
  const qrCode = new QRCode(document.getElementById("qr-code"), {
    text: qrLink,
    width: 1000, // Aumentar la resolución
    height: 1000, // Aumentar la resolución
    colorDark: color,
    colorLight: "transparent", // Fondo transparente
    correctLevel: QRCode.CorrectLevel[specificity],
  });

  // Esperar a que se genere el código QR
  setTimeout(() => {
    const qrCanvas = document.querySelector("#qr-code canvas");
    if (qrCanvas) {
      const imgData = qrCanvas
        .toDataURL("image/png") // Mantener formato PNG
        .replace("image/png", "image/octet-stream");
      const downloadLink = document.getElementById("download-link");
      downloadLink.href = imgData;
      downloadLink.download = nombre + ".png";
      downloadLink.style.display = "block";
    }
  }, 500);
  cargarQRs();
}
async function agregarQR1(link) {
  let codigo = 0;

  const specificity = document.getElementById("specificity1").value;

  // Limpiar el código QR anterior
  document.getElementById("qr-code1").innerHTML = "";
  let color = document.getElementById("colorPicker1").value;
  const qrCode = new QRCode(document.getElementById("qr-code1"), {
    text: qrLink,
    width: 1000, // Aumentar la resolución
    height: 1000, // Aumentar la resolución
    colorDark: color,
    colorLight: "transparent", // Fondo transparente
    correctLevel: QRCode.CorrectLevel[specificity],
  });

  // Esperar a que se genere el código QR
  setTimeout(() => {
    const qrCanvas = document.querySelector("#qr-code1 canvas");
    if (qrCanvas) {
      const imgData = qrCanvas
        .toDataURL("image/png") // Mantener formato PNG
        .replace("image/png", "image/octet-stream");
      const downloadLink = document.getElementById("download-link1");
      downloadLink.href = imgData;
      downloadLink.download = "qr.png";
      downloadLink.style.display = "block";
    }
  }, 500);
  cargarQRs();
}

document
  .getElementById("boton1")
  .addEventListener("click", () => generateQRDinamicCode());
document
  .getElementById("boton11")
  .addEventListener("click", () => generateQRCode());
function generateQRCode() {
  const link = document.getElementById("text1").value;
  const specificity = document.getElementById("specificity1").value;

  if (!link) {
    alert("Por favor ingresa un enlace..");
    return;
  }

  // Limpiar el código QR anterior
  document.getElementById("qr-code1").innerHTML = "";
  let color = document.getElementById("colorPicker1").value;
  const qrCode = new QRCode(document.getElementById("qr-code1"), {
    text: link,
    width: 1000, // Aumentar la resolución
    height: 1000, // Aumentar la resolución
    colorDark: color,
    colorLight: "transparent", // Fondo transparente
    correctLevel: QRCode.CorrectLevel[specificity],
  });

  // Esperar a que se genere el código QR
  setTimeout(() => {
    const qrCanvas = document.querySelector("#qr-code1 canvas");
    if (qrCanvas) {
      const imgData = qrCanvas
        .toDataURL("image/png") // Mantener formato PNG
        .replace("image/png", "image/octet-stream");
      const downloadLink = document.getElementById("download-link1");
      downloadLink.href = imgData;
      downloadLink.download = "qr_code.png";
      downloadLink.style.display = "block";
    }
  }, 500);
}
function generateQRDinamicCode() {
  agregarQR();
  document.getElementById("qr-code").innerHTML = "";
}
// tabla
async function cargarQRs() {
  const qrCollection = collection(db, "QRs");
  const qrSnapshot = await getDocs(qrCollection);
  let qrList = qrSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  // Ordenar por nombre
  qrList.sort((a, b) => a.nombre.localeCompare(b.nombre));

  const tableBody = document.querySelector("#qrTable tbody");
  const nameFilter = document.getElementById("nameFilter");
  const linkFilter = document.getElementById("linkFilter");
  const vinculadoFilter = document.getElementById("vinculadoFilter");

  function renderTable(filteredList) {
    tableBody.innerHTML = ""; // Limpiar la tabla
    filteredList.forEach((qr) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${qr.id}</td>
        <td>${qr.nombre}</td>
        <td>
          ${qr.vinculado || "No vinculado"}
          ${
            qr.vinculado
              ? `<span class="tooltip" data-id="${qr.vinculado}">?</span>`
              : ""
          }
        </td>
        <td><input type="text" value="${qr.link}" id="link-${qr.id}" /></td>
        <td><button id="save${qr.id}">Guardar</button></td>
        <td><button id="link${qr.id}">Link</button></td>
      `;
      tableBody.appendChild(row);
      document
        .getElementById(`save${qr.id}`)
        .addEventListener("click", () => guardarLink(qr.id));
      document
        .getElementById(`link${qr.id}`)
        .addEventListener("click", () => descargarQR(qr.id));
    });

    // Agregar tooltips dinámicos después de renderizar la tabla
    addTooltips();
  }
  async function addTooltips() {
    const tooltips = document.querySelectorAll(".tooltip");
    tooltips.forEach((tooltip) => {
      const ventaId = tooltip.getAttribute("data-id");

      // Si no hay ID de venta, no hacemos nada
      if (!ventaId) return;

      // Buscar la venta en la colección "Ventas" por el campo único
      const fetchVentaData = async () => {
        try {
          console.log(ventaId);
          // Suponiendo que el campo único en "Ventas" se llama "ventaId"
          const ventasQuery = query(
            collection(db, "Ventas"),
            where("codigo", "==", ventaId)
          );
          const querySnapshot = await getDocs(ventasQuery);

          if (!querySnapshot.empty) {
            // Tomamos el primer documento (asumiendo que "ventaId" es único)
            const ventaData = querySnapshot.docs[0].data();
            const tooltipText = `
              \nID Venta: ${ventaId}
              \nCliente: ${ventaData.cliente || "N/A"}
              \nProducto: ${ventaData.producto || "N/A"}
              \nTalle: ${ventaData.talle || "N/A"}
            `;
            tooltip.setAttribute("data-tooltip", tooltipText);
          } else {
            tooltip.setAttribute("data-tooltip", "Venta no encontrada");
          }
        } catch (error) {
          console.error("Error al cargar datos de la venta:", error);
          tooltip.setAttribute("data-tooltip", "Error al cargar datos");
        }
      };

      // Ejecutar la búsqueda de datos al pasar el mouse
      tooltip.addEventListener("mouseenter", fetchVentaData);
    });
  }
  function applyFilters() {
    let filteredList = [...qrList];

    // Filtro por nombre
    const nameValue = nameFilter.value.toLowerCase();
    if (nameValue) {
      filteredList = filteredList.filter((qr) =>
        qr.nombre.toLowerCase().includes(nameValue)
      );
    }

    // Filtro por link
    const linkValue = linkFilter.value.toLowerCase();
    if (linkValue) {
      filteredList = filteredList.filter((qr) =>
        qr.link.toLowerCase().includes(linkValue)
      );
    }

    // Filtro por vinculación
    const vinculadoValue = vinculadoFilter.value;
    if (vinculadoValue !== "todos") {
      filteredList = filteredList.filter((qr) =>
        vinculadoValue === "vinculados"
          ? qr.vinculado != ""
          : qr.vinculado == ""
      );
    }

    renderTable(filteredList);
  }

  // Event listeners para los filtros
  nameFilter.addEventListener("input", applyFilters);
  linkFilter.addEventListener("input", applyFilters);
  vinculadoFilter.addEventListener("change", applyFilters);

  // Render inicial
  applyFilters();
}
function descargarQR(id) {
  const copiarContenido = async () => {
    try {
      await navigator.clipboard.writeText(
        `www.scanyourstyle.com/Redirigiendo/?id=${id}`
      );
      alert("Link copiado en portapapeles");
    } catch (err) {
      console.error("Error al copiar: ", err);
    }
  };
  copiarContenido();
}
// Función para guardar el nuevo link en Firestore
async function guardarLink(id) {
  const newLink = document.getElementById(`link-${id}`).value;

  if (newLink) {
    const qrDocRef = doc(db, "QRs", id);
    try {
      await updateDoc(qrDocRef, { link: newLink });
      alert("Link actualizado exitosamente.");
    } catch (error) {
      console.error("Error actualizando el link: ", error);
    }
  } else {
    alert("El campo link no puede estar vacío.");
  }
}

// Cargar los QR dinámicos al cargar la página
cargarQRs();

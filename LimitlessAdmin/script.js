import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  updateDoc,
  increment,
  doc,
  addDoc,
  arrayUnion,
} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBZskI-w8lTQ5eF7b24d9Mae27Jjc6nenU",
  authDomain: "limitless-259e1.firebaseapp.com",
  projectId: "limitless-259e1",
  storageBucket: "limitless-259e1.appspot.com",
  messagingSenderId: "780450660358",
  appId: "1:780450660358:web:9f6fd50c7770b5b9e34387",
  measurementId: "G-N6EVVE075H",
};
const mobileNav = document.querySelector(".hamburger");
const navbar = document.querySelector(".menubar");

const toggleNav = () => {
  navbar.classList.toggle("active");
  mobileNav.classList.toggle("hamburger-active");
};
mobileNav.addEventListener("click", () => toggleNav());
const tableBody = document.querySelector("tbody");
const modal = document.getElementById("myModal");
const modalTable = document.getElementById("modalTable");
const seleccionarBtn = document.getElementById("seleccionarBtn");
document
  .getElementById("cerrarM")
  .addEventListener("click", () => cerrarModal());
async function mostrarModal(idVenta, codigoVenta) {
  console.log(idVenta, codigoVenta);
  modal.style.display = "block";
  const qrCollection = collection(db, "QRs");
  const qrSnapshot = await getDocs(qrCollection);
  const qrList = qrSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  qrList.sort((a, b) => a.nombre.localeCompare(b.nombre));

  const tableBody = document.querySelector("#modalTable");
  tableBody.innerHTML = ""; // Limpiar la tabla antes de llenar

  qrList.forEach((qr) => {
    if (qr.vinculado === "") {
      const row = document.createElement("tr");

      // Crear celdas para cada campo
      row.innerHTML = `
          <td>${qr.nombre}</td>
          <td>${qr.link}</td>
  
  
        `;
      tableBody.appendChild(row);
      row.addEventListener("click", () => {
        const conf = confirm(`Vincular ${codigoVenta} a ${qr.nombre}`);
        if (conf) {
          try {
            const clientDoc = doc(db, "Ventas", idVenta);
            updateDoc(clientDoc, { vinculo: qr.nombre });
          } catch (error) {
            console.error("Error actualizando el email: ", error);
          }
          try {
            const clientDoc = doc(db, "QRs", qr.id);
            updateDoc(clientDoc, { vinculado: codigoVenta });
          } catch (error) {
            console.error("Error actualizando el email: ", error);
          }
        } else {
        }
      });
    }
  });
}

// Función para cerrar el modal
function cerrarModal() {
  modal.style.display = "none";
}

// Función para manejar la selección de una fila en el modal

// Agregar el event listener al botón "Agregar"
document.querySelectorAll(".accion button").forEach((button) => {
  button.addEventListener("click", mostrarModal);
});

// Agregar el event listener al botón "Seleccionar" del modal
// Inicializa Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
async function agregarCliente(nombre, precio, talle, direccion) {
  console.log(precio);
  let codigo = 0;
  const snapshot = await getDocs(collection(db, "Contadores"));

  snapshot.forEach((doc) => {
    const client = { id: doc.id, ...doc.data() };
    codigo = `V${client.venta.toString().padStart(3, "0")}`;
  });
  const snapshotP = await getDocs(collection(db, "Productos"));
  let idProd;
  snapshotP.forEach((doc) => {
    if (doc.data().nombre == precio) {
      idProd = doc.id;
    }
  });
  try {
    const clientDoc = doc(db, "Productos", idProd);
    await updateDoc(clientDoc, { ventas: increment(1) });
  } catch (error) {
    console.error("Error actualizando el email: ", error);
  }
  const snapshotC = await getDocs(collection(db, "Clientes"));
  let idC;
  snapshotC.forEach((doc) => {
    if (doc.data().codigo == nombre.slice(0, 4)) {
      idC = doc.id;
    }
  });
  try {
    console.log(idC);
    const clientDoc = doc(db, "Clientes", idC);
    await updateDoc(clientDoc, {
      compras: arrayUnion(codigo),
      cantCompras: increment(1),
    });
  } catch (error) {
    console.error("Error actualizando el email: ", error);
  }

  try {
    // Crea un nuevo documento en la colección 'QRs' con los datos proporcionados
    const docRef = await addDoc(collection(db, "Ventas"), {
      cliente: nombre,
      vinculo: "",
      producto: precio,
      talle: talle,
      direccion: direccion,
      pagado: false,
      enviado: false,
      entregado: false,
      codigo: codigo,
    });
    cargarClientes();

    alert("Venta cargada correcctamente");
  } catch (err) {
    console.error("Error", err);
  }
  try {
    const clientDoc = doc(db, "Contadores", "Contadores");
    await updateDoc(clientDoc, { venta: increment(1) });
  } catch (error) {
    console.error("Error actualizando el email: ", error);
  }
}

// tabla

async function cargarClientes() {
  const qrCollection = collection(db, "Ventas");
  const qrSnapshot = await getDocs(qrCollection);
  const qrList = qrSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  qrList.sort((a, b) => a.codigo.localeCompare(b.codigo));

  const tableBody = document.querySelector("#qrTable tbody");
  tableBody.innerHTML = ""; // Limpiar la tabla antes de llenar

  qrList.forEach((qr) => {
    const row = document.createElement("tr");
    row.dataset.id = qr.id; // Agregamos el ID del documento a la fila

    // Crear celdas para cada campo
    row.innerHTML = `
      <td>${qr.codigo}</td>
      <td class="accion">${qr.vinculo}</td>
      <td>${qr.cliente}</td>
      <td>${qr.producto}</td>
      <td>${qr.talle}</td>
      <td>${qr.direccion}</td>
  
      <td><input type="checkbox" class="pagado-checkbox" ${
        qr.pagado ? "checked disabled" : ""
      }></td>
      <td><input type="checkbox" class="enviado-checkbox" ${
        qr.enviado ? "checked disabled" : ""
      }></td>
      <td><input type="checkbox" class="entregado-checkbox" ${
        qr.entregado ? "checked disabled" : ""
      }></td>
    `;

    tableBody.appendChild(row);
    const actionCell = row.querySelector(".accion");

    // Crear el botón o mostrar el valor del vínculo
    if (qr.vinculo === "") {
      const button = document.createElement("button");
      button.textContent = "+";
      actionCell.appendChild(button);
      button.addEventListener("click", () =>
        mostrarModal(row.dataset.id, qr.codigo)
      );
    } else {
      actionCell.textContent = qr.vinculo;
    }
    // Agregar el event listener a cada fila
    row.addEventListener("click", async (event) => {
      if (event.target.type === "checkbox") {
        event.stopPropagation();

        const confirmed = confirm("¿Estás seguro de realizar este cambio?");

        if (confirmed) {
          const checkboxClass = event.target.classList[0];
          const field = checkboxClass.replace("-checkbox", "");

          // Actualizar el documento en Firebase
          const docRef = doc(db, "Ventas", row.dataset.id); // Usamos el ID de la fila
          await updateDoc(docRef, {
            [field]: event.target.checked,
          })
            .then(() => {
              console.log("Documento actualizado correctamente");
            })
            .catch((error) => {
              console.error("Error al actualizar el documento:", error);
            });

          // Deshabilitar el checkbox
          event.target.disabled = true;
        } else {
          // Deshacer el cambio visual (opcional)
          event.target.checked = !event.target.checked;
        }
      }
    });
  });
}
// Cargar los QR dinámicos al cargar la página
document.getElementById("boton").addEventListener("click", () => {
  const link = document.getElementById("link").value;
  console.log(link);
  const link1 = document.getElementById("link1").value;
  agregarCliente(
    link,
    link1,
    document.getElementById("talles").value,
    document.getElementById("dir").value
  );
  cargarClientes();
});
async function populateSelectFromFirebase() {
  const selectElement = document.getElementById("link");

  if (!selectElement) {
    console.error('No se encontró el elemento <select> con id="link".');
    return;
  }

  try {
    // Obtener la referencia a la colección "Clientes"
    const qrCollection = collection(db, "Clientes");
    const clientesSnapshot = await getDocs(qrCollection);
    // Limpiar las opciones actuales del select
    selectElement.innerHTML = "";

    // Agregar una opción por cada cliente
    clientesSnapshot.forEach((doc) => {
      const cliente = doc.data(); // Datos del cliente
      const option = document.createElement("option");
      option.value = `${cliente.codigo}-${cliente.nombre}`; // Usar el ID del documento como valor
      option.textContent = cliente.nombre; // Mostrar el nombre del cliente
      selectElement.appendChild(option);
    });

    console.log("Opciones cargadas correctamente.");
  } catch (error) {
    console.error(
      'Error al obtener los datos de la colección "Clientes":',
      error
    );
  }
}
async function populateSelectFromFirebase1() {
  const selectElement = document.getElementById("link1");

  if (!selectElement) {
    console.error('No se encontró el elemento <select> con id="link".');
    return;
  }

  try {
    // Obtener la referencia a la colección "Clientes"
    const qrCollection = collection(db, "Productos");
    const clientesSnapshot = await getDocs(qrCollection);
    // Limpiar las opciones actuales del select
    selectElement.innerHTML = "";

    // Agregar una opción por cada cliente
    clientesSnapshot.forEach((doc) => {
      const cliente = doc.data(); // Datos del cliente
      const option = document.createElement("option");
      option.value = cliente.nombre; // Usar el ID del documento como valor
      option.textContent = cliente.nombre; // Mostrar el nombre del cliente
      selectElement.appendChild(option);
    });

    console.log("Opciones cargadas correctamente.");
  } catch (error) {
    console.error(
      'Error al obtener los datos de la colección "Clientes":',
      error
    );
  }
}
document.addEventListener("DOMContentLoaded", populateSelectFromFirebase);
document.addEventListener("DOMContentLoaded", populateSelectFromFirebase1);
cargarClientes();

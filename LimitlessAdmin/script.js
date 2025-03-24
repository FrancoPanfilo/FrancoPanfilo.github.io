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
const modal = document.getElementById("myModal");
const toggleNav = () => {
  navbar.classList.toggle("active");
  mobileNav.classList.toggle("hamburger-active");
};
mobileNav.addEventListener("click", () => toggleNav());

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function mostrarModal(idVenta, codigoVenta) {
  modal.style.display = "block";
  const qrCollection = collection(db, "QRs");
  const qrSnapshot = await getDocs(qrCollection);
  const qrList = qrSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  qrList.sort((a, b) => a.nombre.localeCompare(b.nombre));

  const tableBody = document.querySelector("#modalTable tbody"); // Ajustado a tbody
  tableBody.innerHTML = "";

  qrList.forEach((qr) => {
    if (qr.vinculado === "") {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${qr.nombre}</td>
        <td>${qr.link}</td>
      `;
      tableBody.appendChild(row);
      row.addEventListener("click", async () => {
        const conf = confirm(`Vincular ${codigoVenta} a ${qr.nombre}`);
        if (conf) {
          try {
            const ventaDoc = doc(db, "Ventas", idVenta);
            await updateDoc(ventaDoc, { vinculo: qr.nombre });
            const qrDoc = doc(db, "QRs", qr.id);
            await updateDoc(qrDoc, { vinculado: codigoVenta });
            cerrarModal();
            cargarClientes();
          } catch (error) {
            console.error("Error al vincular:", error);
          }
        }
      });
    }
  });
}

function cerrarModal() {
  modal.style.display = "none";
}

async function agregarCliente(nombre, precio, talle, direccion) {
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
    console.error("Error actualizando producto: ", error);
  }
  const snapshotC = await getDocs(collection(db, "Clientes"));
  let idC;
  snapshotC.forEach((doc) => {
    if (doc.data().codigo == nombre.slice(0, 4)) {
      idC = doc.id;
    }
  });
  try {
    const clientDoc = doc(db, "Clientes", idC);
    await updateDoc(clientDoc, {
      compras: arrayUnion(codigo),
      cantCompras: increment(1),
    });
  } catch (error) {
    console.error("Error actualizando cliente: ", error);
  }

  try {
    await addDoc(collection(db, "Ventas"), {
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
    document.getElementById("link").value = "";
    document.getElementById("link1").value = "";
    document.getElementById("talles").value = "";
    document.getElementById("dir").value = "";
  } catch (err) {
    console.error("Error al agregar venta:", err);
  }
  try {
    const clientDoc = doc(db, "Contadores", "Contadores");
    await updateDoc(clientDoc, { venta: increment(1) });
    alert("Venta cargada correctamente");
  } catch (error) {
    console.error("Error actualizando contador: ", error);
  }
}

async function cargarClientes() {
  const qrCollection = collection(db, "Ventas");
  const qrSnapshot = await getDocs(qrCollection);
  let qrList = qrSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  qrList.sort((a, b) => a.codigo.localeCompare(b.codigo));

  const tableBody = document.querySelector("#qrTable tbody");
  const filtroPagado = document.getElementById("filtroPagado");
  const filtroEnviado = document.getElementById("filtroEnviado");
  const filtroEntregado = document.getElementById("filtroEntregado");

  function renderTable(filteredList) {
    tableBody.innerHTML = "";
    filteredList.forEach((qr) => {
      const row = document.createElement("tr");
      row.dataset.id = qr.id;
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

      row.addEventListener("click", async (event) => {
        if (event.target.type === "checkbox") {
          event.stopPropagation();
          const confirmed = confirm("¿Estás seguro de realizar este cambio?");
          if (confirmed) {
            const checkboxClass = event.target.classList[0];
            const field = checkboxClass.replace("-checkbox", "");
            const docRef = doc(db, "Ventas", row.dataset.id);
            await updateDoc(docRef, { [field]: event.target.checked })
              .then(() => {
                console.log("Documento actualizado correctamente");
              })
              .catch((error) => {
                console.error("Error al actualizar el documento:", error);
              });
            event.target.disabled = true;
          } else {
            event.target.checked = !event.target.checked;
          }
        }
      });
    });
  }

  function applyFilters() {
    let filteredList = [...qrList];
    const pagadoValue = filtroPagado.value;
    const enviadoValue = filtroEnviado.value;
    const entregadoValue = filtroEntregado.value;

    if (pagadoValue !== "todas") {
      filteredList = filteredList.filter(
        (qr) => qr.pagado === (pagadoValue === "si")
      );
    }
    if (enviadoValue !== "todas") {
      filteredList = filteredList.filter(
        (qr) => qr.enviado === (enviadoValue === "si")
      );
    }
    if (entregadoValue !== "todas") {
      filteredList = filteredList.filter(
        (qr) => qr.entregado === (entregadoValue === "si")
      );
    }

    renderTable(filteredList);
  }

  filtroPagado.addEventListener("change", applyFilters);
  filtroEnviado.addEventListener("change", applyFilters);
  filtroEntregado.addEventListener("change", applyFilters);

  applyFilters(); // Renderizado inicial con "Todas"
}

document.getElementById("boton").addEventListener("click", () => {
  const link = document.getElementById("link").value;
  const link1 = document.getElementById("link1").value;
  agregarCliente(
    link,
    link1,
    document.getElementById("talles").value,
    document.getElementById("dir").value
  );
});

async function populateSelectFromFirebase() {
  const selectElement = document.getElementById("link");
  if (!selectElement) return;

  try {
    const qrCollection = collection(db, "Clientes");
    const clientesSnapshot = await getDocs(qrCollection);
    selectElement.innerHTML = "";
    clientesSnapshot.forEach((doc) => {
      const cliente = doc.data();
      const option = document.createElement("option");
      option.value = `${cliente.codigo}-${cliente.nombre}`;
      option.textContent = cliente.nombre;
      selectElement.appendChild(option);
    });
  } catch (error) {
    console.error("Error al obtener clientes:", error);
  }
}

async function populateSelectFromFirebase1() {
  const selectElement = document.getElementById("link1");
  if (!selectElement) return;

  try {
    const qrCollection = collection(db, "Productos");
    const clientesSnapshot = await getDocs(qrCollection);
    selectElement.innerHTML = "";
    clientesSnapshot.forEach((doc) => {
      const cliente = doc.data();
      const option = document.createElement("option");
      option.value = cliente.nombre;
      option.textContent = cliente.nombre;
      selectElement.appendChild(option);
    });
  } catch (error) {
    console.error("Error al obtener productos:", error);
  }
}

document.addEventListener("DOMContentLoaded", populateSelectFromFirebase);
document.addEventListener("DOMContentLoaded", populateSelectFromFirebase1);
cargarClientes();

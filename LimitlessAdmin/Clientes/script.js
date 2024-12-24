import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  updateDoc,
  doc,
  addDoc,
  increment,
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

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function agregarCliente(nombre) {
  let codigo = 0;
  const snapshot = await getDocs(collection(db, "Contadores"));

  snapshot.forEach((doc) => {
    const client = { id: doc.id, ...doc.data() };
    codigo = `C${client.clientes.toString().padStart(3, "0")}`;
  });
  try {
    // Crea un nuevo documento en la colección 'QRs' con los datos proporcionados
    const docRef = await addDoc(collection(db, "Clientes"), {
      nombre: nombre,
      compras: [],
      cantCompras: 0,
      codigo: codigo,
    });
    cargarClientes();
    prompt("Cliente cargado correctamente");
  } catch (err) {
    console.error("Error", err);
  }
  try {
    const clientDoc = doc(db, "Contadores", "Contadores");
    await updateDoc(clientDoc, { clientes: increment(1) });
  } catch (error) {
    console.error("Error actualizando el email: ", error);
  }
}

// tabla

async function cargarClientes() {
  const qrCollection = collection(db, "Clientes");
  const qrSnapshot = await getDocs(qrCollection);
  const qrList = qrSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  qrList.sort((a, b) => a.codigo.localeCompare(b.codigo));

  const tableBody = document.querySelector("#qrTable tbody");
  tableBody.innerHTML = ""; // Limpiar la tabla antes de llenar

  qrList.forEach((qr) => {
    const row = document.createElement("tr");

    // Crear celdas para cada campo
    row.innerHTML = `
        <td>${qr.nombre}</td>
        <td>${qr.codigo}</td>
        <td>${qr.cantCompras}</td>
        <td><a class="verCompras" id="${qr.codigo}Compras">Ver Compras</a></td>

      `;

    tableBody.appendChild(row);
    document
      .getElementById(`${qr.codigo}Compras`)
      .addEventListener("click", () => {
        mostrarModal(qr.codigo);
        console.log(qr.codigo);
      });
  });
}
// Cargar los QR dinámicos al cargar la página
cargarClientes();
document.getElementById("boton").addEventListener("click", () => {
  const link = document.getElementById("link").value;
  agregarCliente(link);
});

function mostrarModal(id) {
  console.log("en otro momento lo amro");
}
